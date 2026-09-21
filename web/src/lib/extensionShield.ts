/**
 * Browser Extension Shield
 * Hệ thống phòng vệ chống xung đột từ Tiện ích mở rộng của trình duyệt (Browser Extensions).
 * 
 * 1. An toàn KeyboardEvent: Fallback thuộc tính `key` và `code` về chuỗi rỗng `""` thay vì `undefined`
 *    để các script của extension (như content_main.js:15050 gọi `e.key.toLowerCase()`) không bị văng lỗi.
 * 2. Lọc lỗi toàn cục: Chặn các unhandled error và unhandled promise rejection có nguồn gốc
 *    từ extension (chrome-extension://, moz-extension://, content_main.js, v.v.) làm ô nhiễm console.
 * 3. Hỗ trợ bảo vệ tương thích DOM cho React.
 */

function isExtensionSource(source: string): boolean {
  if (!source) return false;
  const s = source.toLowerCase();
  return (
    s.includes('chrome-extension://') ||
    s.includes('moz-extension://') ||
    s.includes('safari-extension://') ||
    s.includes('extension://') ||
    s.includes('content_main.js') ||
    s.includes('content-script') ||
    s.includes('contentscript') ||
    s.includes('pagescript.js') ||
    s.includes('inpage.js') ||
    s.includes('grammarly') ||
    s.includes('lastpass') ||
    s.includes('1password') ||
    s.includes('immersivetranslate') ||
    s.includes('saladict')
  );
}

export function initExtensionShield(): void {
  if (typeof window === 'undefined') return;

  // 1. Bảo vệ KeyboardEvent.prototype (Đặc trị lỗi content_main.js:15050 e.key.toLowerCase())
  try {
    if (typeof KeyboardEvent !== 'undefined' && KeyboardEvent.prototype) {
      const keyDesc = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, 'key');
      if (keyDesc && keyDesc.get) {
        const originalKeyGet = keyDesc.get;
        Object.defineProperty(KeyboardEvent.prototype, 'key', {
          get: function () {
            try {
              const val = originalKeyGet.call(this);
              return typeof val === 'string' ? val : '';
            } catch {
              return '';
            }
          },
          configurable: true,
          enumerable: true,
        });
      }

      const codeDesc = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, 'code');
      if (codeDesc && codeDesc.get) {
        const originalCodeGet = codeDesc.get;
        Object.defineProperty(KeyboardEvent.prototype, 'code', {
          get: function () {
            try {
              const val = originalCodeGet.call(this);
              return typeof val === 'string' ? val : '';
            } catch {
              return '';
            }
          },
          configurable: true,
          enumerable: true,
        });
      }
    }
  } catch {
    // Không làm ảnh hưởng môi trường nếu prototype bị freeze
  }

  // 2. Chặn lỗi unhandled từ browser extension
  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      const filename = event.filename || '';
      const stack = event.error?.stack || '';
      const message = event.message || '';

      if (isExtensionSource(filename) || isExtensionSource(stack) || isExtensionSource(message)) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return true;
      }

      // Ngăn chặn lỗi văng crash khi tiện ích dịch tự động làm xáo trộn node của React
      if (
        message.includes("Failed to execute 'removeChild' on 'Node'") ||
        message.includes("Failed to execute 'insertBefore' on 'Node'")
      ) {
        event.preventDefault?.();
      }
    },
    true
  );

  // 3. Chặn unhandled promise rejection từ browser extension
  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const stack = (reason && typeof reason === 'object' && 'stack' in reason ? String(reason.stack) : '') || String(reason || '');
      const message = (reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : '') || '';

      if (isExtensionSource(stack) || isExtensionSource(message)) {
        event.preventDefault?.();
      }
    },
    true
  );
}

// Tự động khởi chạy ngay khi module được import
initExtensionShield();
