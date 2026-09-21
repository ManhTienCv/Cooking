import { lazy, type ComponentType } from 'react';

/**
 * safeLazy: Tự động bắt lỗi và tải lại trang khi một chunk (lazy component) thất bại
 * do website vừa deploy phiên bản mới trên Vercel (lỗi Stale Chunk / Failed to fetch dynamically imported module).
 */
export function safeLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: unknown) {
      const err = error as Error | undefined;
      const msg = err?.message || String(error || '');

      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('Strict MIME type checking is enforced');

      if (isChunkError) {
        try {
          const lastReload = sessionStorage.getItem('app_chunk_reload');
          const now = Date.now();
          if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
            sessionStorage.setItem('app_chunk_reload', String(now));
            window.location.reload();
            return new Promise<{ default: T }>(() => {});
          }
        } catch {
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}
