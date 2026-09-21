import crypto from 'node:crypto';
import { env } from '../env.js';

export function createAdminToken(adminId: number): string {
  const payload = Buffer.from(
    JSON.stringify({
      adminId,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', env.sessionSecret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export function verifyAdminToken(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadStr, signature] = parts;
    if (!payloadStr || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', env.sessionSecret)
      .update(payloadStr)
      .digest('base64url');

    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }

    const json = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8')) as {
      adminId?: unknown;
      exp?: unknown;
    };

    if (typeof json.adminId !== 'number' || typeof json.exp !== 'number') {
      return null;
    }

    if (Date.now() > json.exp) {
      return null;
    }

    return json.adminId;
  } catch {
    return null;
  }
}
