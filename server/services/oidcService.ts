import crypto from 'node:crypto';
import dotenv from 'dotenv';
import * as jose from 'jose';

dotenv.config();

export interface VerifiedOidcProfile {
  provider: string;
  sub: string;
  email: string;
  name: string;
  avatar?: string;
}

interface OidcStateEntry {
  provider: string;
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
  origin: string;
  createdAt: number;
}

interface DiscoveredOidcMetadata {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
}

// In-memory state store with 10-minute TTL for CSRF and PKCE replay protection
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

// Cache for OIDC discovery metadata and remote JWKS key sets
const discoveryCache = new Map<string, DiscoveredOidcMetadata>();
const jwksCache = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>();

/**
 * Resolves configuration for any standard OIDC provider dynamically from environment variables
 * Zero hardcoded client IDs or secrets.
 */
export function getProviderConfig(provider: string) {
  const norm = provider.trim().toLowerCase();
  const upper = norm.toUpperCase();

  // 1. Check provider-specific environment variables (e.g. GOOGLE_CLIENT_ID or OAUTH_GOOGLE_CLIENT_ID)
  let clientId = (
    process.env[`${upper}_CLIENT_ID`] ||
    process.env[`OAUTH_${upper}_CLIENT_ID`] ||
    (norm === 'oidc' ? process.env.OAUTH_CLIENT_ID : '') ||
    ''
  ).trim();

  let clientSecret = (
    process.env[`${upper}_CLIENT_SECRET`] ||
    process.env[`OAUTH_${upper}_CLIENT_SECRET`] ||
    (norm === 'oidc' ? process.env.OAUTH_CLIENT_SECRET : '') ||
    ''
  ).trim();

  let issuerUrl = (
    process.env[`${upper}_ISSUER_URL`] ||
    process.env[`OAUTH_${upper}_ISSUER_URL`] ||
    (norm === 'oidc' ? process.env.OAUTH_ISSUER_URL : '') ||
    ''
  ).trim();

  let redirectUri = (
    process.env[`${upper}_REDIRECT_URI`] ||
    process.env[`OAUTH_${upper}_REDIRECT_URI`] ||
    (norm === 'oidc' ? process.env.OAUTH_REDIRECT_URI : '') ||
    ''
  ).trim();

  // If issuerUrl not explicitly supplied, use well-known provider URLs
  if (!issuerUrl) {
    if (norm === 'google') issuerUrl = 'https://accounts.google.com';
    else if (norm === 'apple') issuerUrl = 'https://appleid.apple.com';
    else if (process.env.OAUTH_ISSUER_URL) issuerUrl = process.env.OAUTH_ISSUER_URL.trim();
  }

  const isConfigured = Boolean(clientId);

  return {
    provider: norm,
    clientId,
    clientSecret,
    issuerUrl,
    redirectUri,
    isConfigured,
  };
}

/**
 * Returns list of configured OAuth/OIDC providers for clean UI rendering
 */
export function getConfiguredProviders(): Record<string, boolean> {
  const googleConfig = getProviderConfig('google');
  const appleConfig = getProviderConfig('apple');
  const genericConfig = getProviderConfig('oidc');

  return {
    google: googleConfig.isConfigured,
    apple: appleConfig.isConfigured,
    oidc: genericConfig.isConfigured,
  };
}

/**
 * Performs standard OpenID Connect discovery at ${issuer}/.well-known/openid-configuration
 */
