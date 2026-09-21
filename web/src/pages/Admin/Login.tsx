import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { hasRecaptchaSiteKey } from '../../lib/recaptchaSiteKey';
import { apiFetch, resetCsrfCache } from '../../lib/api';
import { executeRecaptchaV3 } from '../../lib/recaptchaV3';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('demo_admin_logged_in') === 'true') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

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
        setError(data.message ?? 'Email hoặc mật khẩu không chính xác.');
        return;
      }
      resetCsrfCache();
      localStorage.setItem('demo_admin_logged_in', 'true');
      toast.success('Đăng nhập Quản trị viên thành công!');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      // Fallback cho chế độ offline không kết nối backend
      if (email.trim().toLowerCase() === 'admin@cook.local' && (password === '123456678' || password === '12345678')) {
        resetCsrfCache();
        localStorage.setItem('demo_admin_logged_in', 'true');
        toast.success('Đăng nhập Quản trị viên thành công (Chế độ xem trước)!');
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900">
      <main 
        className="min-h-screen flex items-center justify-center px-4 py-10"
        style={{
          zoom: 0.9,
          width: 'calc(100vw / 0.9)',
          minHeight: 'calc(100vh / 0.9)',
        }}
      >
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-[1.1fr_0.9fr] border border-gray-100 dark:border-slate-800">
        {/* Left Panel: Cover Image */}
        <div className="relative hidden md:block">
          <img
            src="/assets/images/avatar2.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          <div className="absolute bottom-8 left-8 right-8 text-white space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/30">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" /> Hệ Thống Quản Trị Trung Tâm
            </div>
            <h2 className="text-2xl font-bold">CookingWeb & KitchenCook</h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Quản lý danh mục, kiểm duyệt công thức món ăn, theo dõi đơn hàng và báo cáo doanh thu đa kênh.
            </p>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <form onSubmit={onSubmit} className="w-full">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-md dark:bg-blue-600">
                <ChefHat className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">CookingWeb Admin</h1>
              <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">Cổng đăng nhập bảng điều khiển quản trị</p>
            </div>



            {error && (
              <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                <p className="text-red-600 text-xs text-center font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4 text-left">
              <div>
                <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1">
                  Email Quản trị
                </label>
                <input
                  id="admin-email"
                  name="email"
                  className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full px-3 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 focus:bg-white dark:focus:bg-slate-800 transition-all text-sm font-medium text-slate-900 dark:text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="admin@cook.local"
                  title="Email address"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1">
                  Mật khẩu
                </label>
                <input
                  id="admin-password"
                  name="password"
                  className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg w-full px-3 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 focus:bg-white dark:focus:bg-slate-800 transition-all text-sm font-medium text-slate-900 dark:text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••••••"
                  title="Password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="mt-5 w-full bg-slate-950 dark:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-amber-500 hover:text-black dark:hover:bg-blue-500 transition-all duration-300 shadow-md disabled:opacity-60 cursor-pointer"
              type="submit"
            >
              {loading ? 'Đang xử lý...' : 'Đăng nhập Quản trị'}
            </button>

            <p className="mt-5 text-center text-[11px] text-gray-400">© 2026 CookingWeb Portal & KitchenCook Store</p>
          </form>
        </div>
      </div>
      </main>
    </div>
  );
}
