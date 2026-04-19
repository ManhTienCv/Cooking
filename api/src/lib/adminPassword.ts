import bcrypt from 'bcryptjs';

/** Bcrypt digest as produced by bcryptjs (60 chars, $2a/$2b/$2y + cost + salt + hash). */
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./0-9A-Za-z]{53}$/;

export function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_RE.test(value);
}

/**
 * Hash a plaintext admin password for storage in quantrivien."MatKhau".
 * Invariant: result always matches {@link isBcryptHash}.
 */
export async function hashPlainPasswordForAdminStorage(plain: string): Promise<string> {
  const hash = await bcrypt.hash(plain, 10);
  if (!isBcryptHash(hash)) {
    throw new Error('Invariant failed: bcrypt output did not match expected format.');
  }
  return hash;
}

/** Use before any UPDATE that writes to quantrivien."MatKhau". */
export function assertStoredAdminPasswordIsBcrypt(value: string): void {
  if (!isBcryptHash(value)) {
    throw new Error('Refusing to store admin password: value is not a bcrypt hash.');
  }
}
