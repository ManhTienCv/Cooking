import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Dev: không bật CSP chặt (Vite HMR cần eval). Preview/build phục vụ: bật HSTS + CSP chặt hơn. */
const headersDev = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

const cspPreview = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' https://www.google.com https://www.gstatic.com https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-src https://www.google.com",
].join('; ');

/** Preview: CSP chặt. HSTS chỉ bật trên reverse proxy khi phục vụ HTTPS thật (tránh gắn HSTS khi chạy http://localhost:4173). */
const headersPreview = {
  ...headersDev,
  'Content-Security-Policy': cspPreview,
} as const;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: { ...headersDev },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    headers: { ...headersPreview },
    port: 4173,
  },
});
