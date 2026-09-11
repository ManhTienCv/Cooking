import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChefHat, Home, ShoppingBag, Search, Package, User, LogOut, Sun, Moon } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../hooks/useTheme';
import { apiJson, apiFetch, resetCsrfCache } from '../../lib/api';
import { AUTH_CHANGE_EVENT, getAuthChangeDetail, notifyAuthChanged } from '../../lib/authEvents';
import KitchenCookAuthModal from './KitchenCookAuthModal';
import toast from 'react-hot-toast';

interface MeState {
  authenticated: boolean;
  user?: {
    id: number;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export default function KitchenCookNavbar() {
  const { count: cartCount } = useCart();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [me, setMe] = useState<MeState>({ authenticated: false });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Tự động đóng menu profile khi bấm ra ngoài hoặc nhấn ESC
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu]);

  const refreshMe = useCallback(async () => {
    try {
      const data = await apiJson<MeState>('/api/auth/me');
      setMe(data);
    } catch {
      setMe({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    const onAuth = (event: Event) => {
      const detail = getAuthChangeDetail(event);
      if (detail.authenticated === false) {
        setMe({ authenticated: false });
        return;
      }
      void refreshMe();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuth);
  }, [refreshMe]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchVal.trim();
    if (trimmed) {
      navigate(`/shop/products?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/shop/products');
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      resetCsrfCache();
      notifyAuthChanged({ authenticated: false });
      setShowUserMenu(false);
      toast.success('Đã đăng xuất');
    } catch {
      toast.error('Lỗi khi đăng xuất');
    }
  };

  const isHomeActive = location.pathname === '/shop';
  const isProductsActive = location.pathname.startsWith('/shop/products') || (location.pathname.startsWith('/shop/') && location.pathname !== '/shop');
  const isOrdersActive = location.pathname.startsWith('/orders');
  const isAccountActive = location.pathname.startsWith('/account');

  return (
    <>
      <header className="w-full bg-[#FAF7F2] dark:bg-slate-900 border-b border-stone-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-300 font-vietnam">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-4.5">
          <div className="flex items-center justify-between gap-4 sm:gap-6 flex-wrap lg:flex-nowrap">
            {/* Nhóm Trái: Logo + Cụm Điều Hướng Dạng Viên Thuốc (Pill) chuẩn theo ảnh mẫu */}
            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              {/* Logo Thương hiệu KitchenCook */}
              <Link to="/shop" className="flex items-center gap-3 group shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <ChefHat className="w-6.5 h-6.5" />
                </div>
                <span className="font-vietnam font-black text-2xl tracking-tight text-slate-900 dark:text-white leading-tight">
                  Kitchen<span className="text-stone-500 dark:text-stone-400">Cook</span>
                </span>
              </Link>

              {/* Cụm Điều hướng Dạng Viên Thuốc (Pill Navigation) */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/shop"
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    isHomeActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'bg-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-white/10'
                  }`}
                  title="Trang chủ KitchenCook"
                >
                  <Home className="w-4 h-4" />
                  <span>Trang chủ</span>
                </Link>
                <Link
                  to="/shop/products"
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    isProductsActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'bg-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-white/10'
                  }`}
                  title="Xem tất cả sản phẩm KitchenCook"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Sản phẩm</span>
                </Link>
              </div>
            </div>

            {/* Giữa: Thanh Tìm Kiếm Dạng Viên Thuốc */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md lg:max-w-lg min-w-[200px] order-last lg:order-none w-full lg:w-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Tìm kiếm nồi niêu, xoong chảo, dao kéo..."
                  className="w-full pl-11 pr-4 py-2.5 sm:py-3 text-sm bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-full focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white text-slate-900 dark:text-white placeholder-slate-400 shadow-xs"
                />
              </div>
            </form>

            {/* Phải: Cụm Tiện Ích (Theme, Cart Tròn với Badge, Orders, Auth) */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-11 h-11 rounded-full bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs cursor-pointer"
                title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              >
                {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
              </button>

              {/* Nút Giỏ Hàng Tròn Chuẩn Theo Ảnh Mẫu (Shopping Bag with Top-Right Badge) */}
              <Link
                to="/cart"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 flex items-center justify-center relative transition-all shadow-xs"
                title="Giỏ hàng KitchenCook"
              >
                <ShoppingBag className="w-5 h-5" />
                <span
                  className={`absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full text-[11px] font-bold flex items-center justify-center px-1 shadow-sm ${
                    cartCount > 0
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-stone-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </Link>

              {/* Nút Đơn Hàng */}
              <Link
                to="/orders"
                className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all shadow-xs ${
                  isOrdersActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Quản lý & tra cứu đơn mua hàng"
              >
                <Package className="w-4 h-4" />
                <span>Đơn hàng</span>
              </Link>

              {/* Nút Tài Khoản / Đăng Nhập (Chuẩn màu be-trắng thanh lịch) */}
              {me.authenticated && me.user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center gap-2.5 p-1.5 pl-2.5 pr-3.5 rounded-full border transition-colors shadow-xs cursor-pointer ${
                      isAccountActive
                        ? 'border-slate-900 bg-stone-100 dark:bg-slate-800'
                        : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400'
                    }`}
                  >
                    {me.user.avatar_url ? (
                      <img
                        src={me.user.avatar_url}
                        alt={me.user.full_name}
                        className="w-7 h-7 rounded-full object-cover border border-stone-300"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold">
                        {me.user.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 max-w-[90px] truncate hidden lg:inline">
                      {me.user.full_name}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-700 py-2 z-50 text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{me.user.full_name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{me.user.email}</p>
                      </div>
                      <Link
                        to="/account"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700/50"
                      >
                        <User className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                        Tài khoản & Sổ địa chỉ
                      </Link>
                      <Link
                        to="/"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700/60"
                      >
                        <ChefHat className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                        Cổng Công thức (CookingBoy)
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-left border-t border-slate-100 dark:border-slate-700/60 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  <User className="w-4.5 h-4.5" />
                  <span>Đăng Nhập</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* KitchenCook Auth Modal */}
      <KitchenCookAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAuthOpen(false);
          void refreshMe();
        }}
      />
    </>
  );
}
