import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

let lastConnectionError: string | null = null;
let invalidUrlReason: string | null = null;
let currentSslSetting: boolean | { rejectUnauthorized: boolean } = false;
let dbConnected = false;

// Normalize DATABASE_URL for node-postgres (convert postgres:// to postgresql://)
let rawConnStr = process.env.DATABASE_URL?.trim();

if (rawConnStr) {
  if (rawConnStr.startsWith('postgres://')) {
    rawConnStr = rawConnStr.replace('postgres://', 'postgresql://');
  }
  
  // Auto-correction: if someone enters only the Render hostname (e.g. "dpg-dbrhp7tg1s2s738hqd70-a")
  if (!/^postgresql:\/\//i.test(rawConnStr)) {
    if (rawConnStr.startsWith('dpg-')) {
      const dbUser = process.env.DB_USER || 'samecommers_user';
      const dbPass = process.env.DB_PASSWORD || 'DJvuZvladg101KVO53dWOpZ5qp2Tsia4';
      const dbName = process.env.DB_NAME || 'database_for_samecommers';
      const dbPort = process.env.DB_PORT || '5432';
      console.log(`ℹ️ [PostgreSQL Auto-Correction]: Detected Render hostname "${rawConnStr}" in DATABASE_URL. Auto-constructing full connection URL...`);
      rawConnStr = `postgresql://${dbUser}:${dbPass}@${rawConnStr}:${dbPort}/${dbName}`;
      invalidUrlReason = null;
    } else {
      invalidUrlReason = `DATABASE_URL is set to "${rawConnStr}", which is not a full connection URL. In Render Web Service Environment, set DATABASE_URL to your full Internal Database URL (e.g. postgresql://samecommers_user:PASSWORD@dpg-xxx-a/database_for_samecommers).`;
      console.error(`❌ [PostgreSQL Config Error]: ${invalidUrlReason}`);
      lastConnectionError = invalidUrlReason;
      rawConnStr = undefined;
    }
  }
}

const connectionString = rawConnStr;

// Internal Render URLs (e.g. dpg-xxx-a without .render.com) use Render's private network where SSL is disabled.
// External Render URLs (containing .render.com or sslmode=require) require SSL with rejectUnauthorized: false.
function determineInitialSsl(connStr?: string): boolean | { rejectUnauthorized: boolean } {
  if (!connStr) return false;
  const isExternalHost = connStr.includes('.render.com') ||
    connStr.includes('amazonaws.com') ||
    connStr.includes('supabase.co') ||
    connStr.includes('sslmode=require');
  
  if (isExternalHost) {
    return { rejectUnauthorized: false };
  }

  // Internal hostnames (like dpg-xxx-a) or localhost do not use SSL
  return false;
}

currentSslSetting = determineInitialSsl(connectionString);

function createPoolInstance(sslConfig: boolean | { rejectUnauthorized: boolean }) {
  if (connectionString) {
    try {
      const urlObj = new URL(connectionString);
      console.log(`[PostgreSQL Target]: Host: ${urlObj.hostname}, Port: ${urlObj.port || '5432'}, DB: ${urlObj.pathname.slice(1)}, SSL: ${sslConfig ? 'enabled' : 'disabled'}`);
    } catch {
      console.log(`[PostgreSQL Target]: Remote connection string configured, SSL: ${sslConfig ? 'enabled' : 'disabled'}`);
    }
  } else {
    console.log(`[PostgreSQL Target]: No valid DATABASE_URL found. Using DB_HOST: ${process.env.DB_HOST || 'localhost'}, DB_PORT: ${process.env.DB_PORT || '5433'}, DB_NAME: ${process.env.DB_NAME || 'DataBase_for_SamEcommers'}`);
  }

  const p = new Pool(
    connectionString
      ? {
          connectionString,
          ssl: sslConfig,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000,
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5433', 10),
          database: process.env.DB_NAME || 'DataBase_for_SamEcommers',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'Sam@123',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000,
        }
  );

  p.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]: Unexpected client error on idle connection:', err.message);
  });

  return p;
}

export let pool = createPoolInstance(currentSslSetting);

// Re-creates the pool if SSL handshake mismatch is detected
export async function reconfigureSsl(useSsl: boolean): Promise<void> {
  console.log(`[PostgreSQL] Reconfiguring pool with SSL = ${useSsl ? 'enabled' : 'disabled'}...`);
  try {
    await pool.end();
  } catch {
    // ignore clean termination error
  }
  currentSslSetting = useSsl ? { rejectUnauthorized: false } : false;
  pool = createPoolInstance(currentSslSetting);
}

