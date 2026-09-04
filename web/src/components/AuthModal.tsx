import React, { useState, useEffect } from 'react';
import '../assets/css/BlackwhiteAuth.css';
import { hasRecaptchaSiteKey } from '../lib/recaptchaSiteKey';
import { apiFetch, resetCsrfCache } from '../lib/api';
import { notifyAuthChanged } from '../lib/authEvents';
import { createPortal } from 'react-dom';
import { executeRecaptchaV3 } from '../lib/recaptchaV3';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Gọi sau khi đăng nhập / đăng ký thành công */
  onSuccess?: () => void;
  /** Mở modal từ nút Đăng ký (tab đăng ký) */
  initialSignUp?: boolean;
}

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export default function AuthModal({ isOpen, onClose, onSuccess, initialSignUp = false }: AuthModalProps) {
  const [isActive, setIsActive] = useState(initialSignUp); // false = sign in, true = sign up
  const [view, setView] = useState<'main' | 'forgot' | 'reset' | 'google-name'>('main');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Thông tin người dùng sau khi Google xác thực để điền/xác nhận tên
  const [googleUserData, setGoogleUserData] = useState<{
    id: number;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [googleNameInput, setGoogleNameInput] = useState('');

  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  const sanitizeOtp = (value: string) => value.replace(/\D/g, '').slice(0, 6);

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      return;
    }
    // Ngăn chặn các phím không phải là số
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    // Ngăn chặn nhập tiếp khi đã đủ 6 số
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const hasSelection = start !== null && end !== null && start !== end;
    if (target.value.length >= 6 && !hasSelection) {
      e.preventDefault();
    }
  };

  const handleResetOtpChange = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    const sanitized = sanitizeOtp(target.value);
    if (target.value !== sanitized) {
      target.value = sanitized;
    }
    setResetOtp(sanitized);
  };

  // Kích hoạt Google Sign-In chuẩn bằng OAuth2 (không bị hiển thị gợi ý email bên trong nút)
  const handleGoogleLoginClick = () => {
    if (!googleClientId) {
      setAuthError('Vui lòng cấu hình VITE_GOOGLE_CLIENT_ID trong file .env để sử dụng Google Sign-In.');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      setAuthError('Đang tải thư viện Google, vui lòng thử lại sau 1-2 giây.');
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setAuthError('Đăng nhập Google bị hủy hoặc thất bại.');
            return;
          }
          if (!tokenResponse.access_token) {
            setAuthError('Không nhận được mã truy cập từ Google.');
            return;
          }
          setAuthLoading(true);
          setAuthError(null);
          setAuthSuccess(null);
          try {
            const r = await apiFetch('/api/auth/google', {
              method: 'POST',
              body: JSON.stringify({ access_token: tokenResponse.access_token }),
            });
            const data = (await r.json()) as {
              success?: boolean;
              message?: string;
              user?: { id: number; full_name: string; email: string; avatar_url?: string | null };
              isNewUser?: boolean;
            };
            if (!r.ok) {
              setAuthError(data.message ?? 'Đăng nhập Google thất bại.');
              return;
            }
            resetCsrfCache();

            // Nếu là người dùng mới hoặc đang ở tab đăng ký: hiển thị form hoàn tất thông tin tên
            if (data.isNewUser || isActive) {
              setGoogleUserData({
                id: data.user?.id ?? 0,
                fullName: data.user?.full_name || '',
                email: data.user?.email || '',
                avatarUrl: data.user?.avatar_url || null,
              });
              setGoogleNameInput(data.user?.full_name || '');
              setView('google-name');
              return;
            }

            notifyAuthChanged({ authenticated: true });
            onSuccess?.();
            onClose();
          } catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Lỗi kết nối khi đăng nhập Google.');
          } finally {
            setAuthLoading(false);
          }
        },
      });
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Không thể khởi chạy Google Sign-In.');
    }
  };

  // Lưu tên người dùng sau khi đăng nhập bằng Google
  const handleSaveGoogleName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = googleNameInput.trim();
    if (trimmed.length < 2) {
      setAuthError('Tên người dùng phải từ 2 ký tự trở lên.');
      return;
    }
    if (trimmed.length > 255) {
      setAuthError('Tên người dùng không được vượt quá 255 ký tự.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      const r = await apiFetch('/api/auth/google/set-name', {
        method: 'POST',
        body: JSON.stringify({ full_name: trimmed }),
      });
      const data = (await r.json()) as { success?: boolean; message?: string };
      if (!r.ok) {
        setAuthError(data.message ?? 'Không thể cập nhật tên.');
        return;
      }
      resetCsrfCache();
      notifyAuthChanged({ authenticated: true });
      onSuccess?.();
      onClose();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi mạng.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Bỏ qua bước đổi tên sau khi đăng nhập Google
  const handleSkipGoogleName = () => {
    resetCsrfCache();
    notifyAuthChanged({ authenticated: true });
    onSuccess?.();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setView('main');
      setAuthError(null);
      setAuthSuccess(null);
      setIsActive(initialSignUp);
      setForgotEmail('');
      setResetOtp('');
      setGoogleUserData(null);
      setGoogleNameInput('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialSignUp]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };


  const handleShowForgot = (e: React.MouseEvent) => {
    e.preventDefault();
    setView('forgot');
    setAuthError(null);
  };

  const handleBackToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setView('main');
    setForgotEmail('');
    setResetOtp('');
    setAuthError(null);
    setAuthSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');
    setAuthLoading(true);
    try {
      const recaptchaToken = hasRecaptchaSiteKey() ? await executeRecaptchaV3('login') : '';
      const r = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, recaptchaToken }),
      });
      const data = (await r.json()) as {
        success?: boolean;
        message?: string;
        captchaRequired?: boolean;
      };
      if (!r.ok) {
        if (data.captchaRequired) {
          if (!hasRecaptchaSiteKey()) {
            setAuthError(
              'Server yêu cầu reCAPTCHA. Thêm VITE_RECAPTCHA_SITE_KEY vào web/.env và khởi động lại Vite.'
            );
          } else {
            setAuthError(data.message ?? 'Đăng nhập thất bại.');
          }
        } else {
          setAuthError(data.message ?? 'Đăng nhập thất bại.');
        }
        return;
      }
      resetCsrfCache();
      notifyAuthChanged({ authenticated: true });
      onSuccess?.();
      onClose();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi mạng.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Đăng ký trực tiếp 1 bước — không cần gửi và chờ OTP qua email
  const handleRegisterDirect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (authLoading) return;
    setAuthError(null);
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get('full_name') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const password = String(fd.get('password') ?? '');

    if (full_name.length < 3) {
      setAuthError('Họ tên phải từ 3 ký tự trở lên.');
      return;
    }
    if (full_name.length > 255) {
      setAuthError('Họ tên không được vượt quá 255 ký tự.');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setAuthError('Email không đúng định dạng.');
      return;
    }
    if (email.length > 255) {
      setAuthError('Email không được vượt quá 255 ký tự.');
      return;
    }
    if (password.length > 128) {
      setAuthError('Mật khẩu không được vượt quá 128 ký tự.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Mật khẩu phải từ 8 ký tự trở lên.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setAuthError('Mật khẩu phải chứa ít nhất 1 chữ cái in hoa.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setAuthError('Mật khẩu phải chứa ít nhất 1 chữ số.');
      return;
    }
    if (!/[^a-zA-Z0-9\s]/.test(password)) {
      setAuthError('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.');
      return;
    }
    if (password.trim().length === 0) {
      setAuthError('Mật khẩu không được chỉ chứa khoảng trắng.');
      return;
    }

    setAuthLoading(true);
    try {
      const recaptchaToken = hasRecaptchaSiteKey() ? await executeRecaptchaV3('register') : '';
      const r = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password, recaptchaToken }),
      });
      const data = (await r.json()) as { success?: boolean; message?: string };
      if (!r.ok) {
        setAuthError(data.message ?? 'Đăng ký thất bại.');
        return;
      }
      resetCsrfCache();
      notifyAuthChanged({ authenticated: true });
      onSuccess?.();
      onClose();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi mạng.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Quên mật khẩu: gửi mã OTP qua email (SMTP / Brevo)
  const handleForgotSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (authLoading) return;
    setAuthError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setAuthError('Email không đúng định dạng.');
      return;
    }
    if (email.length > 255) {
      setAuthError('Email không được vượt quá 255 ký tự.');
      return;
    }

    setAuthLoading(true);
    try {
      const recaptchaToken = hasRecaptchaSiteKey() ? await executeRecaptchaV3('forgot_password') : '';
      const r = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, recaptchaToken }),
      });
      const data = (await r.json()) as { success?: boolean; message?: string };
      if (!r.ok) {
        setAuthError(data.message ?? 'Không gửi được mã.');
        return;
      }
      setForgotEmail(email);
      setResetOtp('');
      setView('reset');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi mạng.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Đặt lại mật khẩu bằng mã OTP nhận qua email
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    const fd = new FormData(e.currentTarget);
    const otp = resetOtp.trim();
    const new_password = String(fd.get('new_password') ?? '');
    setAuthLoading(true);
    try {
      const r = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail, otp, new_password }),
      });
      const data = (await r.json()) as { success?: boolean; message?: string };
      if (!r.ok) {
        setAuthError(data.message ?? 'Đặt lại mật khẩu thất bại.');
        return;
      }
      setView('main');
      setForgotEmail('');
      setAuthError(null);
      setAuthSuccess(data.message ?? 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi mạng.');
    } finally {
      setAuthLoading(false);
    }
  };

  return createPortal(
    <div className={`blackwhite-auth-overlay ${isOpen ? 'show' : ''}`} onClick={handleOverlayClick}>
      <div
        data-testid="auth-modal-container"
        className="blackwhite-container bg-white dark:bg-slate-900 overflow-hidden relative"
      >
        {/* Nút đóng modal X ở góc trên bên phải */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-50 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 1. Màn hình chính: Đăng nhập & Đăng ký (Layout 2 cột mượt mà, không giật lag/lệch layout) */}
        {view === 'main' && (
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-[1.15fr_0.85fr]">
            {/* Cột Form tương tác */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-white dark:bg-slate-900 overflow-y-auto">
              {/* Tab chuyển đổi Đăng Nhập / Đăng Ký */}
              <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-4 w-full max-w-[320px]">
                <button
                  type="button"
                  onClick={() => { setIsActive(false); setAuthError(null); setAuthSuccess(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !isActive
                      ? 'bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => { setIsActive(true); setAuthError(null); setAuthSuccess(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Đăng Ký
                </button>
              </div>

              {isActive ? (
                /* Form Đăng Ký */
                <form
                  className="w-full max-w-[320px] flex flex-col items-center justify-center"
                  onSubmit={handleRegisterDirect}
                >
                  <h1 className="text-2xl font-bold mb-1 text-black dark:text-white text-center">Tạo Tài Khoản</h1>
                  <span className="text-gray-500 dark:text-gray-400 text-xs mb-3 text-center">Đăng ký nhanh chóng để khám phá món ngon</span>

                  {/* Clean Custom Google Sign-Up Button */}
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleGoogleLoginClick}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2 shadow-sm cursor-pointer"
                    style={{ textTransform: 'none', letterSpacing: 'normal' }}
                  >
                    <GoogleIcon />
                    <span>Đăng ký nhanh bằng Google</span>
                  </button>

                  <div className="w-full flex items-center gap-2 my-1.5">
                    <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1" />
                    <span className="text-gray-400 dark:text-gray-500 text-[11px] uppercase tracking-wider font-medium">hoặc điền email</span>
                    <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1" />
                  </div>

                  {authError && (
                    <p className="text-red-600 text-xs mb-2 w-full text-center">{authError}</p>
                  )}

                  <input
                    name="full_name"
                    type="text"
                    placeholder="Họ và tên"
                    required
                    minLength={3}
                    className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full p-2.5 mb-2 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium text-black dark:text-white"
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    required
                    className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full p-2.5 mb-2 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium text-black dark:text-white"
                  />
                  <input
                    name="password"
                    type="password"
                    placeholder="Mật khẩu (ít nhất 8 ký tự, có số & hoa)"
                    required
                    minLength={8}
                    className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full p-2.5 mb-2 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium text-black dark:text-white"
                  />

                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-3">
                    Đã có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsActive(false); setAuthError(null); }}
                      className="font-semibold text-black dark:text-white underline cursor-pointer"
                    >
                      Đăng nhập ngay
                    </button>
                  </p>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="bg-black text-white rounded-lg py-2.5 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-60 w-full cursor-pointer"
                  >
                    {authLoading ? 'Đang xử lý…' : 'Đăng Ký'}
                  </button>
                </form>
              ) : (
                /* Form Đăng Nhập */
                <form
                  data-testid="auth-login-form"
                  className="w-full max-w-[320px] flex flex-col items-center justify-center"
                  onSubmit={handleLogin}
                >
                  <h1 className="text-2xl font-bold mb-1 text-black dark:text-white text-center">Đăng Nhập</h1>
                  <span className="text-gray-500 dark:text-gray-400 text-xs mb-3 text-center">Chào mừng bạn quay trở lại</span>

                  {/* Clean Custom Google Sign-In Button */}
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleGoogleLoginClick}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2 shadow-sm cursor-pointer"
                    style={{ textTransform: 'none', letterSpacing: 'normal' }}
                  >
                    <GoogleIcon />
                    <span>Tiếp tục với Google</span>
                  </button>

                  <div className="w-full flex items-center gap-2 my-1.5">
                    <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1" />
                    <span className="text-gray-400 dark:text-gray-500 text-[11px] uppercase tracking-wider font-medium">hoặc email</span>
                    <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1" />
                  </div>

                  {!isActive && authSuccess && (
                    <p className="text-green-700 text-xs mb-2 w-full text-center font-medium">{authSuccess}</p>
                  )}
                  {!isActive && authError && (
                    <p data-testid="auth-login-error" className="text-red-600 text-xs mb-2 w-full text-center">{authError}</p>
                  )}

                  <input
                    data-testid="auth-login-email"
                    name="email"
                    type="email"
                    placeholder="Email"
                    required
                    className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full p-2.5 mb-2 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium text-black dark:text-white"
                  />
                  <input
                    data-testid="auth-login-password"
                    name="password"
                    type="password"
                    placeholder="Mật khẩu"
                    required
                    className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full p-2.5 mb-2 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium text-black dark:text-white"
                  />

                  <div className="w-full flex justify-end mb-2">
                    <button
                      type="button"
                      onClick={handleShowForgot}
                      className="text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Chưa có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsActive(true); setAuthError(null); }}
                      className="font-semibold text-black dark:text-white underline cursor-pointer"
                    >
                      Đăng ký ngay
                    </button>
                  </p>

                  <button
                    data-testid="auth-login-submit"
                    type="submit"
                    disabled={authLoading}
                    className="bg-black text-white rounded-lg py-2.5 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-60 w-full cursor-pointer"
                  >
                    {authLoading ? 'Đang xử lý…' : 'Đăng Nhập'}
                  </button>
                </form>
              )}
            </div>

            {/* Cột Banner hình ảnh truyền cảm hứng */}
            <div
              className="hidden md:flex relative items-center justify-center text-white overflow-hidden"
              style={{
                backgroundImage: `url(${isActive ? '/assets/images/avatar2.jpg' : '/assets/images/avatar3.jpg'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/40" />
              <div className="relative z-10 px-8 text-center max-w-sm flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-lg">
                  <span className="text-2xl">🍳</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {isActive ? 'Gia nhập CookingBoy!' : 'Chào mừng trở lại!'}
                </h2>
                <p className="text-xs text-white/80 leading-relaxed mb-5">
                  {isActive
                    ? 'Khám phá hàng ngàn công thức nấu ăn ngon, lưu món yêu thích và mua sắm nguyên liệu tươi sạch.'
                    : 'Đăng nhập để tiếp tục nấu ăn, quản lý công thức và kết nối cùng cộng đồng đầu bếp.'}
                </p>

                <div className="w-full space-y-2 text-left bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15 text-xs text-white/90">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold">✓</span>
                    <span>Hơn 10,000+ công thức nấu ăn phong phú</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold">✓</span>
                    <span>Nguyên liệu tươi ngon giao tận nhà</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold">✓</span>
                    <span>Cộng đồng ẩm thực sôi nổi mỗi ngày</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Màn hình Quên mật khẩu */}
        {view === 'forgot' && (
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-6 sm:p-8 overflow-y-auto">
              <form className="w-full max-w-[320px] flex flex-col items-center justify-center" onSubmit={handleForgotSendOtp}>
                <h1 className="text-2xl font-bold mb-2 text-black dark:text-white">Quên Mật Khẩu</h1>
                <span className="text-gray-500 dark:text-gray-400 text-xs mb-4 text-center">Nhập email đăng ký để nhận mã OTP xác minh</span>
                {authError && (
                  <p className="text-red-600 text-xs mb-2 w-full text-center">{authError}</p>
                )}
                <input
                  name="email"
                  type="email"
                  placeholder="Email đã đăng ký"
                  required
                  className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full p-2.5 mb-3 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium text-black dark:text-white"
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="bg-black text-white rounded-lg py-2.5 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors mt-2 disabled:opacity-60 w-full cursor-pointer"
                >
                  {authLoading ? 'Đang gửi…' : 'Gửi mã OTP qua Email'}
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                  <button type="button" onClick={handleBackToLogin} className="font-semibold text-black dark:text-white underline cursor-pointer">
                    Quay lại Đăng nhập
                  </button>
                </p>
              </form>
            </div>
            <div
              className="hidden md:flex relative items-center justify-center text-white"
              style={{ backgroundImage: "url('/assets/images/avatar3.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative z-10 px-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Khôi phục tài khoản</h2>
                <p className="text-sm text-white/80">
                  Nhập email để nhận mã OTP và đặt lại mật khẩu an toàn.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Màn hình Đặt lại mật khẩu */}
        {view === 'reset' && (
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-6 sm:p-8 overflow-y-auto">
              <form
                className="w-full max-w-[320px] flex flex-col items-center justify-center"
                autoComplete="off"
                onSubmit={handleResetPassword}
              >
                <h1 className="text-2xl font-bold mb-2 text-black dark:text-white">Đặt Lại Mật Khẩu</h1>
                <span className="text-gray-500 dark:text-gray-400 text-xs mb-2 text-center">
                  Mã OTP 6 số đã được gửi tới <strong className="text-black dark:text-white">{forgotEmail}</strong>
                </span>
                {authError && (
                  <p className="text-red-600 text-xs mb-2 w-full text-center">{authError}</p>
                )}
                <input
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Mã OTP (6 số)"
                  required
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  spellCheck={false}
                  value={resetOtp}
                  onChange={handleResetOtpChange}
                  onInput={handleResetOtpChange}
                  onKeyDown={handleOtpKeyDown}
                  className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full p-2.5 mb-3 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium tracking-widest text-center text-black dark:text-white"
                />
                <input
                  name="new_password"
                  type="password"
                  placeholder="Mật khẩu mới (≥8 ký tự)"
                  required
                  minLength={8}
                  className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full p-2.5 mb-4 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium text-black dark:text-white"
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="bg-black text-white rounded-lg py-2.5 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-60 w-full cursor-pointer"
                >
                  {authLoading ? 'Đang cập nhật…' : 'Xác nhận đổi mật khẩu'}
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                  <button type="button" onClick={handleBackToLogin} className="font-semibold text-black dark:text-white underline cursor-pointer">
                    Quay lại Đăng nhập
                  </button>
                </p>
              </form>
            </div>
            <div
              className="hidden md:flex relative items-center justify-center text-white"
              style={{ backgroundImage: "url('/assets/images/avatar2.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative z-10 px-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Bảo mật tài khoản</h2>
                <p className="text-sm text-white/80">
                  Tạo mật khẩu mới mạnh hơn để bảo vệ tài khoản của bạn.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Form điền / xác nhận tên người dùng sau khi login bằng Google */}
        {view === 'google-name' && (
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-6 sm:p-8 overflow-y-auto">
              <form className="w-full max-w-[320px] flex flex-col items-center justify-center" onSubmit={handleSaveGoogleName}>
                {googleUserData?.avatarUrl ? (
                  <img
                    src={googleUserData.avatarUrl}
                    alt="Google Avatar"
                    className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-yellow-400 object-cover shadow"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 font-bold text-xl flex items-center justify-center mx-auto mb-2 border-2 border-yellow-400">
                    {googleUserData?.fullName?.charAt(0).toUpperCase() || 'C'}
                  </div>
                )}

                <h1 className="text-2xl font-bold mb-1 text-black dark:text-white text-center">Hoàn Tất Thông Tin</h1>
                <span className="text-gray-500 dark:text-gray-400 text-xs mb-1 text-center">
                  Chào mừng bạn đến với <strong>CookingBoy</strong>!
                </span>
                {googleUserData?.email && (
                  <span className="inline-block bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[11px] px-2.5 py-0.5 rounded-full mb-3">
                    {googleUserData.email}
                  </span>
                )}

                {authError && (
                  <p className="text-red-600 text-xs mb-2 w-full text-center">{authError}</p>
                )}

                <div className="w-full text-left mb-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                    Tên người dùng hiển thị
                  </label>
                  <input
                    name="full_name"
                    type="text"
                    placeholder="Ví dụ: Bếp Trưởng Nam, CookingMaster..."
                    required
                    minLength={2}
                    maxLength={50}
                    value={googleNameInput}
                    onChange={(e) => setGoogleNameInput(e.target.value)}
                    className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full p-2.5 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium text-black dark:text-white"
                  />
                  <span className="text-[11px] text-gray-400 block mt-1">
                    Tên này sẽ hiển thị khi bạn chia sẻ công thức, viết bài và bình luận.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="bg-black text-white rounded-lg py-2.5 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors mt-3 w-full disabled:opacity-60 cursor-pointer"
                >
                  {authLoading ? 'Đang lưu…' : 'Xác Nhận & Bắt Đầu'}
                </button>

                <button
                  type="button"
                  onClick={handleSkipGoogleName}
                  className="mt-3 text-xs text-gray-500 hover:text-black dark:hover:text-white underline transition-colors cursor-pointer"
                >
                  Bỏ qua và dùng tên này sau
                </button>
              </form>
            </div>

            <div
              className="hidden md:flex relative items-center justify-center text-white"
              style={{ backgroundImage: "url('/assets/images/avatar1.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative z-10 px-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Gia nhập cộng đồng</h2>
                <p className="text-sm text-white/80">
                  Hãy chọn một cái tên thật ấn tượng để kết nối cùng hàng ngàn tín đồ ẩm thực.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
