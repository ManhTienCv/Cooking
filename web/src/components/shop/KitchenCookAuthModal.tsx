import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Mail, Lock, User, Phone, Eye, EyeOff, 
  ArrowRight, AlertCircle, Loader2, Sparkles, ChefHat 
} from 'lucide-react';
import { apiFetch, resetCsrfCache } from '../../lib/api';
import { notifyAuthChanged } from '../../lib/authEvents';
import { hasRecaptchaSiteKey } from '../../lib/recaptchaSiteKey';
import { executeRecaptchaV3 } from '../../lib/recaptchaV3';
import { loadProfilePreferences, saveProfilePreferences } from '../../lib/profilePreferences';
import toast from 'react-hot-toast';

interface KitchenCookAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialSignUp?: boolean;
}

const VN_PHONE_REGEX = /^(0[3|5|7|8|9])[0-9]{8}$/;

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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

export default function KitchenCookAuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialSignUp = false,
}: KitchenCookAuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>(initialSignUp ? 'signup' : 'signin');
  const [view, setView] = useState<'main' | 'forgot' | 'reset' | 'google-name'>('main');

  // Form states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Google user confirmation
  const [googleUserData, setGoogleUserData] = useState<{
    id: number;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [googleNameInput, setGoogleNameInput] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTab(initialSignUp ? 'signup' : 'signin');
      setView('main');
      setErrorMessage(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialSignUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Handle Login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = signInEmail.trim().toLowerCase();
    const password = signInPassword;

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = hasRecaptchaSiteKey() ? await executeRecaptchaV3('login') : '';
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, recaptchaToken }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.message || 'Email hoặc mật khẩu không chính xác.');
        return;
      }

      resetCsrfCache();
      notifyAuthChanged({ authenticated: true });
      toast.success('Đăng nhập thành công! Chào mừng bạn đến với KitchenCook.');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullName = signUpName.trim();
    const email = signUpEmail.trim().toLowerCase();
    const phone = signUpPhone.trim();
    const password = signUpPassword;

    // Validate full name: min 2 words
    const nameWords = fullName.split(/\s+/).filter(Boolean);
    if (nameWords.length < 2) {
      setErrorMessage('Họ và tên cần có ít nhất 2 từ (Ví dụ: Nguyễn Văn An).');
      return;
    }

    // Validate email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Email không đúng định dạng.');
      return;
    }

    // Validate phone number if provided
    if (phone && !VN_PHONE_REGEX.test(phone)) {
      setErrorMessage('Số điện thoại không đúng chuẩn (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).');
      return;
    }

    // Validate password: min 8 chars
    if (password.length < 8) {
      setErrorMessage('Mật khẩu phải có tối thiểu 8 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = hasRecaptchaSiteKey() ? await executeRecaptchaV3('register') : '';
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          recaptchaToken,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.message || 'Đăng ký tài khoản thất bại. Email có thể đã được sử dụng.');
        return;
      }

      // Save initial phone into local preferences
      if (phone) {
        try {
          const prefs = loadProfilePreferences(email);
          prefs.addresses = [
            {
              id: 'addr_' + Date.now(),
              name: fullName,
              phone: phone,
              address: '',
              label: 'home',
              isDefault: true,
            },
          ];
          saveProfilePreferences(email, prefs);
        } catch {
          // Ignore
        }
      }

      resetCsrfCache();
      notifyAuthChanged({ authenticated: true });
      toast.success('Đăng ký tài khoản KitchenCook thành công!');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Google Sign-In
  const handleGoogleLogin = () => {
    if (!googleClientId) {
      setErrorMessage('Google Sign-In chưa được cấu hình Client ID.');
      return;
    }

    const g = (window as unknown as { google?: { accounts?: { oauth2?: { initTokenClient: (c: unknown) => { requestAccessToken: (o: unknown) => void } } } } }).google;
    if (!g?.accounts?.oauth2) {
      setErrorMessage('Thư viện Google Sign-In đang tải, vui lòng thử lại sau giây lát.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const client = g.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: { access_token?: string; error?: string }) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            setLoading(false);
            setErrorMessage('Đăng nhập Google bị hủy hoặc không thành công.');
            return;
          }

          try {
            const res = await apiFetch('/api/auth/google', {
              method: 'POST',
              body: JSON.stringify({ access_token: tokenResponse.access_token }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
              setErrorMessage(data.message || 'Đăng nhập Google thất bại.');
              return;
            }

            if (data.isNewUser) {
              setGoogleUserData({
                id: data.user?.id,
                fullName: data.user?.full_name || '',
                email: data.user?.email || '',
                avatarUrl: data.user?.avatar_url || null,
              });
              setGoogleNameInput(data.user?.full_name || '');
              setView('google-name');
              return;
            }

            resetCsrfCache();
            notifyAuthChanged({ authenticated: true });
            toast.success('Đăng nhập Google thành công!');
            onSuccess?.();
            onClose();
          } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Lỗi xác thực Google.');
          } finally {
            setLoading(false);
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch {
      setLoading(false);
      setErrorMessage('Không thể khởi chạy Google Sign-In.');
    }
  };

  // 4. Handle Save Google Name
  const handleSaveGoogleName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = googleNameInput.trim();
    if (trimmed.length < 2) {
      setErrorMessage('Tên hiển thị phải từ 2 ký tự trở lên.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/google/set-name', {
        method: 'POST',
        body: JSON.stringify({ full_name: trimmed }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorMessage(d.message || 'Không thể lưu tên.');
        return;
      }
      resetCsrfCache();
      notifyAuthChanged({ authenticated: true });
      toast.success('Chào mừng bạn đến với KitchenCook!');
      onSuccess?.();
      onClose();
    } catch {
      setErrorMessage('Lỗi mạng khi cập nhật tên.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Forgot Password
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotEmail.trim().toLowerCase();
    if (!email) {
      setErrorMessage('Vui lòng nhập email tài khoản.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const recaptchaToken = hasRecaptchaSiteKey() ? await executeRecaptchaV3('forgot_password') : '';
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, recaptchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.message || 'Không gửi được mã OTP.');
        return;
      }
      setView('reset');
      toast.success('Đã gửi mã OTP về email của bạn.');
    } catch {
      setErrorMessage('Lỗi kết nối khi gửi mã OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp.trim() || resetNewPassword.length < 8) {
      setErrorMessage('Vui lòng nhập mã OTP 6 số và mật khẩu mới tối thiểu 8 ký tự.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: resetOtp.trim(),
          new_password: resetNewPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.message || 'Đặt lại mật khẩu thất bại.');
        return;
      }
      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      setView('main');
      setTab('signin');
      setSignInEmail(forgotEmail);
      setForgotEmail('');
      setResetOtp('');
      setResetNewPassword('');
    } catch {
      setErrorMessage('Lỗi khi đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm transition-opacity font-vietnam"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-lg bg-[#FAF7F2] dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-stone-200/80 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 transition-all animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-slate-800 transition-colors z-20 cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="pt-8 pb-6 px-8 text-center bg-gradient-to-b from-stone-100/70 to-transparent dark:from-slate-800/50 border-b border-stone-200/50 dark:border-slate-800/50">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-600 dark:bg-amber-500 text-white shadow-md shadow-amber-600/20 mb-3">
            <ChefHat className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-serif">
            KitchenCook Store
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Đồ Gia Dụng Bếp & Thiết Bị Tiện Ích Cao Cấp
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* VIEW: MAIN (Sign In / Sign Up) */}
          {view === 'main' && (
            <>
              {/* Tab Selector */}
              <div className="flex p-1 mb-6 rounded-2xl bg-stone-200/70 dark:bg-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl transition-all ${
                    tab === 'signin'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('signup');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl transition-all ${
                    tab === 'signup'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Đăng Ký Tài Khoản
                </button>
              </div>

              {/* TAB 1: SIGN IN */}
              {tab === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Google Login Button */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    <GoogleIcon />
                    <span>Đăng nhập nhanh với Google</span>
                  </button>

                  <div className="flex items-center gap-3 my-2">
                    <div className="h-px bg-stone-200 dark:bg-slate-700 flex-1" />
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 uppercase font-semibold">hoặc email</span>
                    <div className="h-px bg-stone-200 dark:bg-slate-700 flex-1" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="tenban@gmail.com"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Mật khẩu
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setView('forgot');
                          setErrorMessage(null);
                        }}
                        className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type={showSignInPassword ? 'text' : 'password'}
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                      >
                        {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-black dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-slate-900/10 dark:shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xác thực...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng Nhập KitchenCook</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: SIGN UP */}
              {tab === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Họ và tên người nhận <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn An"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Email tài khoản <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Số điện thoại nhận hàng <span className="text-amber-600 text-[11px]">(khuyên dùng)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="tel"
                        value={signUpPhone}
                        onChange={(e) => setSignUpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="0912 345 678 (10 số di động VN)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Mật khẩu bảo mật <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự (có chữ & số)"
                        className="w-full pl-10 pr-11 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                      >
                        {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed pt-1">
                    Bằng việc nhấn Đăng ký, bạn đồng ý với chính sách bảo hành & quyền riêng tư của KitchenCook Store.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang tạo tài khoản...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Tạo Tài Khoản Khách Hàng</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot' && (
            <form onSubmit={handleSendForgotOtp} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Khôi phục mật khẩu
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Nhập email đăng ký để nhận mã OTP xác thực đặt lại mật khẩu.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Email tài khoản
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi mã xác nhận'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setView('main');
                  setErrorMessage(null);
                }}
                className="w-full text-center text-xs text-stone-600 dark:text-stone-400 hover:underline pt-2 cursor-pointer font-semibold"
              >
                ← Quay lại đăng nhập
              </button>
            </form>
          )}

          {/* VIEW: RESET PASSWORD WITH OTP */}
          {view === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Đặt mật khẩu mới
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Nhập mã OTP 6 số đã gửi tới <strong>{forgotEmail}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Mã OTP (6 chữ số)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] text-lg font-bold py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Mật khẩu mới (≥ 8 ký tự)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:border-amber-600 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cập nhật mật khẩu'}
              </button>
            </form>
          )}

          {/* VIEW: GOOGLE CONFIRM NAME */}
          {view === 'google-name' && (
            <form onSubmit={handleSaveGoogleName} className="space-y-4 text-center">
              {googleUserData?.avatarUrl ? (
                <img
                  src={googleUserData.avatarUrl}
                  alt="Google Avatar"
                  className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-amber-500 object-cover shadow"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 font-bold text-xl flex items-center justify-center mx-auto mb-2 border-2 border-amber-500">
                  {googleNameInput.charAt(0).toUpperCase() || 'K'}
                </div>
              )}
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Xác nhận tên hiển thị
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {googleUserData?.email ? `Tài khoản: ${googleUserData.email}. ` : ''}
                Tên này sẽ dùng trên hóa đơn điện tử và đơn hàng giao đến bạn.
              </p>

              <div className="relative text-left">
                <input
                  type="text"
                  required
                  value={googleNameInput}
                  onChange={(e) => setGoogleNameInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md cursor-pointer"
              >
                Hoàn tất đăng nhập
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
