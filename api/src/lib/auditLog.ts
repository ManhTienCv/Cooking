import type { Request } from 'express';

function clientIp(req: Request): string {
  return String(req.ip || req.socket.remoteAddress || '');
}

function userAgent(req: Request): string {
  return String(req.headers['user-agent'] ?? '').slice(0, 400);
}

/** Một dòng JSON ra stdout — dễ ship tới journald / Docker / ELK. */
export function logAuthLogin(
  realm: 'user' | 'admin',
  input: { success: boolean; email: string; req: Request; subjectId?: number }
): void {
  const line = JSON.stringify({
    event: 'auth_login',
    realm,
    success: input.success,
    email: input.email,
    subjectId: input.subjectId,
    ip: clientIp(input.req),
    userAgent: userAgent(input.req),
    at: new Date().toISOString(),
  });
  console.log(line);
}
