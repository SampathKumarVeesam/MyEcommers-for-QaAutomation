import crypto from 'node:crypto';
import dotenv from 'dotenv';
import * as jose from 'jose';

dotenv.config();

// In-memory state & nonce cache with 10-minute TTL
interface OidcStateEntry {
  provider: 'google' | 'apple';
  nonce: string;
  origin: string;
  createdAt: number;
}

const stateStore = new Map<string, OidcStateEntry>();
let cleanupTimer: NodeJS.Timeout | null = null;

function ensureCleanupTimer() {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, val] of stateStore.entries()) {
        if (now - val.createdAt > 10 * 60 * 1000) {
          stateStore.delete(key);
        }
      }
    }, 5 * 60 * 1000);
    cleanupTimer.unref();
  }
}

// Cached Remote JWKS Sets
const googleJWKS = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleJWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export interface VerifiedOidcProfile {
  provider: 'google' | 'apple';
  sub: string;
  email: string;
  name: string;
  avatar?: string;
}

/**
 * Generates Google OAuth 2.0 / OIDC Authorization URL
 */
export function getGoogleAuthUrl(reqOrigin: string): { url?: string; error?: string } {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    console.warn('[Google OIDC Notice]: GOOGLE_CLIENT_ID is not configured in environment.');
    return {
      error: 'Google OAuth is not configured yet. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
    };
  }

  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || `${reqOrigin}/api/users/auth/google/callback`).trim();
  const state = crypto.randomBytes(24).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');

  ensureCleanupTimer();
  stateStore.set(state, {
    provider: 'google',
    nonce,
    origin: reqOrigin,
    createdAt: Date.now(),
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    access_type: 'offline',
    prompt: 'select_account',
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

/**
 * Exchanges Google authorization code, verifies ID token against Google JWKS, returns verified profile
 */
export async function verifyGoogleAuthCode(
  code: string,
  state: string,
  reqOrigin: string
): Promise<{ profile?: VerifiedOidcProfile; error?: string; clientOrigin?: string }> {
  const stored = stateStore.get(state);
  if (!stored || stored.provider !== 'google') {
    return { error: 'Invalid or expired OAuth state parameter (CSRF protection)' };
  }
  stateStore.delete(state);

  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || `${reqOrigin}/api/users/auth/google/callback`).trim();

  if (!clientId || !clientSecret) {
    return { error: 'Google OAuth credentials missing on server', clientOrigin: stored.origin };
  }

  // 1. Exchange authorization code at Google's token endpoint
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[Google Token Exchange Failed]:', errText);
    return { error: 'Failed to exchange authorization code with Google', clientOrigin: stored.origin };
  }

  const tokenData = await tokenRes.json();
  const idToken = tokenData.id_token;
  if (!idToken) {
    return { error: 'No OIDC id_token returned by Google', clientOrigin: stored.origin };
  }

  // 2. Cryptographically verify ID token against Google's public JWKS certificates
  let payload: jose.JWTPayload;
  try {
    const verified = await jose.jwtVerify(idToken, googleJWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });
    payload = verified.payload;
  } catch (verifyErr: any) {
    console.error('[Google ID Token Verification Error]:', verifyErr);
    return { error: `ID token verification failed: ${verifyErr.message}`, clientOrigin: stored.origin };
  }

  const sub = String(payload.sub);
  const email = String(payload.email || '').toLowerCase().trim();
  const name = String(payload.name || payload.given_name || email.split('@')[0]);
  const avatar = typeof payload.picture === 'string' ? payload.picture : undefined;

  if (!email) {
    return { error: 'Verified Google account did not supply an email address', clientOrigin: stored.origin };
  }

  return {
    profile: {
      provider: 'google',
      sub,
      email,
      name,
      avatar,
    },
    clientOrigin: stored.origin,
  };
}

/**
 * Generates Apple OAuth 2.0 / OIDC Authorization URL
 */
