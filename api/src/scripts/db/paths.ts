import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Monorepo root (Cook/) */
export function repoRoot(): string {
  return resolve(__dirname, '../../../..');
}

export function databaseDir(): string {
  const dir = resolve(repoRoot(), 'database');
  if (!existsSync(dir)) {
    throw new Error(`database/ folder not found at ${dir}`);
  }
  return dir;
}
