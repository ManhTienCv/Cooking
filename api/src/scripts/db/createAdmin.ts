import type { Pool } from 'pg';
import { hashPlainPasswordForAdminStorage } from '../../lib/adminPassword.js';

export type AdminSeedInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
};

export async function upsertAdmin(pool: Pool, input: AdminSeedInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) throw new Error('ADMIN_EMAIL must be a valid email.');
  if (input.password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }

  const hash = await hashPlainPasswordForAdminStorage(input.password);
  await pool.query(
    `INSERT INTO quantrivien ("HoTen", "SDT", "Email", "MatKhau")
     VALUES ($1, $2, $3, $4)
     ON CONFLICT ("Email") DO UPDATE SET
       "HoTen" = EXCLUDED."HoTen",
       "SDT" = EXCLUDED."SDT",
       "MatKhau" = EXCLUDED."MatKhau"`,
    [input.fullName, input.phone ?? null, email, hash],
  );
}
