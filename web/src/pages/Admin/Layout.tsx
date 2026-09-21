import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import { NotificationProvider } from '../../contexts/NotificationContext';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      const isDemoAdmin = localStorage.getItem('demo_admin_logged_in') === 'true';
      try {
        const me = await apiJson<{ authenticated: boolean }>('/api/admin/me');
        if (!me.authenticated) {
          localStorage.removeItem('demo_admin_logged_in');
          localStorage.removeItem('admin_token');
          navigate('/admin/login');
          return;
        }
      } catch {
        if (!isDemoAdmin) {
          navigate('/admin/login');
          return;
        }
      }

      // Tải số liệu thống kê phụ trợ (nếu lỗi mạng cũng không được văng phiên đăng nhập admin)
      try {
        const [d] = await Promise.all([
          apiJson<Record<string, number>>('/api/admin/dashboard'),
        ]);
        setStats({
          pending: (d.pendingRecipes ?? 0) + (d.pendingBlogs ?? 0),
        });
      } catch {
        // Giữ phiên đăng nhập, stats mặc định là 0
      } finally {
        setLoading(false);
      }
    };
    void checkAuth();
  }, [navigate]);

  useEffect(() => {
    const handleCountSet = (e: Event) => {
      const ce = e as CustomEvent<{ count: number }>;
      if (typeof ce.detail?.count === 'number') {
        setStats((prev) => ({ ...prev, pending: Math.max(0, ce.detail.count) }));
      }
    };
    window.addEventListener('admin_pending_count_set', handleCountSet);
    return () => window.removeEventListener('admin_pending_count_set', handleCountSet);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <NotificationProvider role="admin">
      <div className="w-screen h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
        <div 
          className="bg-slate-50 text-slate-900 flex overflow-hidden dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300"
          style={{
            zoom: 0.9,
            width: 'calc(100vw / 0.9)',
            height: 'calc(100vh / 0.9)',
          }}
        >
          <AdminSidebar pendingCount={stats.pending} />
          <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <div className="p-10 flex-1">
              <AdminHeader />
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
