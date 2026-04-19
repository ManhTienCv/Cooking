import React, { useState, useEffect, useRef } from 'react';
import type ReCAPTCHA from 'react-google-recaptcha';
import '../assets/css/BlackwhiteAuth.css';
import { RecaptchaCook } from './RecaptchaCook';
import { hasRecaptchaSiteKey } from '../lib/recaptchaSiteKey';
import { apiFetch, resetCsrfCache } from '../lib/api';
import { notifyAuthChanged } from '../lib/authEvents';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Gọi sau khi đăng nhập / đăng ký thành công */
  onSuccess?: () => void;
  /** Mở modal từ nút Đăng ký (tab đăng ký) */
  initialSignUp?: boolean;
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialSignUp = false }: AuthModalProps) {
  const [isActive, setIsActive] = useState(false); // false = sign in, true = sign up
  const [view, setView] = useState<'main' | 'forgot' | 'reset'>('main');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [pendingEmail, setPendingEmail] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setView('main');
      setAuthError(null);
      setAuthSuccess(null);
      setIsActive(initialSignUp);
      setRegisterStep(1);
      setPendingEmail('');
      setForgotEmail('');
      setCaptchaRequired(false);
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

  const handleFocusSignUp = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsActive(true);
    setRegisterStep(1);
    setAuthError(null);
  };

  const handleFocusSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsActive(false);
    setAuthError(null);
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
    const recaptchaToken = recaptchaRef.current?.getValue() ?? '';
    setAuthLoading(true);
    try {
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
          setCaptchaRequired(true);
          if (!hasRecaptchaSiteKey()) {
            setAuthError(
              'Server yêu cầu reCAPTCHA. Thêm VITE_RECAPTCHA_SITE_KEY vào web/.env và khởi động lại Vite.'
            );
          } else {
            setAuthError(data.message ?? 'Đăng nhập thất bại.');
            recaptchaRef.current?.reset();
          }
        } else {
          setAuthError(data.message ?? 'Đăng nhập thất bại.');
        }
        return;
      }
      setCaptchaRequired(false);
      resetCsrfCache();
      notifyAuthChanged();
      onSuccess?.();
      onClose();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi mạng.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterRequestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get('full_name') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const password = String(fd.get('password') ?? '');
    setAuthLoading(true);
    try {
      const r = await apiFetch('/api/auth/register/request-otp', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password }),
      });
      const data = (await r.json()) as { success?: boolean; message?: string };
      if (!r.ok) {
        setAuthError(data.message ?? 'Không gửi được mã OTP.');
        return;
      }
      setPendingEmail(email);
      setRegisterStep(2);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi mạng.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    const fd = new FormData(e.currentTarget);
    const otp = String(fd.get('otp') ?? '').trim();
    setAuthLoading(true);
    try {
      const r = await apiFetch('/api/auth/register/verify', {
        method: 'POST',
        body: JSON.stringify({ email: pendingEmail, otp }),
      });
      const data = (await r.json()) as { success?: boolean; message?: string };
      if (!r.ok) {
        setAuthError(data.message ?? 'Xác thực thất bại.');
        return;
      }
      resetCsrfCache();
      notifyAuthChanged();
      onSuccess?.();
      onClose();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi mạng.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    setAuthLoading(true);
    try {
      const r = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = (await r.json()) as { success?: boolean; message?: string };
      if (!r.ok) {
        setAuthError(data.message ?? 'Không gửi được mã.');
        return;
      }
      setForgotEmail(email);
      setView('reset');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi mạng.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    const fd = new FormData(e.currentTarget);
    const otp = String(fd.get('otp') ?? '').trim();
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

  return (
    <div className={`blackwhite-auth-overlay ${isOpen ? 'show' : ''}`} onClick={handleOverlayClick}>
      <div className={`blackwhite-container ${isActive ? 'active' : ''}`}>
        {/* Registration Form */}
        <div className="blackwhite-form-container blackwhite-sign-up">
          {registerStep === 1 ? (
            <form
              className="h-full flex flex-col items-center justify-center p-8 bg-white"
              onSubmit={handleRegisterRequestOtp}
            >
              <h1 className="text-2xl font-bold mb-2">Tạo Tài Khoản</h1>
              <span className="text-gray-500 text-xs mb-4">Nhập thông tin rồi nhận mã OTP qua email</span>
              {authError && isActive && (
                <p className="text-red-600 text-xs mb-2 w-full text-center">{authError}</p>
              )}
              <input
                name="full_name"
                type="text"
                placeholder="Họ tên"
                required
                minLength={3}
                className="bg-gray-100 border border-gray-200 rounded-lg w-full p-3 mb-3 focus:outline-none focus:border-black focus:bg-white transition-all text-sm"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="bg-gray-100 border border-gray-200 rounded-lg w-full p-3 mb-3 focus:outline-none focus:border-black focus:bg-white transition-all text-sm"
              />
              <input
                name="password"
                type="password"
                placeholder="Mật khẩu (ít nhất 8 ký tự)"
                required
                minLength={8}
                className="bg-gray-100 border border-gray-200 rounded-lg w-full p-3 mb-3 focus:outline-none focus:border-black focus:bg-white transition-all text-sm"
              />
              <p className="text-sm text-gray-600 mt-2 mb-4">
                Đã có tài khoản?{' '}
                <a href="#" onClick={handleFocusSignIn} className="font-semibold text-black underline">
                  Đăng nhập
                </a>
              </p>
              <button
                type="submit"
                disabled={authLoading}
                className="bg-black text-white rounded-lg py-3 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {authLoading ? '…' : 'Gửi mã OTP'}
              </button>
            </form>
          ) : (
            <form
              className="h-full flex flex-col items-center justify-center p-8 bg-white"
              onSubmit={handleRegisterVerify}
            >
              <h1 className="text-2xl font-bold mb-2">Nhập mã OTP</h1>
              <span className="text-gray-500 text-xs mb-2 text-center">
                Đã gửi mã tới <strong>{pendingEmail}</strong>
              </span>
              {authError && isActive && (
                <p className="text-red-600 text-xs mb-2 w-full text-center">{authError}</p>
              )}
              <input
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="Mã 6 số"
                required
                className="bg-gray-100 border border-gray-200 rounded-lg w-full p-3 mb-4 focus:outline-none focus:border-black focus:bg-white transition-all text-sm tracking-widest text-center"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="bg-black text-white rounded-lg py-3 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {authLoading ? '…' : 'Hoàn tất đăng ký'}
              </button>
              <button
                type="button"
                className="mt-3 text-sm text-gray-600 underline"
                onClick={() => {
                  setRegisterStep(1);
                  setAuthError(null);
                }}
              >
                ← Quay lại nhập thông tin
              </button>
            </form>
          )}
        </div>

        {/* Login Form */}
        <div className="blackwhite-form-container blackwhite-sign-in" style={{ display: view === 'main' ? 'block' : 'none' }}>
          <form className="h-full flex flex-col items-center justify-center p-8 bg-white" onSubmit={handleLogin}>
            <h1 className="text-2xl font-bold mb-2">Đăng Nhập</h1>
            <span className="text-gray-500 text-xs mb-4">hoặc sử dụng email và mật khẩu</span>
            {!isActive && authSuccess && (
              <p className="text-green-700 text-xs mb-2 w-full text-center">{authSuccess}</p>
            )}
            {!isActive && authError && (
              <p className="text-red-600 text-xs mb-2 w-full text-center">{authError}</p>
            )}
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="bg-gray-100 border border-gray-200 rounded-lg w-full p-3 mb-3 focus:outline-none focus:border-black focus:bg-white transition-all text-sm"
            />
            <input
              name="password"
              type="password"
              placeholder="Mật khẩu"
              required
              className="bg-gray-100 border border-gray-200 rounded-lg w-full p-3 mb-3 focus:outline-none focus:border-black focus:bg-white transition-all text-sm"
            />
            <RecaptchaCook visible={captchaRequired} recaptchaRef={recaptchaRef} />
            <a href="#" onClick={handleShowForgot} className="text-xs text-gray-400 hover:text-black mb-4">
              Quên mật khẩu?
            </a>
            <p className="text-sm text-gray-600 mt-2 mb-4">
              Chưa có tài khoản?{' '}
              <a href="#" onClick={handleFocusSignUp} className="font-semibold text-black underline">
                Đăng ký
              </a>
            </p>
            <button
              type="submit"
              disabled={authLoading}
              className="bg-black text-white rounded-lg py-3 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {authLoading ? '…' : 'Đăng Nhập'}
            </button>
          </form>
        </div>

        {/* Forgot Password */}
        <div
          className="blackwhite-form-container blackwhite-forgot-password"
          style={{
            display: view === 'forgot' ? 'flex' : 'none',
            left: 0,
            width: '50%',
            height: '100%',
            zIndex: 10,
            background: '#fff',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <form className="h-full flex flex-col items-center justify-center p-8 bg-white w-full" onSubmit={handleForgotSendOtp}>
            <h1 className="text-2xl font-bold mb-2">Quên Mật Khẩu</h1>
            <span className="text-gray-500 text-xs mb-4 text-center">Chỉ email đã đăng ký mới nhận được mã</span>
            {authError && view === 'forgot' && (
              <p className="text-red-600 text-xs mb-2 w-full text-center">{authError}</p>
            )}
            <input
              name="email"
              type="email"
              placeholder="Email đã đăng ký"
              required
              className="bg-gray-100 border border-gray-200 rounded-lg w-full p-3 mb-3 focus:outline-none focus:border-black focus:bg-white transition-all text-sm"
            />
            <button
              type="submit"
              disabled={authLoading}
              className="bg-black text-white rounded-lg py-3 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors mt-2 disabled:opacity-60"
            >
              {authLoading ? '…' : 'Gửi mã OTP'}
            </button>
            <p className="text-sm text-gray-600 mt-4">
              <a href="#" onClick={handleBackToLogin} className="font-semibold text-black underline">
                Quay lại Đăng nhập
              </a>
            </p>
          </form>
        </div>

        {/* Reset Password */}
        <div
          className="blackwhite-form-container blackwhite-reset-password"
          style={{
            display: view === 'reset' ? 'flex' : 'none',
            left: 0,
            width: '50%',
            height: '100%',
            zIndex: 10,
            background: '#fff',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <form className="h-full flex flex-col items-center justify-center p-8 bg-white w-full" onSubmit={handleResetPassword}>
            <h1 className="text-2xl font-bold mb-2">Đặt Lại Mật Khẩu</h1>
            <span className="text-gray-500 text-xs mb-2 text-center">
              Mã đã gửi tới <strong>{forgotEmail}</strong>
            </span>
            {authError && view === 'reset' && (
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
              className="bg-gray-100 border border-gray-200 rounded-lg w-full p-3 mb-3 focus:outline-none focus:border-black focus:bg-white transition-all text-sm"
            />
            <input
              name="new_password"
              type="password"
              placeholder="Mật khẩu mới (≥8 ký tự)"
              required
              minLength={8}
              className="bg-gray-100 border border-gray-200 rounded-lg w-full p-3 mb-6 focus:outline-none focus:border-black focus:bg-white transition-all text-sm"
            />
            <button
              type="submit"
              disabled={authLoading}
              className="bg-black text-white rounded-lg py-3 px-8 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors mt-2 disabled:opacity-60"
            >
              {authLoading ? '…' : 'Đổi mật khẩu'}
            </button>
            <p className="text-sm text-gray-600 mt-4">
              <a href="#" onClick={handleBackToLogin} className="font-semibold text-black underline">
                Quay lại Đăng nhập
              </a>
            </p>
          </form>
        </div>

        {/* Toggle Overlays */}
        <div className="blackwhite-toggle-container" style={{ display: view === 'main' ? 'block' : 'none' }}>
          <div className="blackwhite-toggle">
            <div
              className="blackwhite-toggle-panel blackwhite-toggle-left flex flex-col items-center justify-center text-center p-8 text-white relative"
              style={{ backgroundImage: "url('/assets/images/avatar2.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-black/60"></div>
              <div className="relative z-10 w-full">
                <h1 className="text-3xl font-bold mb-4">Chào mừng trở lại!</h1>
                <p className="text-sm text-gray-200 mb-6">Nhập thông tin cá nhân để sử dụng tất cả tính năng của trang</p>
                <button
                  type="button"
                  onClick={handleFocusSignIn}
                  className="bg-transparent border-2 border-white text-white rounded-lg py-3 px-8 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
                >
                  Đăng Nhập
                </button>
              </div>
            </div>

            <div
              className="blackwhite-toggle-panel blackwhite-toggle-right flex flex-col items-center justify-center text-center p-8 text-white relative"
              style={{ backgroundImage: "url('/assets/images/avatar3.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-black/60"></div>
              <div className="relative z-10 w-full">
                <h1 className="text-3xl font-bold mb-4">Xin chào, bạn mới!</h1>
                <p className="text-sm text-gray-200 mb-6">Đăng ký với email — xác thực OTP để kích hoạt tài khoản</p>
                <button
                  type="button"
                  onClick={handleFocusSignUp}
                  className="bg-transparent border-2 border-white text-white rounded-lg py-3 px-8 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
                >
                  Đăng Ký
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
