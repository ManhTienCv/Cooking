import type { Request } from 'express';

const WINDOW_MS = 15 * 60 * 1000;
const THRESHOLD = 3;

type Bucket = 'user' | 'admin';

const store = new Map<string, { count: number; expires: number }>();

function prune(): void {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expires < now) store.delete(k);
  }
}

function key(bucket: Bucket, req: Request): string {
  const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
  return `${bucket}:${ip}`;
}

export function recordLoginFailure(bucket: Bucket, req: Request): void {
  prune();
  const k = key(bucket, req);
  const now = Date.now();
  const cur = store.get(k);
  if (!cur || cur.expires < now) {
    store.set(k, { count: 1, expires: now + WINDOW_MS });
    return;
  }
  cur.count += 1;
  store.set(k, cur);
}

export function clearLoginFailure(bucket: Bucket, req: Request): void {
  prune();
  store.delete(key(bucket, req));
}

/** Sau THRESHOLD lần sai trong cửa sổ thời gian → lần đăng nhập tiếp theo cần reCAPTCHA (nếu server có cấu hình secret). */
export function captchaRequiredAfterFailures(bucket: Bucket, req: Request): boolean {
  prune();
  const cur = store.get(key(bucket, req));
  return !!cur && cur.count >= THRESHOLD && cur.expires >= Date.now();
}
