import { Pool, types } from 'pg';
import { env } from '../env.js';

// Parse NUMERIC/DECIMAL as float instead of string
types.setTypeParser(1700, (val: string) => parseFloat(val));

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 10,
});
