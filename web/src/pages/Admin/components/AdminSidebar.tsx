import { Link, useLocation } from 'react-router-dom';
import { ChefHat, LayoutDashboard, CheckCircle, Users, Utensils, FileText, MessageSquare, LogOut, MessageCircle, FolderTree } from 'lucide-react';
import { apiJson } from '../../../lib/api';

export default function AdminSidebar({ pendingCount }: { pendingCount: number }) {
  const location = useLocation();
  const path = location.pathname;

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
      await apiJson('/api/admin/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    }
  };

  const navClass = (isActive: boolean) =>
    `flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  return (
    <aside className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-xl z-20 transition-colors duration-300">
      <div className="p-8 flex items-center gap-4 border-b border-slate-100 dark:border-slate-700">
        <div className="bg-black dark:bg-slate-900 p-3 rounded-xl shadow-lg">
          <ChefHat className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">CookingWeb</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
        <Link to="/admin/dashboard" className={navClass(path === '/admin/dashboard')}>
          <LayoutDashboard className="w-6 h-6" /> Dashboard
        </Link>
        <Link to="/admin/approvals" className={navClass(path === '/admin/approvals')}>
          <CheckCircle className="w-6 h-6" /> Duyệt bài
          {pendingCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm border border-red-400">
              {pendingCount}
            </span>
          )}
        </Link>

        <div className="pt-6 pb-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Quản lý
        </div>
        
        <Link to="/admin/users" className={navClass(path === '/admin/users')}>
          <Users className="w-6 h-6" /> Người dùng
        </Link>
        <Link to="/admin/recipes" className={navClass(path === '/admin/recipes')}>
          <Utensils className="w-6 h-6" /> Công thức
        </Link>
        <Link to="/admin/blogs" className={navClass(path === '/admin/blogs')}>
          <FileText className="w-6 h-6" /> Blog
        </Link>
        <Link to="/admin/comments" className={navClass(path === '/admin/comments')}>
          <MessageCircle className="w-6 h-6" /> Bình luận
        </Link>
        <Link to="/admin/categories" className={navClass(path === '/admin/categories')}>
          <FolderTree className="w-6 h-6" /> Danh mục
        </Link>
        <Link to="/admin/feedback" className={navClass(path === '/admin/feedback')}>
          <MessageSquare className="w-6 h-6" /> Phản hồi
        </Link>
      </nav>

      <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg shadow-sm">
            A
          </div>
          <div className="overflow-hidden">
            <p className="text-base font-bold truncate text-slate-800 dark:text-slate-200">Admin</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-100 dark:hover:border-red-800 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 rounded-xl font-semibold transition-all shadow-sm hover:shadow text-sm"
        >
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
