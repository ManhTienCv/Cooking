import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, PenTool, Bookmark, Activity, Settings, CheckCircle, X } from 'lucide-react';
import { apiFetch, apiJson, resetCsrfCache } from '../../lib/api';
import { notifyAuthChanged } from '../../lib/authEvents';
import { Reveal } from '../../components/motion/ScrollReveal';

import type { ProfileUser, ProfileStats, ProfileRecipe, ProfilePost, ProfilePlan } from '../../components/profile/types';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileSidebar from '../../components/profile/ProfileSidebar';
import ProfileSettingsForm from '../../components/profile/ProfileSettingsForm';

export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recipes');
  const [showSuccessMenu, setShowSuccessMenu] = useState(false);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // States for tabs data
  const [myRecipes, setMyRecipes] = useState<ProfileRecipe[]>([]);
  const [myPosts, setMyPosts] = useState<ProfilePost[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<ProfileRecipe[]>([]);
  const [myPlans, setMyPlans] = useState<ProfilePlan[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const loadTabData = useCallback(async (tab: string) => {
    setIsDataLoading(true);
    try {
      if (tab === 'recipes') {
        const d = await apiJson<{ recipes: ProfileRecipe[] }>('/api/recipes/mine');
        setMyRecipes(d.recipes ?? []);
      } else if (tab === 'posts') {
        const d = await apiJson<{ posts: ProfilePost[] }>('/api/blog/posts/mine');
        setMyPosts(d.posts ?? []);
      } else if (tab === 'saved') {
        const d = await apiJson<{ recipes: ProfileRecipe[] }>('/api/recipes/saved');
        setSavedRecipes(d.recipes ?? []);
      } else if (tab === 'health') {
        const d = await apiJson<{ plans: ProfilePlan[] }>('/api/health/plans');
        setMyPlans(d.plans ?? []);
      }
    } catch {
      // ignore
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && activeTab !== 'settings') {
      void loadTabData(activeTab);
    }
  }, [activeTab, user, loadTabData]);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300 pb-24 overflow-x-hidden">
      <ProfileHeader isLoading={isLoading} user={user} stats={stats} />

      <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" y={22}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ProfileSidebar 
              tabs={tabs} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              onLogout={() => void handleLogout()} 
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {showSuccessMenu && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-6 py-4 rounded-lg shadow-sm mb-6 flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                  <span className="font-medium">Cập nhật thành công!</span>
                </div>
                <button onClick={() => setShowSuccessMenu(false)} className="text-green-600 hover:text-green-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/20 p-6 min-h-[500px]">
              <Reveal key={activeTab} y={14}>
              {activeTab === 'recipes' && (
                <div>
                  <h2 className="text-2xl font-serif font-bold mb-6 dark:text-white">Công thức của tôi</h2>
                  {isDataLoading ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">Đang tải...</div>
                  ) : myRecipes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                      Chưa có công thức nào được đăng.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {myRecipes.map((r) => (
                        <div key={r.id} className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow group bg-white dark:bg-slate-800">
                          {r.image_url ? (
                            <img src={r.image_url} alt={r.title} className="w-full h-40 object-cover" />
                          ) : (
                            <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                              <BookOpen className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{r.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.category_name}</p>
                            <Link to={`/recipes/detail/${r.id}`} className="text-yellow-600 dark:text-yellow-500 text-sm mt-3 inline-block font-medium hover:text-yellow-700 dark:hover:text-yellow-400">Xem chi tiết &rarr;</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'posts' && (
                <div>
                  <h2 className="text-2xl font-serif font-bold mb-6 dark:text-white">Bài viết của tôi</h2>
                  {isDataLoading ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">Đang tải...</div>
                  ) : myPosts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <PenTool className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                      Chưa có bài viết nào được đăng.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {myPosts.map((p) => (
                        <div key={p.id} className="border border-gray-100 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
                          <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-500">{p.category_name}</span>
                          <h4 className="font-bold text-gray-900 dark:text-white mt-1 text-lg line-clamp-2">{p.title}</h4>
                          <Link to={`/blog/detail/${p.id}`} className="text-yellow-600 dark:text-yellow-500 text-sm mt-3 inline-block font-medium hover:text-yellow-700 dark:hover:text-yellow-400">Đọc bài &rarr;</Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'saved' && (
                <div>
                  <h2 className="text-2xl font-serif font-bold mb-6 dark:text-white">Công thức đã lưu</h2>
                  {isDataLoading ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">Đang tải...</div>
                  ) : savedRecipes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                      Bạn chưa lưu công thức nào.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedRecipes.map((r) => (
                        <div key={r.id} className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
                          {r.image_url ? (
                            <img src={r.image_url} alt={r.title} className="w-full h-40 object-cover" />
                          ) : (
                            <div className="w-full h-40 bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                              <BookOpen className="w-8 h-8 text-gray-300 dark:text-slate-500" />
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{r.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.category_name}</p>
                            <Link to={`/recipes/detail/${r.id}`} className="text-yellow-600 dark:text-yellow-500 text-sm mt-3 inline-block font-medium hover:text-yellow-700 dark:hover:text-yellow-400">Xem chi tiết &rarr;</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'health' && (
                <div>
                  <h2 className="text-2xl font-serif font-bold mb-6 dark:text-white">Kế hoạch ăn uống</h2>
                  {isDataLoading ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">Đang tải...</div>
                  ) : myPlans.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                      Bạn chưa tạo kế hoạch nào.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myPlans.map((plan) => (
                         <div key={plan.id} className="border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow bg-gray-50/50 dark:bg-slate-800/50">
                           <div>
                             <h4 className="font-bold text-gray-900 dark:text-white">{plan.name}</h4>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.start_date && plan.end_date ? `${plan.start_date.slice(0,10)} → ${plan.end_date.slice(0,10)}` : ''}</p>
                           </div>
                           <Link to={`/health/detail/${plan.id}`} className="bg-white dark:bg-slate-700 text-black dark:text-white px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">Chi tiết</Link>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'settings' && (
                <ProfileSettingsForm isLoading={isLoading} user={user} onSuccessSubmit={() => setShowSuccessMenu(true)} />
              )}
              </Reveal>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
