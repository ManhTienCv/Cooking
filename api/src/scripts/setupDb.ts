import { Pool } from 'pg';
import { env } from '../env.js';
import { applyPendingMigrations, ensureMigrationTable } from './db/migrations.js';
import { seedDevData } from './db/seedDev.js';
import { upsertAdmin } from './db/createAdmin.js';

function parseArgs(argv: string[]): {
  force: boolean;
  skipSeed: boolean;
  tryCreateDb: boolean;
  migrationsOnly: boolean;
  seedOnly: boolean;
} {
  const force = process.env.DB_FORCE === '1' || argv.includes('--force');
  const skipSeed = process.env.DB_SKIP_SEED === '1' || argv.includes('--no-seed');
  const tryCreateDb = process.env.DB_CREATE !== '0' && !argv.includes('--no-create-db');
  const migrationsOnly = argv.includes('--migrations-only');
  const seedOnly = argv.includes('--seed-only');
  return { force, skipSeed, tryCreateDb, migrationsOnly, seedOnly };
}

function poolConfig(database?: string) {
  if (env.db.connectionString) {
    return {
      connectionString: env.db.connectionString,
      ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
    };
  }
  return {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: database ?? env.db.database,
    ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
  };
}

async function ensureDatabaseExists(): Promise<void> {
  if (env.db.connectionString || env.db.ssl) return;
  const dbName = env.db.database;
  const admin = new Pool({ ...poolConfig('postgres') });

  try {
    const exists = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );
    if ((exists.rowCount ?? 0) === 0) {
      console.log(`[db:setup] Creating database "${dbName}"...`);
      const quoted = `"${dbName.replace(/"/g, '""')}"`;
      await admin.query(`CREATE DATABASE ${quoted}`);
      console.log(`[db:setup] Database "${dbName}" created.`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[db:setup] Could not auto-create database (need CREATEDB or run as postgres):\n  ${msg}\n` +
        `  Create manually: psql -U postgres -c "CREATE DATABASE ${dbName};"`,
    );
  } finally {
    await admin.end();
  }
}

async function tryGrantAppUser(pool: Pool): Promise<void> {
  if (env.db.connectionString || env.db.ssl) return;
  try {
    const role = env.db.user.replace(/"/g, '""');
    await pool.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    await pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO "${role}"`,
    );
    await pool.query(
      `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO "${role}"`,
    );
    console.log(`[db:setup] Grants applied for role "${env.db.user}".`);
  } catch {
    console.warn(
      `[db:setup] Skipped GRANT (run database/grant_app_user.sql as postgres if app user gets 42501).`,
    );
  }
}

async function main(): Promise<void> {
  const { force, skipSeed, tryCreateDb, migrationsOnly, seedOnly } = parseArgs(process.argv.slice(2));

  if (env.db.connectionString) {
    console.log('[db:setup] Target: Remote Cloud Database (via DATABASE_URL)');
  } else if (env.db.ssl) {
    console.log(`[db:setup] Target: Remote Cloud Database (via DB_HOST=${env.db.host}, SSL)`);
  } else {
    console.log(`[db:setup] Target: ${env.db.user}@${env.db.host}:${env.db.port}/${env.db.database}`);
  }

  if (tryCreateDb && !env.db.connectionString && !env.db.ssl) {
    await ensureDatabaseExists();
  }

  const pool = new Pool(poolConfig());

  try {
    await pool.query('SELECT 1');
    console.log('[db:setup] Connected.');

    if (!seedOnly) {
      const { applied, skipped } = await applyPendingMigrations(pool, { force });
      if (applied.length) {
        console.log(`[db:setup] Applied migrations: ${applied.join(', ')}`);
      }
      if (skipped.length) {
        console.log(`[db:setup] Already up to date (${skipped.length} migration(s) skipped).`);
      }

      await tryGrantAppUser(pool);
    }

    if (!skipSeed && !migrationsOnly) {
      if (seedOnly) {
        const client = await pool.connect();
        try {
          await ensureMigrationTable(client);
        } finally {
          client.release();
        }
      }

      if (process.env.NODE_ENV === 'production') {
        console.log('[db:setup] Bỏ qua chèn dữ liệu mẫu (Seed) vì đang ở môi trường Production.');
        const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@cook.local').trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
           console.warn('[db:setup] CẢNH BÁO: ADMIN_PASSWORD không được cấu hình. Sử dụng mật khẩu mặc định.');
        }
        const adminName = process.env.ADMIN_NAME?.trim() || 'Super Admin';
        await upsertAdmin(pool, {
          email: adminEmail,
          password: adminPassword || '123456678',
          fullName: adminName,
        });
        console.log(`[db:setup] Đã đảm bảo tài khoản quản trị viên: ${adminEmail}`);
      } else {
        const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@cook.local').trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
           console.warn('[db:setup] CẢNH BÁO: ADMIN_PASSWORD không được cấu hình. Sử dụng mật khẩu mặc định.');
        }
        const adminName = process.env.ADMIN_NAME?.trim() || 'Super Admin';

        await seedDevData(
          pool,
          { adminEmail, adminPassword: adminPassword || '123456678', adminName },
          { force },
        );
      }
    } else {
      console.log('[db:setup] Seed skipped (DB_SKIP_SEED=1 or --no-seed).');
    }

    console.log('[db:setup] Done.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[db:setup] Failed:', err);
  process.exitCode = 1;
});
