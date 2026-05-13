import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { hasRecaptchaSiteKey } from '../../lib/recaptchaSiteKey';
import { apiFetch, resetCsrfCache } from '../../lib/api';
import { executeRecaptchaV3 } from '../../lib/recaptchaV3';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const recaptchaToken = hasRecaptchaSiteKey() ? await executeRecaptchaV3('admin_login') : '';
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
          if (!hasRecaptchaSiteKey()) {
            setError('Server requires reCAPTCHA. Add VITE_RECAPTCHA_SITE_KEY to web/.env and restart Vite.');
          } else {
            setError(data.message ?? 'Login failed');
          }
        } else {
          setError(data.message ?? 'Login failed');
        }
        return;
      }
      resetCsrfCache();
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-[1.1fr_0.9fr]">
        {/* Left Panel: Cover Image */}
        <div className="relative hidden md:block">
          <img
            src="/assets/images/avatar2.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <h2 className="text-2xl font-bold">CookingWeb</h2>
            <p className="text-sm text-white/80">Quản lý hệ thống ẩm thực chuyên nghiệp</p>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="p-8 sm:p-10">
          <form onSubmit={onSubmit} className="w-full">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-md">
                <ChefHat className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-black">CookingWeb Admin</h1>
              <p className="text-gray-500 text-xs">Đăng nhập để quản lý hệ thống</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                <p className="text-red-600 text-xs text-center font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-xs font-semibold text-black mb-1">
                  Email
                </label>
                <input
                  id="admin-email"
                  name="email"
                  className="bg-gray-50 border border-gray-200 rounded-lg w-full px-3 py-2.5 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white transition-all text-sm font-medium"
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
                <label htmlFor="admin-password" className="block text-xs font-semibold text-black mb-1">
                  Mật khẩu
                </label>
                <input
                  id="admin-password"
                  name="password"
                  className="bg-gray-50 border border-gray-200 rounded-lg w-full px-3 py-2.5 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white transition-all text-sm font-medium"
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

            <button
              disabled={loading}
              className="mt-4 w-full bg-black text-white rounded-lg py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-yellow-400 hover:text-black transition-all duration-300 shadow-md disabled:opacity-60 disabled:hover:bg-black disabled:hover:text-white"
              type="submit"
            >
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>

            <p className="mt-5 text-center text-[11px] text-gray-400">© 2026 CookingWeb</p>
          </form>
        </div>
      </div>
    </main>
  );
}
