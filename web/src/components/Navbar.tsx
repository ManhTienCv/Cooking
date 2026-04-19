import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, Menu, LogOut } from 'lucide-react';
import AuthModal from './AuthModal';
import { apiFetch, apiJson, resetCsrfCache } from '../lib/api';
import { AUTH_CHANGE_EVENT, notifyAuthChanged } from '../lib/authEvents';
import { scrollWindowToTop } from '../lib/scroll';

type MeState =
  | { authenticated: false }
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

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialSignUp, setAuthInitialSignUp] = useState(false);
  const [me, setMe] = useState<MeState | null>(null);
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

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    const onAuth = () => void refreshMe();
    window.addEventListener(AUTH_CHANGE_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuth);
  }, [refreshMe]);

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
      <nav id="navbar" className="fixed w-full top-0 z-50 transition-all duration-300 navbar--dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" onClick={() => scrollWindowToTop()} className="flex items-center space-x-2 group">
              <div className="bg-black p-2 rounded-full group-hover:scale-110 transition-transform duration-300">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <span id="brandText" className="text-xl font-bold text-white transition-colors duration-300">CookingBoy</span>
            </Link>
            <div className="hidden md:block">
              <div className="flex items-center space-x-8">
                <Link to="/" onClick={() => scrollWindowToTop()} className={`nav-link px-3 py-4 text-sm font-medium transition-colors duration-300 ${currentPage === '/' ? 'active text-black' : 'text-gray-600 hover:text-black'}`}>Trang chủ</Link>
                <Link to="/recipes" onClick={() => scrollWindowToTop()} className={`nav-link px-3 py-4 text-sm font-medium transition-colors duration-300 ${currentPage.startsWith('/recipes') ? 'active text-black' : 'text-gray-600 hover:text-black'}`}>Công thức</Link>
                <Link to="/blog" onClick={() => scrollWindowToTop()} className={`nav-link px-3 py-4 text-sm font-medium transition-colors duration-300 ${currentPage.startsWith('/blog') ? 'active text-black' : 'text-gray-600 hover:text-black'}`}>Diễn đàn</Link>
                <Link to="/health" onClick={() => scrollWindowToTop()} className={`nav-link px-3 py-4 text-sm font-medium transition-colors duration-300 ${currentPage.startsWith('/health') ? 'active text-black' : 'text-gray-600 hover:text-black'}`}>Sức khỏe</Link>
                <Link to="/about" onClick={() => scrollWindowToTop()} className={`nav-link px-3 py-4 text-sm font-medium transition-colors duration-300 ${currentPage.startsWith('/about') ? 'active text-black' : 'text-gray-600 hover:text-black'}`}>Về chúng tôi</Link>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-2">
                {me === null ? (
                  <span className="inline-block w-40 h-9 rounded-full bg-white/40 animate-pulse" aria-hidden />
                ) : me.authenticated ? (
                  <>
                    <Link
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
                    <button onClick={openLogin} className="btn btn-enhanced px-4 py-2 rounded-full text-sm font-semibold bg-black text-white hover:bg-gray-800 transition-all duration-300">Đăng nhập</button>
                    <button onClick={openSignUp} className="btn btn-enhanced px-4 py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-gray-100 border border-gray-300 transition-all duration-300">Đăng ký</button>
                  </>
                )}
              </div>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-full text-gray-800 hover:text-black hover:bg-gray-100 transition-all duration-300">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
          {/* Mobile menu */}
          <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[30rem] opacity-100 mt-2 pb-4' : 'max-h-0 opacity-0 pointer-events-none'}`}>
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white shadow-xl border border-gray-100 rounded-lg relative z-50">
              <Link to="/" onClick={() => { scrollWindowToTop(); setIsMenuOpen(false); }} className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} block px-3 py-2 rounded-md text-base font-medium ${currentPage === '/' ? 'active' : 'text-gray-600 hover:text-black hover:bg-gray-50'}`}>Trang chủ</Link>
              <Link to="/recipes" onClick={() => { scrollWindowToTop(); setIsMenuOpen(false); }} className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} block px-3 py-2 rounded-md text-base font-medium ${currentPage.startsWith('/recipes') ? 'active' : 'text-gray-600 hover:text-black hover:bg-gray-50'}`}>Công thức</Link>
              <Link to="/blog" onClick={() => { scrollWindowToTop(); setIsMenuOpen(false); }} className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} block px-3 py-2 rounded-md text-base font-medium ${currentPage.startsWith('/blog') ? 'active' : 'text-gray-600 hover:text-black hover:bg-gray-50'}`}>Diễn đàn</Link>
              <Link to="/health" onClick={() => { scrollWindowToTop(); setIsMenuOpen(false); }} className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} block px-3 py-2 rounded-md text-base font-medium ${currentPage.startsWith('/health') ? 'active' : 'text-gray-600 hover:text-black hover:bg-gray-50'}`}>Sức khỏe</Link>
              <Link to="/about" onClick={() => { scrollWindowToTop(); setIsMenuOpen(false); }} className={`mobile-menu-item ${isMenuOpen ? 'show' : ''} block px-3 py-2 rounded-md text-base font-medium ${currentPage.startsWith('/about') ? 'active' : 'text-gray-600 hover:text-black hover:bg-gray-50'}`}>Về chúng tôi</Link>

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