async function discoverOidcEndpoints(issuerUrl: string): Promise<DiscoveredOidcMetadata> {
  const cleanIssuer = issuerUrl.replace(/\/+$/, '');
  if (discoveryCache.has(cleanIssuer)) {
    return discoveryCache.get(cleanIssuer)!;
  }

  try {
    const discoveryUrl = `${cleanIssuer}/.well-known/openid-configuration`;
    const res = await fetch(discoveryUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const doc = await res.json();
      const meta: DiscoveredOidcMetadata = {
        issuer: doc.issuer || cleanIssuer,
        authorizationEndpoint: doc.authorization_endpoint,
        tokenEndpoint: doc.token_endpoint,
        jwksUri: doc.jwks_uri,
      };
      discoveryCache.set(cleanIssuer, meta);
      return meta;
    }
  } catch (err: any) {
    console.warn(`[OIDC Discovery Notice]: Failed to fetch .well-known for ${issuerUrl}: ${err.message}. Using standard fallback endpoints.`);
  }

  // Standard fallback endpoints if discovery endpoint is unreachable
  let meta: DiscoveredOidcMetadata;
  if (cleanIssuer.includes('google')) {
    meta = {
      issuer: 'https://accounts.google.com',
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    };
  } else if (cleanIssuer.includes('apple')) {
    meta = {
      issuer: 'https://appleid.apple.com',
      authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
      tokenEndpoint: 'https://appleid.apple.com/auth/token',
      jwksUri: 'https://appleid.apple.com/auth/keys',
    };
  } else {
    meta = {
      issuer: cleanIssuer,
      authorizationEndpoint: `${cleanIssuer}/authorize`,
      tokenEndpoint: `${cleanIssuer}/oauth/token`,
      jwksUri: `${cleanIssuer}/.well-known/jwks.json`,
    };
  }

  discoveryCache.set(cleanIssuer, meta);
  return meta;
}

/**
 * Gets or creates remote JWKS key set for signature verification
 */
function getJwks(jwksUri: string) {
  if (!jwksCache.has(jwksUri)) {
    jwksCache.set(jwksUri, jose.createRemoteJWKSet(new URL(jwksUri)));
  }
  return jwksCache.get(jwksUri)!;
}

/**
 * Generates an Apple client_secret JWT signed with ES256 if private key is configured
 */
async function generateAppleClientSecret(clientId: string): Promise<string | null> {
  const teamId = (process.env.APPLE_TEAM_ID || '').trim();
  const keyId = (process.env.APPLE_KEY_ID || '').trim();
  const privateKeyPem = (process.env.APPLE_PRIVATE_KEY || '').trim();

  if (!teamId || !clientId || !keyId || !privateKeyPem) {
    return null;
  }

  try {
    const privateKey = await jose.importPKCS8(privateKeyPem, 'ES256');
    return await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime('10m')
      .setAudience('https://appleid.apple.com')
      .setSubject(clientId)
      .sign(privateKey);
  } catch (err: any) {
    console.error('[Apple Client Secret Generation Error]:', err.message);
    return null;
  }
}

/**
 * 1. Standard OAuth 2.0 / OIDC Authorization Request Generator with PKCE & State
 */
export async function getStandardAuthUrl(
  provider: string,
  reqOrigin: string
): Promise<{ url?: string; error?: string }> {
  const config = getProviderConfig(provider);
  if (!config.isConfigured) {
    return {
      error: `OAuth 2.0 is not configured for ${provider}. Please set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in .env.`,
    };
  }

  const meta = await discoverOidcEndpoints(config.issuerUrl);

  // Generate cryptographic state and PKCE verifier/challenge (RFC 7636)
  const state = crypto.randomBytes(24).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  const redirectUri = config.redirectUri || `${reqOrigin}/api/users/auth/callback/${config.provider}`;

  ensureCleanupTimer();
  stateStore.set(state, {
    provider: config.provider,
    codeVerifier,
    nonce,
    redirectUri,
    origin: reqOrigin,
    createdAt: Date.now(),
  });

  const isApple = config.provider === 'apple';
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: isApple ? 'code id_token' : 'code',
    response_mode: isApple ? 'form_post' : 'query',
    scope: isApple ? 'name email' : 'openid email profile',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'select_account',
  });

  return { url: `${meta.authorizationEndpoint}?${params.toString()}` };
}

/**
 * 2. Standard OAuth 2.0 / OIDC Callback: State validation, PKCE verification, Token exchange, JWKS signature verification
 */
