import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isExtensionError: boolean;
  isChunkError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isExtensionError: false,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const msg = error?.message || '';
    const stack = error?.stack || '';

    // Kiểm tra xem lỗi có phải do stale chunk sau khi deploy bản mới trên Vercel
    const isChunkLoadFailed =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Strict MIME type checking is enforced');

    // Kiểm tra xem lỗi có phải do tiện ích dịch tự động (Google Translate) hoặc extension can thiệp DOM
    const isDOMNodeMismatch =
      msg.includes("Failed to execute 'removeChild' on 'Node'") ||
      msg.includes("Failed to execute 'insertBefore' on 'Node'") ||
      msg.includes('The node to be removed is not a child of this node') ||
      stack.includes('chrome-extension://') ||
      stack.includes('content_main.js') ||
      stack.includes('content-script');

    return {
      hasError: true,
      error,
      isExtensionError: isDOMNodeMismatch,
      isChunkError: isChunkLoadFailed,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.state.isChunkError) {
      try {
        const lastReload = sessionStorage.getItem('app_chunk_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          sessionStorage.setItem('app_chunk_reload', String(now));
          window.location.reload();
          return;
        }
      } catch {
        window.location.reload();
        return;
      }
    }

    // Nếu là lỗi do extension làm xáo trộn DOM, bỏ qua log cảnh báo đỏ
    if (this.state.isExtensionError) {
      console.warn('[ExtensionShield] Bắt và cách ly lỗi can thiệp DOM từ tiện ích mở rộng:', error.message);
      return;
    }
    console.error('[ErrorBoundary] Lỗi runtime ứng dụng:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      isExtensionError: false,
      isChunkError: false,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.state.isChunkError) {
        return (
          <div className="min-h-[350px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 m-4">
            <div className="max-w-md text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <RotateCcw className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                Hệ thống vừa có bản cập nhật mới
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Một bản nâng cấp vừa được phát hành trên máy chủ. Vui lòng bấm nút bên dưới để tải giao diện mới nhất.
              </p>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center gap-2 mx-auto shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Cập nhật và tải lại ngay
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-[300px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 m-4">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {this.state.isExtensionError
                ? 'Giao diện vừa bị ảnh hưởng bởi tiện ích trình duyệt'
                : 'Đã xảy ra sự cố hiển thị'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {this.state.isExtensionError
                ? 'Một tiện ích mở rộng (như Google Dịch hoặc sửa lỗi chính tả) có thể đã can thiệp vào cấu trúc hiển thị. Bạn có thể bấm nút bên dưới để khôi phục lại trang.'
                : 'Một lỗi nhỏ đã xảy ra trong quá trình kết xuất dữ liệu. Vui lòng bấm thử lại để tiếp tục.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Khôi phục hiển thị
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
              >
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
