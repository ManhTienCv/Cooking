import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChefHat, Menu, LogOut, Moon, Sun, ShoppingCart, Store, MessageCircle } from 'lucide-react';
import AuthModal from './AuthModal';
import { apiFetch, apiJson, resetCsrfCache } from '../lib/api';
import { AUTH_CHANGE_EVENT, notifyAuthChanged } from '../lib/authEvents';
import { scrollWindowToTop } from '../lib/scroll';
import { useTheme } from '../hooks/useTheme';
import { useCart } from '../contexts/CartContext';

type MeState =
  | { authenticated: false; user?: never }
  | {
      authenticated: true;
      user: {
        id: number;
        full_name: string;
        email: string;
        avatar_url: string | null;
        bio: string | null;
      };
    };

type MessageConversationSummary = {
  unread_count?: number;
};

const NAV_ITEMS = [
  { path: '/', label: 'Trang chủ' },
  { path: '/recipes', label: 'Công thức' },
  { path: '/shop', label: 'Cửa hàng' },
  { path: '/blog', label: 'Diễn đàn' },
  { path: '/health', label: 'Sức khỏe' },
  { path: '/about', label: 'Về chúng tôi' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialSignUp, setAuthInitialSignUp] = useState(false);
  const [me, setMe] = useState<MeState | null>(null);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const { isDark, toggleTheme } = useTheme();
  const { count: cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname;

  const refreshMe = useCallback(async () => {
    try {
      const data = await apiJson<MeState>('/api/auth/me');
      setMe(data);
    } catch {
      setMe({ authenticated: false });
    }
  }, []);

  const loadMessageUnread = useCallback(async () => {
    if (!me?.authenticated) {
      setMessageUnreadCount(0);
      return;
    }
    try {
      const data = await apiJson<{ conversations: MessageConversationSummary[] }>('/api/messages/conversations');
      const total = (data.conversations ?? []).reduce(
        (sum, c) => sum + Number(c.unread_count ?? 0),
        0
      );
      setMessageUnreadCount(total);
    } catch {
      setMessageUnreadCount(0);
    }
  }, [me?.authenticated]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (me?.authenticated) {
      void loadMessageUnread();
      return;
    }
    setMessageUnreadCount(0);
  }, [me, loadMessageUnread]);

  useEffect(() => {
    const onAuth = () => void refreshMe();
    window.addEventListener(AUTH_CHANGE_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuth);
  }, [refreshMe]);

  useEffect(() => {
    if (!me?.authenticated) return;

    const es = new EventSource('/api/messages/stream', { withCredentials: true });
    const refresh = () => void loadMessageUnread();

    const onRead = () => void loadMessageUnread();
    window.addEventListener('messages:read', onRead);

    es.addEventListener('message', refresh);
    es.addEventListener('ready', refresh);

    return () => {
      window.removeEventListener('messages:read', onRead);
      es.removeEventListener('message', refresh);
      es.removeEventListener('ready', refresh);
      es.close();
    };
  }, [me?.authenticated, loadMessageUnread]);

  const openLogin = () => {
    setAuthInitialSignUp(false);
    setIsAuthOpen(true);
  };

  const openSignUp = () => {
    setAuthInitialSignUp(true);
    setIsAuthOpen(true);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* still clear local UI */
    }
    resetCsrfCache();
    setMe({ authenticated: false });
    setMessageUnreadCount(0);
    notifyAuthChanged();
    setIsMenuOpen(false);
    if (location.pathname.startsWith('/profile')) {
      navigate('/', { replace: true });
    }
  };

  const userInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <nav id="navbar" className="fixed w-full top-0 z-50 transition-all duration-300 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" onClick={() => scrollWindowToTop()} className="flex items-center space-x-2 group">
              <div className="bg-black dark:bg-white p-2 rounded-full group-hover:scale-110 transition-transform duration-300">
                <ChefHat className="h-6 w-6 text-white dark:text-black" />
              </div>
              <span id="brandText" className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">CookingBoy</span>
            </Link>
            <div className="hidden md:block">
              <div className="flex items-center space-x-2">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.path === '/' ? currentPage === '/' : currentPage.startsWith(item.path);
                  return (
                    <Link 
                      key={item.path}
                      to={item.path} 
                      onClick={() => scrollWindowToTop()} 
                      className={`relative px-4 py-2 text-sm transition-colors duration-300 rounded-full font-medium ${isActive ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill-desktop"
                          className="absolute inset-0 rounded-full bg-black dark:bg-white shadow-md border border-gray-800 dark:border-gray-200"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                          style={{ zIndex: -1 }}
                        />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Cart badge */}
              <Link
                to="/cart"
                onClick={() => scrollWindowToTop()}
                className="relative p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-300"
                aria-label="Giỏ hàng"
                title="Giỏ hàng"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1 shadow-sm">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Seller link - next to cart */}
              {me?.authenticated && (
                <>
                  <Link
                    to="/messages"
                    onClick={() => scrollWindowToTop()}
                    className="relative p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-300"
                    aria-label="Tin nhắn"
                    title="Tin nhắn"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {messageUnreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1 shadow-sm">
                        {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/seller"
                    onClick={() => scrollWindowToTop()}
                    className="relative p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-colors duration-300"
                    aria-label="Kênh bán hàng"
                    title="Kênh bán hàng"
                  >
                    <Store className="w-5 h-5" />
                  </Link>
                </>
              )}

              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-300"
                aria-label="Chuyển chế độ sáng tối"
                title="Chuyển chế độ sáng tối"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <div className="hidden md:flex items-center space-x-2">
                {me === null ? (
                  <span className="inline-block w-40 h-9 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse" aria-hidden />
                ) : me.authenticated ? (
                  <>
                    <Link
                      data-testid="nav-profile-link"
                      to="/profile"
                      onClick={() => scrollWindowToTop()}
                      className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 bg-white/90 border border-gray-200 hover:bg-white transition-colors"
                      title={me.user.full_name}
                    >
                      {me.user.avatar_url ? (
                        <img src={me.user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <span className="w-9 h-9 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                          {userInitials(me.user.full_name)}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-900 max-w-[8rem] truncate">{me.user.full_name}</span>
                    </Link>
                    <button
                      data-testid="nav-logout-button"
                      type="button"
                      onClick={() => void handleLogout()}
                      className="btn btn-enhanced p-2 rounded-full text-sm bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-all"
                      title="Đăng xuất"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button data-testid="nav-login-button" onClick={openLogin} className="btn btn-enhanced px-4 py-2 rounded-full text-sm font-semibold bg-black text-white hover:bg-gray-800 transition-all duration-300">Đăng nhập</button>
                    <button data-testid="nav-signup-button" onClick={openSignUp} className="btn btn-enhanced px-4 py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-gray-100 border border-gray-300 transition-all duration-300">Đăng ký</button>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-full text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-300"
                aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
                title={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
          {/* Mobile menu */}
          <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[30rem] opacity-100 mt-2 pb-4' : 'max-h-0 opacity-0 pointer-events-none'}`}>
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-slate-900 shadow-xl border border-gray-100 dark:border-slate-800 rounded-lg relative z-50">
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.path === '/' ? currentPage === '/' : currentPage.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => { scrollWindowToTop(); setIsMenuOpen(false); }}
                      className={`relative isolate mobile-menu-item ${isMenuOpen ? 'show' : ''} block px-3 py-2 rounded-md font-medium text-base transition-colors duration-300 ${isActive ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill-mobile"
                          className="absolute inset-0 rounded-md bg-black dark:bg-white shadow-md border border-gray-800 dark:border-gray-200"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                          style={{ zIndex: -1 }}
                        />
                      )}
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                {me === null ? (
                  <div className="px-3 py-2 text-sm text-gray-400">Đang tải…</div>
                ) : me.authenticated ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => { scrollWindowToTop(); setIsMenuOpen(false); }}
                      className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-gray-50`}
                    >
                      {me.user.avatar_url ? (
                        <img src={me.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                          {userInitials(me.user.full_name)}
                        </span>
                      )}
                      {me.user.full_name}
                    </Link>
                    <Link
                      to="/seller"
                      onClick={() => { scrollWindowToTop(); setIsMenuOpen(false); }}
                      className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20`}
                    >
                      <Store className="w-5 h-5" /> Kênh bán hàng
                    </Link>
                    <Link
                      to="/messages"
                      onClick={() => { scrollWindowToTop(); setIsMenuOpen(false); }}
                      className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800`}
                    >
                      <MessageCircle className="w-5 h-5" /> Tin nhắn
                      {messageUnreadCount > 0 && (
                        <span className="ml-auto inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50`}
                    >
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { openLogin(); setIsMenuOpen(false); }} className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50`}>Đăng nhập</button>
                    <button onClick={() => { openSignUp(); setIsMenuOpen(false); }} className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50`}>Đăng ký</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => void refreshMe()}
        initialSignUp={authInitialSignUp}
      />
    </>
  );
}
