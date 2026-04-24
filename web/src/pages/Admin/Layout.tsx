import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const me = await apiJson<{ authenticated: boolean }>('/api/admin/me');
        if (!me.authenticated) {
          navigate('/admin/login');
          return;
        }
        // Fetch dashboard to get pending stats
        const [d] = await Promise.all([
          apiJson<Record<string, number>>('/api/admin/dashboard'),
        ]);
        setStats({ pending: (d.pendingRecipes ?? 0) + (d.pendingBlogs ?? 0) });
      } catch (err) {
        navigate('/admin/login');
      } finally {
        setLoading(false);
      }
    };
    void checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 text-slate-900 h-screen flex overflow-hidden dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
      <AdminSidebar pendingCount={stats.pending} />
      <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="p-10 flex-1">
          <AdminHeader pendingCount={stats.pending} />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