// Periodic keep-alive ping to prevent Render free-tier databases from dropping idle connections
setInterval(async () => {
  if (dbConnected) {
    try {
      await pool.query('SELECT 1');
    } catch (err: any) {
      console.warn('[PostgreSQL Keep-Alive Warning]:', err.message);
    }
  }
}, 4 * 60 * 1000);

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  if (invalidUrlReason && !connectionString) {
    throw new Error(invalidUrlReason);
  }

  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    dbConnected = true;
    lastConnectionError = null;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL] executed query in ${duration}ms: ${text.slice(0, 80)}...`);
    }
    return res;
  } catch (error: any) {
    lastConnectionError = error.message;

    // Self-healing SSL mismatch detection
    if (error.message && error.message.includes('The server does not support SSL connections') && currentSslSetting !== false) {
      console.warn('⚠️ Server does not support SSL. Auto-reconnecting without SSL...');
      await reconfigureSsl(false);
      return await pool.query<T>(text, params);
    }

    if (error.message && (error.message.includes('no pg_hba.conf entry') || error.message.includes('SSL required')) && currentSslSetting === false) {
      console.warn('⚠️ Server requires SSL. Auto-reconnecting with SSL enabled...');
      await reconfigureSsl(true);
      return await pool.query<T>(text, params);
    }

    console.error(`[SQL Error]: ${error.message}\nQuery: ${text}\nParams:`, params);
    throw error;
  }
}

export async function getClient(): Promise<pg.PoolClient> {
  if (invalidUrlReason && !connectionString) {
    throw new Error(invalidUrlReason);
  }
  return await pool.connect();
}

export async function verifyConnection(retries = 3, delayMs = 2000): Promise<boolean> {
  if (invalidUrlReason && !connectionString) {
    lastConnectionError = invalidUrlReason;
    console.error(`❌ [PostgreSQL Fatal]: ${invalidUrlReason}`);
    return false;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[PostgreSQL] Connection attempt ${attempt}/${retries}...`);
      const res = await pool.query('SELECT version(), current_database() as db_name, inet_server_port() as port;');
      const row = res.rows[0];
      dbConnected = true;
      lastConnectionError = null;
      console.log(`[PostgreSQL 18] Connected successfully to "${row.db_name}" on port ${row.port}`);
      console.log(`[PostgreSQL 18] Engine: ${row.version.split(',')[0]}`);
      return true;
    } catch (err: any) {
      lastConnectionError = err.message;
      console.warn(`[PostgreSQL Connection Attempt ${attempt}/${retries} Failed]: ${err.message}`);

      // Check for SSL mismatch during verification
      if (err.message && err.message.includes('The server does not support SSL connections') && currentSslSetting !== false) {
        console.warn('⚠️ Detected SSL unsupported on host. Toggling SSL to false and retrying...');
        await reconfigureSsl(false);
        continue;
      }
      if (err.message && (err.message.includes('no pg_hba.conf entry') || err.message.includes('SSL required')) && currentSslSetting === false) {
        console.warn('⚠️ Detected SSL required on host. Toggling SSL to true and retrying...');
        await reconfigureSsl(true);
        continue;
      }

      if (attempt < retries) {
        console.log(`[PostgreSQL] Waiting ${delayMs}ms before retrying...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        dbConnected = false;
        console.error(`[PostgreSQL Fatal Connection Error]: All ${retries} attempts failed: ${err.message}`);
        return false;
      }
    }
  }
  return false;
}

export function isDbConnected(): boolean {
  return dbConnected;
}

export function getDbDiagnostics() {
  let host = 'localhost';
  let database = process.env.DB_NAME || 'DataBase_for_SamEcommers';
  if (connectionString) {
    try {
      const u = new URL(connectionString);
      host = u.hostname;
      database = u.pathname.slice(1);
    } catch {
      host = 'remote-url';
    }
  }

  return {
    connected: dbConnected,
    hasDatabaseUrl: Boolean(connectionString),
    configError: invalidUrlReason,
    targetHost: host,
    targetDatabase: database,
    sslMode: Boolean(currentSslSetting),
    lastError: invalidUrlReason || lastConnectionError,
  };
}
