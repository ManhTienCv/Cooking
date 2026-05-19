import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { databaseDir } from './paths.js';

/** SQL files applied in order (idempotent — safe to re-run with tracking). */
export const MIGRATION_FILES = [
  'postgresql_schema.sql',
  'migration_pending_registrations.sql',
  'migration_secure_otp.sql',
  'migration_email_change.sql',
  'migration_marketplace.sql',
  'migration_seller_security.sql',
  'migration_messages.sql',
  'migration_social_follows.sql',
  'migration_ewallet.sql',
  'migration_ewallet_otp.sql',
  'migration_commission.sql',
  'migration_cookpay.sql',
] as const;

export type MigrationName = (typeof MIGRATION_FILES)[number];

const TRACKING_TABLE = '_app_migrations';

export async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function isMigrationApplied(
  client: PoolClient,
  name: string,
): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM ${TRACKING_TABLE} WHERE name = $1`,
    [name],
  );
  return res.rowCount !== null && res.rowCount > 0;
}

export async function markMigrationApplied(
  client: PoolClient,
  name: string,
): Promise<void> {
  await client.query(
    `INSERT INTO ${TRACKING_TABLE} (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    [name],
  );
}

async function tableExists(client: PoolClient, table: string): Promise<boolean> {
  const res = await client.query<{ r: string | null }>(
    `SELECT to_regclass($1) AS r`,
    [`public.${table}`],
  );
  return res.rows[0]?.r != null;
}

async function columnExists(
  client: PoolClient,
  table: string,
  column: string,
): Promise<boolean> {
  const res = await client.query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS ok`,
    [table, column],
  );
  return res.rows[0]?.ok === true;
}

/**
 * DB imported manually via pgAdmin often has no _app_migrations rows.
 * Mark migrations as applied when their core tables already exist.
 */
export async function baselineExistingSchema(client: PoolClient): Promise<string[]> {
  const marked: string[] = [];
  const tableRules: { file: MigrationName; table: string }[] = [
    { file: 'postgresql_schema.sql', table: 'users' },
    { file: 'migration_pending_registrations.sql', table: 'pending_registrations' },
    { file: 'migration_marketplace.sql', table: 'products' },
    { file: 'migration_seller_security.sql', table: 'seller_settings' },
    { file: 'migration_messages.sql', table: 'chat_conversations' },
    { file: 'migration_social_follows.sql', table: 'user_follows' },
    { file: 'migration_ewallet.sql', table: 'wallets' },
    { file: 'migration_ewallet_otp.sql', table: 'ewallet_otps' },
    { file: 'migration_commission.sql', table: 'commission_settings' },
    { file: 'migration_cookpay.sql', table: 'wallet_transactions' },
  ];

  for (const { file, table } of tableRules) {
    if (!(await tableExists(client, table))) continue;
    if (await isMigrationApplied(client, file)) continue;
    await markMigrationApplied(client, file);
    marked.push(file);
  }

  if (
    (await tableExists(client, 'pending_registrations')) &&
    (await columnExists(client, 'pending_registrations', 'attempt_count')) &&
    !(await isMigrationApplied(client, 'migration_secure_otp.sql'))
  ) {
    await markMigrationApplied(client, 'migration_secure_otp.sql');
    marked.push('migration_secure_otp.sql');
  }

  return marked;
}

export async function runSqlFile(client: PoolClient, fileName: string): Promise<void> {
  const path = join(databaseDir(), fileName);
  const sql = readFileSync(path, 'utf8');
  await client.query(sql);
}

export async function applyPendingMigrations(
  pool: Pool,
  options: { force?: boolean } = {},
): Promise<{ applied: string[]; skipped: string[] }> {
  const applied: string[] = [];
  const skipped: string[] = [];
  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);

    const baselined = await baselineExistingSchema(client);
    if (baselined.length) {
      console.log(`[db:setup] Baselined existing schema (${baselined.length} migration(s)).`);
    }

    for (const file of MIGRATION_FILES) {
      const done = await isMigrationApplied(client, file);
      if (done && !options.force) {
        skipped.push(file);
        continue;
      }

      await client.query('BEGIN');
      try {
        await runSqlFile(client, file);
        await markMigrationApplied(client, file);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
  }

  return { applied, skipped };
}
