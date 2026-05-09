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
        if (!r.ok) {
          throw new Error('Khong lay duoc CSRF token. Kiem tra backend API dang chay.');
        }
        return r.json() as Promise<{ csrfToken: string }>;
      })
      .then((d) => {
        if (!d.csrfToken) {
          throw new Error('CSRF token khong hop le.');
        }
        return d.csrfToken;
      })
      .catch((err) => {
        resetCsrfCache();
        throw err;
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

  let headers = await withHeaders();
  let response = await fetch(`${base}${path}`, { ...init, credentials: 'include', headers });

  if (needsCsrf && response.status === 403) {
    resetCsrfCache();
    headers = await withHeaders();
    response = await fetch(`${base}${path}`, { ...init, credentials: 'include', headers });
  }

  return response;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await apiFetch(path, init);
  const text = await r.text();
  if (!r.ok) {
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
  return text ? (JSON.parse(text) as T) : ({} as T);
}
