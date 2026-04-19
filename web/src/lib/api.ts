/**
 * Gọi API backend (proxy Vite /api → cookapp-server).
 * Session cookie + CSRF header cho các request thay đổi dữ liệu.
 */

const base = '';

let csrfPromise: Promise<string> | null = null;

export function resetCsrfCache(): void {
  csrfPromise = null;
}

export async function getCsrfToken(): Promise<string> {
  if (!csrfPromise) {
    csrfPromise = fetch(`${base}/api/auth/csrf`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('CSRF');
        return r.json() as Promise<{ csrfToken: string }>;
      })
      .then((d) => d.csrfToken);
  }
  return csrfPromise;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
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
  return fetch(`${base}${path}`, { ...init, credentials: 'include', headers });
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await apiFetch(path, init);
  const text = await r.text();
  if (!r.ok) {
    try {
      const err = JSON.parse(text) as { message?: string };
      throw new Error(err.message ?? (text || r.statusText));
    } catch {
      throw new Error(text || r.statusText);
    }
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}
