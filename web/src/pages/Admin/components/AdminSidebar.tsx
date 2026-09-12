import { Link, useLocation } from 'react-router-dom';
import { ChefHat, LayoutDashboard, CheckCircle, Users, Utensils, FileText, MessageSquare, LogOut, MessageCircle, FolderTree, ShoppingBag, ClipboardList } from 'lucide-react';
import { apiJson } from '../../../lib/api';

export default function AdminSidebar({ pendingCount }: { pendingCount: number; pendingProducts?: number }) {
  const location = useLocation();
  const path = location.pathname;

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
      await apiJson('/api/admin/logout', { method: 'POST' });
      window.location.replace('/admin/login');
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

      <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto custom-scrollbar">
        {/* KHỐI 1: TỔNG QUAN & HỆ THỐNG */}
        <div className="pt-2 pb-2 px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Tổng quan & Hệ thống
        </div>
        <Link to="/admin/dashboard" className={navClass(path === '/admin/dashboard')}>
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </Link>
        <Link to="/admin/users" className={navClass(path === '/admin/users')}>
          <Users className="w-5 h-5" /> Người dùng
        </Link>
        <Link to="/admin/feedback" className={navClass(path === '/admin/feedback')}>
          <MessageSquare className="w-5 h-5" /> Phản hồi
        </Link>

        {/* KHỐI 2: CỔNG COOKINGBOY */}
        <div className="pt-5 pb-2 px-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
          <span>Cổng CookingBoy</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black">Ẩm thực</span>
        </div>
        <Link to="/admin/approvals" className={navClass(path === '/admin/approvals')}>
          <CheckCircle className="w-5 h-5" /> Duyệt bài công thức
          {pendingCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm border border-red-400">
              {pendingCount}
            </span>
          )}
        </Link>
        <Link to="/admin/recipes" className={navClass(path === '/admin/recipes')}>
          <Utensils className="w-5 h-5" /> Quản lý công thức
        </Link>
        <Link to="/admin/blogs" className={navClass(path === '/admin/blogs')}>
          <FileText className="w-5 h-5" /> Blog ẩm thực
        </Link>
        <Link to="/admin/comments" className={navClass(path === '/admin/comments')}>
          <MessageCircle className="w-5 h-5" /> Bình luận
        </Link>

        {/* KHỐI 3: CỬA HÀNG KITCHENCOOK */}
        <div className="pt-5 pb-2 px-3 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
          <span>Cửa hàng KitchenCook</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black">Đồ bếp</span>
        </div>
        <Link to="/admin/market-products" className={navClass(path === '/admin/market-products')}>
          <ShoppingBag className="w-5 h-5" /> Đồ bếp & Quản lý kho
        </Link>
        <Link to="/admin/market-orders" className={navClass(path === '/admin/market-orders')}>
          <ClipboardList className="w-5 h-5" /> Đơn hàng
        </Link>
        <Link to="/admin/categories" className={navClass(path === '/admin/categories')}>
          <FolderTree className="w-5 h-5" /> Danh mục sản phẩm
        </Link>
      </nav>

      {/* FOOTER & PORTAL JUMP LINKS */}
      <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 space-y-3">
        {/* Direct portal links */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-2xs text-center"
            title="Mở cổng CookingBoy trong tab mới"
          >
            ↗ CookingBoy
          </a>
          <a
            href="/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-500 hover:text-amber-600 transition-colors shadow-2xs text-center"
            title="Mở cửa hàng KitchenCook trong tab mới"
          >
            ↗ KitchenCook
          </a>
        </div>

        <div className="flex items-center gap-3 px-1 pt-1">
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm shadow-xs">
            A
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">Admin</p>
            <p className="text-[11px] text-slate-400 font-medium">Tổng quản trị hệ thống</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-100 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 rounded-xl font-bold transition-all shadow-xs text-xs cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
