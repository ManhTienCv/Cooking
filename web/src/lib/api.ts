/**
 * Gọi API backend.
 * - Local dev: VITE_API_URL trống → dùng Vite proxy (/api → localhost:3001)
 * - Production (Vercel): VITE_API_URL = URL backend thật (vd: https://your-api.onrender.com)
 * - Khi Vercel chưa kết nối backend hoặc DB rỗng: Tự động fallback dữ liệu mẫu chuyên nghiệp (demoData.ts).
 */

import { handleDemoFallback } from './demoData';

const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

let csrfPromise: Promise<string> | null = null;

export function resetCsrfCache(): void {
  csrfPromise = null;
}

export async function getCsrfToken(): Promise<string> {
  if (!csrfPromise) {
    csrfPromise = fetch(`${base}/api/auth/csrf`, { credentials: 'include', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) {
          return { csrfToken: 'demo-csrf-token-vercel' };
        }
        return r.json() as Promise<{ csrfToken: string }>;
      })
      .then((d) => {
        return d.csrfToken || 'demo-csrf-token-vercel';
      })
      .catch(() => {
        return 'demo-csrf-token-vercel';
      });
  }
  return csrfPromise;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const withHeaders = async () => {
    const headers = new Headers(init.headers);
    if (needsCsrf) {
      const t = await getCsrfToken();
      headers.set('X-CSRF-TOKEN', t);
    }
    if (
      init.body !== undefined &&
      typeof init.body === 'string' &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  };

  try {
    let headers = await withHeaders();
    let response = await fetch(`${base}${path}`, { ...init, credentials: 'include', headers });

    if (needsCsrf && response.status === 403) {
      resetCsrfCache();
      headers = await withHeaders();
      response = await fetch(`${base}${path}`, { ...init, credentials: 'include', headers });
    }

    const isHtml = response.headers.get('content-type')?.includes('text/html');
    if (isHtml || response.status === 404) {
      const demo = handleDemoFallback(path, init);
      if (demo !== undefined) {
        return new Response(JSON.stringify(demo), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return response;
  } catch (fetchErr) {
    // Nếu không kết nối được backend (vd deploy độc lập trên Vercel hoặc server tắt)
    const demo = handleDemoFallback(path, init);
    if (demo !== undefined) {
      return new Response(JSON.stringify(demo), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw fetchErr;
  }
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let r: Response;
  try {
    r = await apiFetch(path, init);
  } catch (err) {
    const demo = handleDemoFallback<T>(path, init);
    if (demo !== undefined) return demo;
    throw err;
  }

  const text = await r.text();

  // Vercel SPA rewrite trả về HTML của index.html khi API 404 thay vì JSON
  if (text.trim().startsWith('<!DOCTYPE') || r.headers.get('content-type')?.includes('text/html')) {
    const demo = handleDemoFallback<T>(path, init);
    if (demo !== undefined) return demo;
  }

  if (!r.ok) {
    const demo = handleDemoFallback<T>(path, init);
    if (demo !== undefined) return demo;

    let parsedMessage: string | null = null;
    try {
      const err = JSON.parse(text) as { message?: string; error?: string };
      parsedMessage =
        typeof err.message === 'string' && err.message.trim()
          ? err.message
          : typeof err.error === 'string' && err.error.trim()
          ? err.error
          : null;
    } catch {
      parsedMessage = null;
    }
    throw new Error(parsedMessage ?? (text || r.statusText));
  }

  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    const demo = handleDemoFallback<T>(path, init);
    if (demo !== undefined) return demo;
    return {} as T;
  }
}
