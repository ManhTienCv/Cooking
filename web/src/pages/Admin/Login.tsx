import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type ReCAPTCHA from 'react-google-recaptcha';
import { RecaptchaCook } from '../../components/RecaptchaCook';
import { hasRecaptchaSiteKey } from '../../lib/recaptchaSiteKey';
import { apiFetch, resetCsrfCache } from '../../lib/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const recaptchaToken = recaptchaRef.current?.getValue() ?? '';
    try {
      const r = await apiFetch('/api/admin/login', {
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
            setError('Server requires reCAPTCHA. Add VITE_RECAPTCHA_SITE_KEY to web/.env and restart Vite.');
          } else {
            setError(data.message ?? 'Login failed');
            recaptchaRef.current?.reset();
          }
        } else {
          setError(data.message ?? 'Login failed');
        }
        return;
      }
      setCaptchaRequired(false);
      resetCsrfCache();
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Panel: Cover Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-black relative flex-col justify-center items-center text-white p-12"
        style={{ backgroundImage: "url('/assets/images/avatar2.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 w-full max-w-md text-center">
          <h2 className="text-4xl font-serif italic font-bold mb-6">Trang Quản Trị</h2>
          <p className="text-gray-300 text-lg">
            Hệ thống quản lý chuyên nghiệp và bảo mật dành riêng cho đội ngũ phát triển.
          </p>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-black mb-2">Đăng Nhập Admin</h1>
            <p className="text-gray-500 text-sm">Vui lòng đăng nhập để truy cập bảng điều khiển.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100">
              <p className="text-red-600 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-semibold text-black mb-1">
                Email
              </label>
              <input
                id="admin-email"
                name="email"
                className="bg-gray-50 border border-gray-200 rounded-lg w-full p-3 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white transition-all text-sm font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Nhập email của bạn"
                title="Email address"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-black mb-1">
                Mật khẩu
              </label>
              <input
                id="admin-password"
                name="password"
                className="bg-gray-50 border border-gray-200 rounded-lg w-full p-3 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white transition-all text-sm font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Nhập mật khẩu"
                title="Password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <div className="mt-4 mb-6">
            <RecaptchaCook visible={captchaRequired} recaptchaRef={recaptchaRef} />
          </div>

          <button
            disabled={loading}
            className="w-full bg-black text-white rounded-lg py-3.5 text-sm font-bold uppercase tracking-wider hover:bg-yellow-400 hover:text-black transition-all duration-300 shadow-md disabled:opacity-60 disabled:hover:bg-black disabled:hover:text-white"
            type="submit"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </main>
  );
}
