import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, BookOpen, PenTool, Bookmark, Activity, Settings, Camera, LogOut, CheckCircle, X } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiFetch, apiJson, resetCsrfCache } from '../../lib/api';
import { notifyAuthChanged } from '../../lib/authEvents';
import { HeroEnter, Reveal } from '../../components/motion/ScrollReveal';

interface ProfileUser {
  full_name: string;
  email: string;
  avatar: string | null;
  bio: string;
}

interface ProfileStats {
  recipe_count: number;
  post_count: number;
  recipe_views_sum: number;
}

function formatStatNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`.replace(/\.0M$/, 'M');
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`.replace(/\.0k$/, 'k');
  return String(Math.round(n));
}

export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recipes');
  const [showSuccessMenu, setShowSuccessMenu] = useState(false);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await apiJson<{
        authenticated: boolean;
        user?: { full_name: string; email: string; bio?: string | null; avatar_url?: string | null };
        stats?: ProfileStats;
      }>('/api/auth/me');
      if (me.authenticated && me.user) {
        setUser({
          full_name: me.user.full_name,
          email: me.user.email,
          bio: me.user.bio ?? '',
          avatar: me.user.avatar_url ?? null,
        });
        setStats(
          me.stats ?? { recipe_count: 0, post_count: 0, recipe_views_sum: 0 }
        );
      } else {
        setUser(null);
        setStats(null);
      }
    } catch {
      setUser(null);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (!isLoading && user === null) {
      navigate('/', { replace: true });
    }
  }, [isLoading, user, navigate]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* vẫn thoát UI */
    }
    resetCsrfCache();
    notifyAuthChanged();
    setUser(null);
    setStats(null);
    navigate('/', { replace: true });
  };

  const tabs = [
    { id: 'recipes', label: 'Công thức của tôi', icon: BookOpen },
    { id: 'posts', label: 'Bài viết của tôi', icon: PenTool },
    { id: 'saved', label: 'Đã lưu', icon: Bookmark },
    { id: 'health', label: 'Kế hoạch', icon: Activity },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  if (!isLoading && user === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24 overflow-x-hidden">
      {/* Profile Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm pt-24 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {!isLoading && user ? (
          <HeroEnter>
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full cursor-pointer hover:bg-gray-800 transition-colors shadow-lg shadow-black/20 group-hover:scale-110">
                <Camera className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" />
              </label>
            </div>

            <div className="flex-1 pb-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{user.full_name}</h1>
              <p className="text-gray-500 mb-2">{user.email}</p>
              <p className="text-gray-600 max-w-lg">{user.bio}</p>
            </div>

            <div className="flex gap-4 pb-2">
              <div className="text-center px-4">
                <div className="text-2xl font-bold text-black">{formatStatNumber(stats?.recipe_count ?? 0)}</div>
                <div className="text-sm text-gray-500 font-medium">Công thức</div>
              </div>
              <div className="text-center px-4 border-l border-r border-gray-200">
                <div className="text-2xl font-bold text-black">{formatStatNumber(stats?.post_count ?? 0)}</div>
                <div className="text-sm text-gray-500 font-medium">Bài viết</div>
              </div>
              <div className="text-center px-4">
                <div className="text-2xl font-bold text-black">{formatStatNumber(stats?.recipe_views_sum ?? 0)}</div>
                <div className="text-sm text-gray-500 font-medium">Lượt xem CT</div>
              </div>
            </div>
          </div>
          </HeroEnter>
          ) : (
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                <Skeleton className="w-full h-full rounded-full" />
              </div>
            </div>
            <div className="flex-1 pb-2 w-full">
              <Skeleton className="h-8 w-48 mx-auto md:mx-0 mb-2" />
              <Skeleton className="h-5 w-32 mx-auto md:mx-0 mb-3" />
              <Skeleton className="h-5 w-64 mx-auto md:mx-0" />
            </div>
            <div className="flex gap-4 pb-2">
              <div className="px-4"><Skeleton className="h-8 w-12 mb-1 mx-auto" /><Skeleton className="h-4 w-16 mx-auto" /></div>
              <div className="px-4 border-l border-r border-gray-200"><Skeleton className="h-8 w-12 mb-1 mx-auto" /><Skeleton className="h-4 w-16 mx-auto" /></div>
              <div className="px-4"><Skeleton className="h-8 w-12 mb-1 mx-auto" /><Skeleton className="h-4 w-16 mx-auto" /></div>
            </div>
          </div>
          )}
        </div>
      </div>

      <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" y={22}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 p-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto">
              <nav className="space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                        activeTab === tab.id 
                        ? 'bg-black text-white shadow-md' 
                        : 'text-gray-600 hover:bg-white hover:text-black hover:shadow-sm'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
                <hr className="my-2 border-gray-100" />
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  Đăng xuất
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {showSuccessMenu && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg shadow-sm mb-6 flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                  <span className="font-medium">Cập nhật thành công!</span>
                </div>
                <button onClick={() => setShowSuccessMenu(false)} className="text-green-600 hover:text-green-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 p-6 min-h-[500px]">
              <Reveal key={activeTab} y={14}>
              {activeTab === 'recipes' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Công thức của tôi</h2>
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    Chưa có công thức nào được đăng.
                  </div>
                </div>
              )}
              {activeTab === 'posts' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Bài viết của tôi</h2>
                  <div className="text-center py-12 text-gray-500">
                    <PenTool className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    Chưa có bài viết nào được đăng.
                  </div>
                </div>
              )}
              {activeTab === 'saved' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Công thức đã lưu</h2>
                  <div className="text-center py-12 text-gray-500">
                    <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    Bạn chưa lưu công thức nào.
                  </div>
                </div>
              )}
              {activeTab === 'health' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Kế hoạch ăn uống</h2>
                  <div className="text-center py-12 text-gray-500">
                    <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    Bạn chưa tạo kế hoạch nào.
                  </div>
                </div>
              )}
              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Cài đặt tài khoản</h2>
                  {isLoading ? (
                     <div className="space-y-6 max-w-lg">
                       <div><Skeleton className="h-5 w-24 mb-2"/><Skeleton className="h-10 w-full rounded-lg"/></div>
                       <div><Skeleton className="h-5 w-24 mb-2"/><Skeleton className="h-10 w-full rounded-lg"/></div>
                       <div><Skeleton className="h-5 w-24 mb-2"/><Skeleton className="h-24 w-full rounded-lg"/></div>
                       <Skeleton className="h-10 w-32 rounded-lg" />
                     </div>
                  ) : (
                    <form className="space-y-6 max-w-lg" onSubmit={(e) => { e.preventDefault(); setShowSuccessMenu(true); }}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
                        <input type="text" defaultValue={user?.full_name} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-black focus:ring-0" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" defaultValue={user?.email} disabled className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tiểu sử</label>
                        <textarea defaultValue={user?.bio} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-black focus:ring-0"></textarea>
                      </div>
                      <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800">Cập nhật hồ sơ</button>
                    </form>
                  )}
                </div>
              )}
              </Reveal>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
