import { pool } from '../../db/pool.js';
import { upsertAdmin } from './createAdmin.js';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function main(): Promise<void> {
  const email = requiredEnv('ADMIN_EMAIL').toLowerCase();
  const password = requiredEnv('ADMIN_PASSWORD');
  const fullName = process.env.ADMIN_NAME?.trim() || 'Super Admin';
  const phone = process.env.ADMIN_PHONE?.trim() || null;

  await upsertAdmin(pool, { email, password, fullName, phone });
  console.log(`Admin account is ready: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