export function getAppleAuthUrl(reqOrigin: string): { url?: string; error?: string } {
  const clientId = (process.env.APPLE_CLIENT_ID || '').trim();
  if (!clientId) {
    console.warn('[Apple OIDC Notice]: APPLE_CLIENT_ID is not configured in environment.');
    return {
      error: 'Apple OAuth is not configured yet. Please set APPLE_CLIENT_ID and Apple credentials in .env.',
    };
  }

  const redirectUri = (process.env.APPLE_REDIRECT_URI || `${reqOrigin}/api/users/auth/apple/callback`).trim();
  const state = crypto.randomBytes(24).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');

  ensureCleanupTimer();
  stateStore.set(state, {
    provider: 'apple',
    nonce,
    origin: reqOrigin,
    createdAt: Date.now(),
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce,
  });

  return { url: `https://appleid.apple.com/auth/authorize?${params.toString()}` };
}

/**
 * Generates an Apple client_secret JWT signed with ES256 if private key is configured
 */
async function generateAppleClientSecret(): Promise<string | null> {
  const teamId = (process.env.APPLE_TEAM_ID || '').trim();
  const clientId = (process.env.APPLE_CLIENT_ID || '').trim();
  const keyId = (process.env.APPLE_KEY_ID || '').trim();
  const privateKeyPem = (process.env.APPLE_PRIVATE_KEY || '').trim();

  if (!teamId || !clientId || !keyId || !privateKeyPem) {
    return null;
  }

  try {
    const privateKey = await jose.importPKCS8(privateKeyPem, 'ES256');
    const secret = await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime('10m')
      .setAudience('https://appleid.apple.com')
      .setSubject(clientId)
      .sign(privateKey);
    return secret;
  } catch (err: any) {
    console.error('[Apple Client Secret Generation Error]:', err.message);
    return null;
  }
}

/**
 * Handles Apple OAuth Callback (form_post payload with code, id_token, and user object)
 */
export async function verifyAppleAuthPayload(
  body: Record<string, any>,
  reqOrigin: string
): Promise<{ profile?: VerifiedOidcProfile; error?: string; clientOrigin?: string }> {
  const { code, id_token, state, user: rawUserJson } = body || {};

  const stored = state ? stateStore.get(state) : null;
  const clientOrigin = stored?.origin || reqOrigin;
  if (state && stored) {
    stateStore.delete(state);
  }

  const clientId = (process.env.APPLE_CLIENT_ID || '').trim();

  // Parse Apple user name payload (Apple ONLY sends the user's name on their very first sign-in)
  let appleName = '';
  let appleEmail = '';
  if (rawUserJson) {
    try {
      const parsedUser = typeof rawUserJson === 'string' ? JSON.parse(rawUserJson) : rawUserJson;
      const firstName = parsedUser.name?.firstName || '';
      const lastName = parsedUser.name?.lastName || '';
      appleName = `${firstName} ${lastName}`.trim();
      appleEmail = (parsedUser.email || '').toLowerCase().trim();
    } catch (parseErr) {
      console.warn('[Apple User JSON Parse Notice]:', parseErr);
    }
  }

  let finalIdToken = id_token;

  // If code is provided and Apple Private Key is set, exchange for tokens
  if (code && !finalIdToken) {
    const clientSecret = await generateAppleClientSecret();
    if (clientSecret) {
      const redirectUri = (process.env.APPLE_REDIRECT_URI || `${reqOrigin}/api/users/auth/apple/callback`).trim();
      const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (tokenRes.ok) {
        const tokenJson = await tokenRes.json();
        finalIdToken = tokenJson.id_token;
      }
    }
  }

  if (!finalIdToken) {
    return { error: 'No Apple ID token received or exchanged', clientOrigin };
  }

  // Verify ID token against Apple's public JWKS certificates
  let payload: jose.JWTPayload;
  try {
    const verified = await jose.jwtVerify(finalIdToken, appleJWKS, {
      issuer: 'https://appleid.apple.com',
      audience: clientId || undefined,
    });
    payload = verified.payload;
  } catch (verifyErr: any) {
    console.error('[Apple ID Token Verification Error]:', verifyErr);
    return { error: `Apple ID token verification failed: ${verifyErr.message}`, clientOrigin };
  }

  const sub = String(payload.sub);
  const email = (String(payload.email || '') || appleEmail).toLowerCase().trim();
  const name = appleName || (email ? email.split('@')[0] : 'Apple Customer');

  if (!email && !sub) {
    return { error: 'Apple did not provide a valid email or user identifier', clientOrigin };
  }

  return {
    profile: {
      provider: 'apple',
      sub,
      email: email || `${sub}@privaterelay.appleid.com`,
      name: name || 'Apple User',
    },
    clientOrigin,
  };
}
