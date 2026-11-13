import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const isRemoteDb = Boolean(
  connectionString &&
  !connectionString.includes('localhost') &&
  !connectionString.includes('127.0.0.1')
);

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: isRemoteDb ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433', 10),
        database: process.env.DB_NAME || 'DataBase_for_SamEcommers',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Sam@123',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
);

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected client error on idle connection:', err.message);
});

let dbConnected = false;

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

export async function verifyConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT version(), current_database() as db_name, inet_server_port() as port;');
    const row = res.rows[0];
    dbConnected = true;
    console.log(`[PostgreSQL 18] Connected successfully to "${row.db_name}" on port ${row.port}`);
    console.log(`[PostgreSQL 18] Engine: ${row.version.split(',')[0]}`);
    return true;
  } catch (err: any) {
    dbConnected = false;
    console.warn('[PostgreSQL Connection Notice]: Could not connect to database on host/port. Running in resilient cloud mode.');
    return false;
  }
}

export function isDbConnected(): boolean {
  return dbConnected;
}
