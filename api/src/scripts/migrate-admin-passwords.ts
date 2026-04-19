/**
 * One-time (or idempotent): bcrypt-hash quantrivien."MatKhau" when the value is not already bcrypt.
 *
 * Run: npm --prefix api run migrate:admin-passwords
 * Requires DB env (same as server): DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */
import { pool } from '../db/pool.js';
import { hashPlainPasswordForAdminStorage, isBcryptHash } from '../lib/adminPassword.js';

async function main(): Promise<void> {
  const r = await pool.query<{ MaAD: number; Email: string; MatKhau: string }>(
    'SELECT "MaAD", "Email", "MatKhau" FROM quantrivien ORDER BY "MaAD" ASC'
  );

  let updated = 0;
  let skipped = 0;

  for (const row of r.rows) {
    const current = String(row.MatKhau ?? '');
    if (isBcryptHash(current)) {
      skipped += 1;
      continue;
    }
    const hash = await hashPlainPasswordForAdminStorage(current);
    await pool.query('UPDATE quantrivien SET "MatKhau" = $1 WHERE "MaAD" = $2', [hash, row.MaAD]);
    updated += 1;
    console.log(`Hashed password for admin MaAD=${row.MaAD} email=${row.Email}`);
  }

  console.log(`Done. Updated: ${updated}, already bcrypt (skipped): ${skipped}, total rows: ${r.rows.length}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  void pool.end();
});