export async function handleStandardCallback(
  provider: string,
  params: {
    code?: string;
    id_token?: string;
    state?: string;
    user?: any;
    error?: string;
    error_description?: string;
  },
  reqOrigin: string
): Promise<{ profile?: VerifiedOidcProfile; error?: string; clientOrigin?: string }> {
  const { code, id_token: rawIdToken, state, user: rawUserJson, error: providerError, error_description } = params;

  if (providerError) {
    return { error: error_description || providerError, clientOrigin: reqOrigin };
  }

  if (!state) {
    return { error: 'Missing state parameter in authorization response', clientOrigin: reqOrigin };
  }

  const stored = stateStore.get(state);
  if (!stored || stored.provider !== provider.toLowerCase()) {
    return { error: 'Invalid, mismatched, or expired OAuth state parameter (CSRF protection failed)', clientOrigin: reqOrigin };
  }
  stateStore.delete(state);

  const frontendUrl = (process.env.APP_URL || 'https://samecommers.netlify.app').replace(/\/+$/, '');
  let clientOrigin = stored.origin || reqOrigin;
  if (!clientOrigin || clientOrigin.includes('onrender.com')) {
    clientOrigin = frontendUrl;
  }

  const config = getProviderConfig(provider);
  if (!config.isConfigured) {
    return { error: `OAuth is not configured for provider ${provider}`, clientOrigin };
  }

  const meta = await discoverOidcEndpoints(config.issuerUrl);
  const redirectUri = stored.redirectUri || config.redirectUri || `${reqOrigin}/api/users/auth/callback/${config.provider}`;

  let finalIdToken = rawIdToken;
  let finalAccessToken: string | undefined;

  // Exchange authorization code for tokens using PKCE code_verifier
  if (code) {
    let clientSecret = config.clientSecret;
    if (config.provider === 'apple' && !clientSecret) {
      clientSecret = (await generateAppleClientSecret(config.clientId)) || '';
    }

    const tokenBody: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      code_verifier: stored.codeVerifier, // PKCE Verification (RFC 7636)
    };
    if (clientSecret) {
      tokenBody.client_secret = clientSecret;
    }

    try {
      const tokenRes = await fetch(meta.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenBody),
      });

      if (tokenRes.ok) {
        const tokenJson = await tokenRes.json();
        if (tokenJson.id_token) finalIdToken = tokenJson.id_token;
        if (tokenJson.access_token) finalAccessToken = tokenJson.access_token;
      } else {
        const errText = await tokenRes.text();
        console.warn(`[OIDC Token Exchange Warning]: ${provider} returned ${tokenRes.status}: ${errText}`);
      }
    } catch (tokenErr: any) {
      console.error(`[OIDC Token Exchange Error]:`, tokenErr.message);
    }
  }

  if (!finalIdToken) {
    return { error: `No OIDC id_token received or exchanged from ${provider}`, clientOrigin };
  }

  // 3. Cryptographically verify id_token signature using the provider's JWKS
  let payload: jose.JWTPayload;
  try {
    const jwks = getJwks(meta.jwksUri);
    const verified = await jose.jwtVerify(finalIdToken, jwks, {
      audience: config.clientId,
    });
    payload = verified.payload;
  } catch (verifyErr: any) {
    console.error(`[OIDC ID Token Verification Failed for ${provider}]:`, verifyErr.message);
    return { error: `ID token cryptographic verification failed: ${verifyErr.message}`, clientOrigin };
  }

  // Handle Apple's first-login user object (contains name since Apple id_token omits it)
  let appleName = '';
  if (rawUserJson) {
    try {
      const parsed = typeof rawUserJson === 'string' ? JSON.parse(rawUserJson) : rawUserJson;
      const firstName = parsed.name?.firstName || '';
      const lastName = parsed.name?.lastName || '';
      appleName = `${firstName} ${lastName}`.trim();
    } catch {}
  }

  // Extract standard OIDC claims (sub, email, name, picture)
  const sub = String(payload.sub);
  let email = String(payload.email || '').toLowerCase().trim();
  let name = appleName || String(payload.name || payload.given_name || '');
  let avatar = typeof payload.picture === 'string' ? payload.picture : undefined;

  // Optional: fetch userinfo endpoint if available and claims are sparse
  if ((!email || !name) && finalAccessToken && config.provider === 'google') {
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${finalAccessToken}` },
      });
      if (userinfoRes.ok) {
        const info = await userinfoRes.json();
        if (!email && info.email) email = String(info.email).toLowerCase().trim();
        if (!name && info.name) name = String(info.name);
        if (!avatar && info.picture) avatar = String(info.picture);
      }
    } catch {}
  }

  if (!email && !sub) {
    return { error: `${provider} did not provide a valid email or subject identifier`, clientOrigin };
  }

  return {
    profile: {
      provider: config.provider,
      sub,
      email: email || `${sub}@${config.provider}.oauth.internal`,
      name: name || email.split('@')[0] || `${provider} Customer`,
      avatar,
    },
    clientOrigin,
  };
}
