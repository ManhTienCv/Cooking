import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ChefHat,
  LayoutDashboard,
  CheckCircle,
  Users,
  Utensils,
  FileText,
  MessageSquare,
  LogOut,
  MessageCircle,
  FolderTree,
  ShoppingBag,
  ClipboardList,
  Headphones,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { apiJson } from '../../../lib/api';

export default function AdminSidebar({
  pendingCount,
}: {
  pendingCount: number;
  pendingProducts?: number;
}) {
  const location = useLocation();
  const path = location.pathname;
  const reduceMotion = useReducedMotion();

  // Lưu trạng thái đóng / mở vào localStorage để khi chuyển trang không bị reset
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cooking_admin_sidebar_collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('cooking_admin_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Hỗ trợ phím tắt Ctrl + B hoặc Cmd + B để đóng mở nhanh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
      localStorage.removeItem('demo_admin_logged_in');
      localStorage.removeItem('admin_token');
      try {
        await apiJson('/api/admin/logout', { method: 'POST' });
      } catch {
        // ignore if offline
      }
      window.location.replace('/admin/login');
    }
  };

  const renderNavItem = (
    to: string,
    Icon: LucideIcon,
    label: string,
    badge?: number | null
  ) => {
    const isActive =
      to === '/admin/dashboard'
        ? path === '/admin/dashboard' || path === '/admin'
        : path === to || path.startsWith(`${to}/`);

    return (
      <Link
        key={to}
        to={to}
        title={isCollapsed ? label : undefined}
        className={`relative flex items-center h-11 w-full rounded-xl select-none transition-colors duration-200 group ${
          isActive
            ? 'text-white'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        {/* Viên thuốc lướt trượt dọc chuẩn Raycast / Linear */}
        {isActive && (
          <motion.div
            layoutId="admin-sidebar-active-pill"
            className="absolute inset-0 rounded-xl bg-blue-600 shadow-md shadow-blue-500/25"
            transition={
              reduceMotion
                ? { duration: 0.1 }
                : { type: 'spring', stiffness: 450, damping: 35 }
            }
            style={{ zIndex: 0 }}
          />
        )}

        {/* Icon neo cố định tại vị trí chính giữa khi thu gọn hoặc cạnh trái khi mở rộng */}
        <div className="relative z-10 w-11 h-11 shrink-0 flex items-center justify-center">
          <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
        </div>

        {/* Text và badge trượt mượt mà không làm giật icon */}
        <div
          className="relative z-10 flex-1 flex items-center justify-between pr-3 min-w-0 transition-all duration-200 ease-out"
          style={{
            opacity: isCollapsed ? 0 : 1,
            transform: isCollapsed ? 'translateX(-10px)' : 'translateX(0)',
            pointerEvents: isCollapsed ? 'none' : 'auto',
          }}
        >
          <span className="truncate whitespace-nowrap text-sm font-semibold">{label}</span>
          {typeof badge === 'number' && badge > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-2xs border border-red-400 shrink-0">
              {badge}
            </span>
          )}
        </div>

        {/* Điểm đỏ thông báo khi đang ở chế độ thu gọn */}
        {typeof badge === 'number' && badge > 0 && (
          <span
            className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-800 transition-opacity duration-200 z-20"
            style={{ opacity: isCollapsed ? 1 : 0 }}
          />
        )}
      </Link>
    );
  };

  const renderSectionHeader = (title: string, tag?: string, tagColor?: string) => {
    return (
      <div className="pt-2 pb-0.5">
        <div
          className="overflow-hidden transition-all duration-200 ease-out px-3 flex items-center justify-between"
          style={{
            maxHeight: isCollapsed ? 0 : 28,
            opacity: isCollapsed ? 0 : 1,
            transform: isCollapsed ? 'translateY(-6px)' : 'translateY(0)',
          }}
        >
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
            {title}
          </span>
          {tag && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                tagColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tag}
            </span>
          )}
        </div>
        {isCollapsed && (
          <div className="border-t border-slate-100 dark:border-slate-700/60 my-1.5 mx-2 transition-opacity duration-200" />
        )}
      </div>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 272 }}
      transition={{
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1], // Chuẩn cubic-bezier tự nhiên của iOS / Fluent UI, mượt mà không khựng
      }}
      className="bg-white dark:bg-slate-800 border-r border-slate-200/80 dark:border-slate-700/80 flex flex-col shadow-xl z-20 shrink-0 select-none overflow-hidden will-change-[width]"
    >
      {/* 1. Header trên cùng với NÚT ĐÓNG / MỞ TRƯỢT SIÊU MƯỢT */}
      <div
        className={`h-20 border-b border-slate-100 dark:border-slate-700/80 shrink-0 flex items-center transition-all duration-200 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              key="brand-logo"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 overflow-hidden min-w-0"
            >
              <div className="bg-black dark:bg-slate-950 p-2 rounded-2xl shadow-md shrink-0 flex items-center justify-center">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div className="overflow-hidden whitespace-nowrap min-w-0">
                <h1 className="font-bold text-lg tracking-tight text-gray-900 dark:text-white leading-tight truncate">
                  CookingWeb
                </h1>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nút đóng/mở có layout animation: trượt mượt mà giữa mép phải và chính giữa */}
        <motion.button
          layout
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center shrink-0 active:scale-95 ${
            isCollapsed
              ? 'w-11 h-11 bg-slate-100 dark:bg-slate-700/60 hover:bg-blue-600 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white shadow-2xs hover:shadow-md'
              : 'p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/60'
          }`}
          title={isCollapsed ? 'Mở rộng sidebar (Ctrl+B)' : 'Thu gọn sidebar (Ctrl+B)'}
          aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* 2. Menu Navigation */}
      <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* KHỐI 1: TỔNG QUAN & HỆ THỐNG */}
        {renderSectionHeader('Tổng quan & Hệ thống')}
        {renderNavItem('/admin/dashboard', LayoutDashboard, 'Dashboard')}
        {renderNavItem('/admin/users', Users, 'Người dùng')}
        {renderNavItem('/admin/feedback', MessageSquare, 'Phản hồi')}

        {/* KHỐI 2: CỔNG COOKINGBOY */}
        {renderSectionHeader(
          'Cổng CookingBoy',
          'Ẩm thực',
          'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
        )}
        {renderNavItem('/admin/approvals', CheckCircle, 'Duyệt bài công thức', pendingCount)}
        {renderNavItem('/admin/recipes', Utensils, 'Quản lý công thức')}
        {renderNavItem('/admin/blogs', FileText, 'Blog ẩm thực')}
        {renderNavItem('/admin/comments', MessageCircle, 'Bình luận')}

        {/* KHỐI 3: CỬA HÀNG KITCHENCOOK */}
        {renderSectionHeader(
          'Cửa hàng KitchenCook',
          'Đồ bếp',
          'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
        )}
        {renderNavItem('/admin/market-products', ShoppingBag, 'Đồ bếp & Quản lý kho')}
        {renderNavItem('/admin/market-orders', ClipboardList, 'Đơn hàng')}
        {renderNavItem('/admin/messages', Headphones, 'Tin nhắn CSKH')}
        {renderNavItem('/admin/categories', FolderTree, 'Danh mục sản phẩm')}
      </nav>

      {/* 3. Footer */}
      <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 space-y-2 shrink-0 transition-colors duration-200">
        {/* User profile */}
        <div
          className="w-full h-11 flex items-center rounded-xl overflow-hidden group select-none"
          title="Admin - Tổng quản trị hệ thống"
        >
          <div className="w-11 h-11 shrink-0 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm shadow-xs">
              A
            </div>
          </div>
          <div
            className="flex-1 overflow-hidden whitespace-nowrap pl-1 pr-2 min-w-0 transition-all duration-200 ease-out"
            style={{
              opacity: isCollapsed ? 0 : 1,
              transform: isCollapsed ? 'translateX(-10px)' : 'translateX(0)',
              pointerEvents: isCollapsed ? 'none' : 'auto',
            }}
          >
            <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">Admin</p>
            <p className="text-[11px] text-slate-400 font-medium truncate">Tổng quản trị hệ thống</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          className="relative w-full h-11 flex items-center rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150 shadow-2xs cursor-pointer overflow-hidden group select-none"
          title={isCollapsed ? 'Đăng xuất' : undefined}
        >
          <div className="w-11 h-11 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
            <LogOut className="h-4 w-4" />
          </div>
          <div
            className="flex-1 overflow-hidden whitespace-nowrap text-left pr-3 transition-all duration-200 ease-out"
            style={{
              opacity: isCollapsed ? 0 : 1,
              transform: isCollapsed ? 'translateX(-10px)' : 'translateX(0)',
              pointerEvents: isCollapsed ? 'none' : 'auto',
            }}
          >
            <span className="text-xs font-bold">Đăng xuất</span>
          </div>
        </button>
      </div>
    </motion.aside>
  );
}
