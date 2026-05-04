import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, BookOpen, Bookmark, CheckCircle, PenTool, Settings, X, Edit, Trash2 } from 'lucide-react';
import { apiFetch, apiJson, resetCsrfCache } from '../../lib/api';
import { notifyAuthChanged } from '../../lib/authEvents';
import { Reveal } from '../../components/motion/ScrollReveal';
import Pagination from '../../components/ui/Pagination';

import type { ProfileUser, ProfileStats, ProfileRecipe, ProfilePost, ProfilePlan } from '../../components/profile/types';
import type { BlogCategory } from '../../components/blog/types';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileSidebar from '../../components/profile/ProfileSidebar';
import ProfileSettingsForm from '../../components/profile/ProfileSettingsForm';
import EditPostModal from '../../components/blog/EditPostModal';

const PROFILE_PAGE_SIZE = 6;
type PagedTab = 'recipes' | 'posts' | 'saved';

export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recipes');
  const [showSuccessMenu, setShowSuccessMenu] = useState(false);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [myRecipes, setMyRecipes] = useState<ProfileRecipe[]>([]);
  const [myPosts, setMyPosts] = useState<ProfilePost[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<ProfileRecipe[]>([]);
  const [myPlans, setMyPlans] = useState<ProfilePlan[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [pageByTab, setPageByTab] = useState<Record<PagedTab, number>>({ recipes: 1, posts: 1, saved: 1 });
  const [totalByTab, setTotalByTab] = useState<Record<PagedTab, number>>({ recipes: 0, posts: 0, saved: 0 });

  // Edit post modal
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);

  const loadTabData = useCallback(async (tab: string) => {
    const getPageQuery = (pagedTab: PagedTab) => {
      const q = new URLSearchParams();
      q.set('limit', String(PROFILE_PAGE_SIZE));
      q.set('offset', String((pageByTab[pagedTab] - 1) * PROFILE_PAGE_SIZE));
      return q.toString();
    };

    setIsDataLoading(true);
    try {
      if (tab === 'recipes') {
        const d = await apiJson<{ recipes: ProfileRecipe[]; total?: number }>(`/api/recipes/mine?${getPageQuery('recipes')}`);
        setMyRecipes(d.recipes ?? []);
        setTotalByTab((prev) => ({ ...prev, recipes: d.total ?? 0 }));
      } else if (tab === 'posts') {
        const d = await apiJson<{ posts: ProfilePost[]; total?: number }>(`/api/blog/posts/mine?${getPageQuery('posts')}`);
        setMyPosts(d.posts ?? []);
        setTotalByTab((prev) => ({ ...prev, posts: d.total ?? 0 }));
      } else if (tab === 'saved') {
        const d = await apiJson<{ recipes: ProfileRecipe[]; total?: number }>(`/api/recipes/saved?${getPageQuery('saved')}`);
        setSavedRecipes(d.recipes ?? []);
        setTotalByTab((prev) => ({ ...prev, saved: d.total ?? 0 }));
      } else if (tab === 'health') {
        const d = await apiJson<{ plans: ProfilePlan[] }>('/api/health/plans');
        setMyPlans(d.plans ?? []);
      }
    } catch {
      if (tab === 'recipes') {
        setMyRecipes([]);
        setTotalByTab((prev) => ({ ...prev, recipes: 0 }));
      } else if (tab === 'posts') {
        setMyPosts([]);
        setTotalByTab((prev) => ({ ...prev, posts: 0 }));
      } else if (tab === 'saved') {
        setSavedRecipes([]);
        setTotalByTab((prev) => ({ ...prev, saved: 0 }));
      }
    } finally {
      setIsDataLoading(false);
    }
  }, [pageByTab]);

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
        setStats(me.stats ?? { recipe_count: 0, post_count: 0, recipe_views_sum: 0 });
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
    // Also fetch blog categories for edit modal
    apiJson<{ categories: BlogCategory[] }>('/api/blog/categories')
      .then(d => setBlogCategories(d.categories ?? []))
      .catch(() => {});
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

  const handleDeleteRecipe = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa công thức này?')) return;
    try {
      await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' });
      void loadTabData('recipes');
    } catch (e) {
      alert('Không thể xóa công thức');
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    try {
      await apiFetch(`/api/blog/posts/${id}`, { method: 'DELETE' });
      void loadTabData('posts');
    } catch (e) {
      alert('Không thể xóa bài viết');
    }
  };

  const handleProfilePageChange = (tab: PagedTab, page: number) => {
    setPageByTab((prev) => ({ ...prev, [tab]: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 to-indigo-50 pb-24 transition-colors duration-300 dark:from-slate-900 dark:to-slate-800">
      <ProfileHeader isLoading={isLoading} user={user} stats={stats} />

      <Reveal className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" y={22}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <ProfileSidebar
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogout={() => void handleLogout()}
            />
          </div>

          <div className="lg:col-span-3">
            {showSuccessMenu && (
              <div className="mb-6 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-6 py-4 text-green-800 shadow-sm dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
                <div className="flex items-center">
                  <CheckCircle className="mr-3 h-6 w-6 text-green-500" />
                  <span className="font-medium">Cập nhật thành công!</span>
                </div>
                <button onClick={() => setShowSuccessMenu(false)} className="text-green-600 transition-colors hover:text-green-800 dark:text-green-300 dark:hover:text-green-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="min-h-[500px] rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
              <Reveal key={activeTab} y={14}>
                {activeTab === 'recipes' && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold font-serif text-gray-950 dark:text-white">Công thức của tôi</h2>
                    {isDataLoading ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">Đang tải...</div>
                    ) : myRecipes.length === 0 ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-slate-600" />
                        Chưa có công thức nào được đăng.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {myRecipes.map((r) => (
                            <div key={r.id} className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                              {r.image_url ? (
                                <img src={r.image_url} alt={r.title} className="h-40 w-full object-cover" />
                              ) : (
                                <div className="flex h-40 w-full items-center justify-center bg-gray-100 dark:bg-slate-700">
                                  <BookOpen className="h-8 w-8 text-gray-300 dark:text-slate-500" />
                                </div>
                              )}
                              <div className="p-4 relative">
                                <h4 className="line-clamp-1 font-bold text-gray-900 dark:text-white pr-16">{r.title}</h4>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{r.category_name}</p>
                                <div className="mt-3 flex items-center justify-between">
                                  <Link to={`/recipes/detail/${r.id}`} className="inline-block text-sm font-medium text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400">
                                    Xem chi tiết &rarr;
                                  </Link>
                                  <div className="flex space-x-2">
                                    <button onClick={() => alert("Tính năng sửa đang được cập nhật!")} className="p-1 text-gray-500 hover:text-blue-600 transition-colors" title="Sửa bài">
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDeleteRecipe(r.id)} className="p-1 text-gray-500 hover:text-red-600 transition-colors" title="Xóa bài">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Pagination currentPage={pageByTab.recipes} totalItems={totalByTab.recipes} pageSize={PROFILE_PAGE_SIZE} onPageChange={(page) => handleProfilePageChange('recipes', page)} />
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'posts' && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold font-serif text-gray-950 dark:text-white">Bài viết của tôi</h2>
                    {isDataLoading ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">Đang tải...</div>
                    ) : myPosts.length === 0 ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        <PenTool className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-slate-600" />
                        Chưa có bài viết nào được đăng.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          {myPosts.map((p) => (
                            <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-500">{p.category_name}</span>
                                <div className="flex space-x-2">
                                  <button onClick={() => setEditingPostId(p.id)} className="p-1 text-gray-500 hover:text-blue-600 transition-colors" title="Sửa bài">
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => handleDeletePost(p.id)} className="p-1 text-gray-500 hover:text-red-600 transition-colors" title="Xóa bài">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <h4 className="mt-1 line-clamp-2 text-lg font-bold text-gray-900 dark:text-white">{p.title}</h4>
                              <Link to={`/blog/detail/${p.id}`} className="mt-3 inline-block text-sm font-medium text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400">
                                Đọc bài &rarr;
                              </Link>
                            </div>
                          ))}
                        </div>
                        <Pagination currentPage={pageByTab.posts} totalItems={totalByTab.posts} pageSize={PROFILE_PAGE_SIZE} onPageChange={(page) => handleProfilePageChange('posts', page)} />
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'saved' && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold font-serif text-gray-950 dark:text-white">Công thức đã lưu</h2>
                    {isDataLoading ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">Đang tải...</div>
                    ) : savedRecipes.length === 0 ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        <Bookmark className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-slate-600" />
                        Bạn chưa lưu công thức nào.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {savedRecipes.map((r) => (
                            <div key={r.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                              {r.image_url ? (
                                <img src={r.image_url} alt={r.title} className="h-40 w-full object-cover" />
                              ) : (
                                <div className="flex h-40 w-full items-center justify-center bg-gray-100 dark:bg-slate-700">
                                  <BookOpen className="h-8 w-8 text-gray-300 dark:text-slate-500" />
                                </div>
                              )}
                              <div className="p-4">
                                <h4 className="line-clamp-1 font-bold text-gray-900 dark:text-white">{r.title}</h4>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{r.category_name}</p>
                                <Link to={`/recipes/detail/${r.id}`} className="mt-3 inline-block text-sm font-medium text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400">
                                  Xem chi tiết &rarr;
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Pagination currentPage={pageByTab.saved} totalItems={totalByTab.saved} pageSize={PROFILE_PAGE_SIZE} onPageChange={(page) => handleProfilePageChange('saved', page)} />
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'health' && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold font-serif text-gray-950 dark:text-white">Kế hoạch ăn uống</h2>
                    {isDataLoading ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">Đang tải...</div>
                    ) : myPlans.length === 0 ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        <Activity className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-slate-600" />
                        Bạn chưa tạo kế hoạch nào.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myPlans.map((plan) => (
                          <div key={plan.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/80 p-5 transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70">
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white">{plan.name}</h4>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {plan.start_date && plan.end_date ? `${plan.start_date.slice(0, 10)} -> ${plan.end_date.slice(0, 10)}` : ''}
                              </p>
                            </div>
                            <Link to={`/health/detail/${plan.id}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">
                              Chi tiết
                            </Link>
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

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={editingPostId !== null}
        postId={editingPostId ?? 0}
        onClose={() => setEditingPostId(null)}
        onSuccess={async () => { await loadTabData('posts'); }}
        categoryOptions={blogCategories}
        modalCategoryOptions={blogCategories.map(c => ({ value: String(c.id), label: c.name, id: c.id, name: c.name }))}
      />
    </div>
  );
}
