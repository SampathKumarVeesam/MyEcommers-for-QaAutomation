import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

// Normalize DATABASE_URL for node-postgres (convert postgres:// to postgresql://)
let rawConnStr = process.env.DATABASE_URL?.trim();
if (rawConnStr && rawConnStr.startsWith('postgres://')) {
  rawConnStr = rawConnStr.replace('postgres://', 'postgresql://');
}

const connectionString = rawConnStr;
const isRemoteDb = Boolean(
  connectionString &&
  !connectionString.includes('localhost') &&
  !connectionString.includes('127.0.0.1')
);

// Diagnostic log for database target (masking credentials)
if (connectionString) {
  try {
    const urlObj = new URL(connectionString);
    console.log(`[PostgreSQL Target]: Using DATABASE_URL -> Host: ${urlObj.hostname}, Port: ${urlObj.port || '5432'}, DB: ${urlObj.pathname.slice(1)}, User: ${urlObj.username}, SSL: ${isRemoteDb ? 'enabled' : 'disabled'}`);
  } catch {
    console.log(`[PostgreSQL Target]: Using DATABASE_URL (remote host detected)`);
  }
} else {
  console.log(`[PostgreSQL Target]: No DATABASE_URL found. Falling back to DB_HOST: ${process.env.DB_HOST || 'localhost'}, DB_PORT: ${process.env.DB_PORT || '5433'}, DB_NAME: ${process.env.DB_NAME || 'DataBase_for_SamEcommers'}`);
}

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: isRemoteDb
          ? { rejectUnauthorized: false }
          : process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
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

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected client error on idle connection:', err.message);
});

let dbConnected = false;

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
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    dbConnected = true;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL] executed query in ${duration}ms: ${text.slice(0, 80)}...`);
    }
    return res;
  } catch (error: any) {
    console.error(`[SQL Error]: ${error.message}\nQuery: ${text}\nParams:`, params);
    throw error;
  }
}

export async function getClient(): Promise<pg.PoolClient> {
  return await pool.connect();
}

export async function verifyConnection(retries = 5, delayMs = 2500): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[PostgreSQL] Connection attempt ${attempt}/${retries}...`);
      const res = await pool.query('SELECT version(), current_database() as db_name, inet_server_port() as port;');
      const row = res.rows[0];
      dbConnected = true;
      console.log(`[PostgreSQL 18] Connected successfully to "${row.db_name}" on port ${row.port}`);
      console.log(`[PostgreSQL 18] Engine: ${row.version.split(',')[0]}`);
      return true;
    } catch (err: any) {
      console.warn(`[PostgreSQL Connection Attempt ${attempt}/${retries} Failed]: ${err.message}`);
      if (attempt < retries) {
        console.log(`[PostgreSQL] Waiting ${delayMs}ms before retrying...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        dbConnected = false;
        console.error(`[PostgreSQL Fatal Connection Error]: All ${retries} connection attempts failed. Check DATABASE_URL or database status.`);
        return false;
      }
    }
  }
  return false;
}

export function isDbConnected(): boolean {
  return dbConnected;
}
