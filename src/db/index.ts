import dotenv from 'dotenv';
dotenv.config();

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
  var _drizzleDb: NodePgDatabase<typeof schema> | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const cfg = {
      host: process.env.SQL_HOST || 'localhost',
      port: Number(process.env.SQL_PORT) || 5432,
      user: process.env.SQL_USER || 'postgres',
      password: String(process.env.SQL_PASSWORD || '2006'),
      database: process.env.SQL_DB_NAME || 'flight_booking',
      max: 10,
      connectionTimeoutMillis: 15000,
      ssl: false,
    };
    console.log(`[db] Connecting to ${cfg.host}:${cfg.port}/${cfg.database} as ${cfg.user}`);
    global._postgresPool = new Pool(cfg);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Lazy getters — pool & db are created on first access, ensuring env is loaded
export const pool = createPool();
export const db = drizzle(pool, { schema });
