import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, BookOpen, Bookmark, CheckCircle, PenTool, Settings, X, Edit, Trash2, Store, Package, Heart, Star, Wallet, ArrowUpRight } from 'lucide-react';
import { apiFetch, apiJson, resetCsrfCache } from '../../lib/api';
import { AUTH_CHANGE_EVENT, getAuthChangeDetail, notifyAuthChanged } from '../../lib/authEvents';
import { Reveal } from '../../components/motion/ScrollReveal';
import Pagination from '../../components/ui/Pagination';

import type { ProfileUser, ProfileStats, ProfileRecipe, ProfilePost, ProfilePlan } from '../../components/profile/types';
import type { BlogCategory } from '../../components/blog/types';
import type { RecipeCategory } from '../../components/recipes/types';
import type { WishlistItem } from '../../types/marketplace';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileSidebar from '../../components/profile/ProfileSidebar';
import ProfileSettingsForm from '../../components/profile/ProfileSettingsForm';
import EditPostModal from '../../components/blog/EditPostModal';
import EditRecipeModal from '../../components/recipes/EditRecipeModal';

const PROFILE_PAGE_SIZE = 6;
type PagedTab = 'recipes' | 'posts' | 'saved' | 'wishlist';

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'shop');
  const [showSuccessMenu, setShowSuccessMenu] = useState(false);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [myRecipes, setMyRecipes] = useState<ProfileRecipe[]>([]);
  const [myPosts, setMyPosts] = useState<ProfilePost[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<ProfileRecipe[]>([]);
  const [myPlans, setMyPlans] = useState<ProfilePlan[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Seller state
  const [sellerProfile, setSellerProfile] = useState<{ store_name: string; store_description: string | null } | null>(null);
  const [sellerProducts, setSellerProducts] = useState<{ id: number; name: string; price: number; status: string; stock: number; total_sold: number; image_url: string | null }[]>([]);
  const [sellerNotRegistered, setSellerNotRegistered] = useState(false);

  const [pageByTab, setPageByTab] = useState<Record<PagedTab | 'shop', number>>({ recipes: 1, posts: 1, saved: 1, wishlist: 1, shop: 1 });
  const [totalByTab, setTotalByTab] = useState<Record<PagedTab | 'shop', number>>({ recipes: 0, posts: 0, saved: 0, wishlist: 0, shop: 0 });

  // Edit post modal
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);

  // Edit recipe modal
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [recipeCategories, setRecipeCategories] = useState<RecipeCategory[]>([]);

  const loadTabData = useCallback(async (tab: string) => {
    const getPageQuery = (pagedTab: string) => {
      const q = new URLSearchParams();
      q.set('limit', String(PROFILE_PAGE_SIZE));
      const key = pagedTab as PagedTab | 'shop';
      q.set('offset', String(((pageByTab[key] || 1) - 1) * PROFILE_PAGE_SIZE));
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
      } else if (tab === 'wishlist') {
        const d = await apiJson<{ items: WishlistItem[] }>('/api/marketplace/wishlist');
        const items = d.items ?? [];
        const start = (pageByTab.wishlist - 1) * PROFILE_PAGE_SIZE;
        setWishlistItems(items.slice(start, start + PROFILE_PAGE_SIZE));
        setTotalByTab((prev) => ({ ...prev, wishlist: items.length }));
      } else if (tab === 'health') {
        const d = await apiJson<{ plans: ProfilePlan[] }>('/api/health/plans');
        setMyPlans(d.plans ?? []);
      } else if (tab === 'shop') {
        try {
          const p = await apiJson<{ profile: { store_name: string; store_description: string | null } | null }>('/api/marketplace/seller/profile');
          if (!p.profile) { setSellerNotRegistered(true); setSellerProfile(null); setSellerProducts([]); }
          else {
            setSellerProfile(p.profile);
            setSellerNotRegistered(false);
            const prods = await apiJson<{ products: typeof sellerProducts, total: number }>(`/api/marketplace/seller/products?${getPageQuery('shop')}`);
            setSellerProducts(prods.products ?? []);
            setTotalByTab((prev) => ({ ...prev, shop: prods.total ?? 0 }));
          }
        } catch { setSellerNotRegistered(true); }
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
      } else if (tab === 'wishlist') {
        setWishlistItems([]);
        setTotalByTab((prev) => ({ ...prev, wishlist: 0 }));
      } else if (tab === 'shop') {
        setSellerProducts([]);
        setTotalByTab((prev) => ({ ...prev, shop: 0 }));
      }
    } finally {
      setIsDataLoading(false);
    }
  }, [pageByTab]);

  useEffect(() => {
    if (user && activeTab !== 'settings' && activeTab !== 'wallet') {
      void loadTabData(activeTab);
    }
  }, [activeTab, user, loadTabData]);

  const loadMe = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await apiJson<{
        authenticated: boolean;
        user?: { id: number; full_name: string; email: string; bio?: string | null; avatar_url?: string | null };
        stats?: ProfileStats;
      }>('/api/auth/me');
      if (me.authenticated && me.user) {
        setUserId(me.user.id);
        setUser({
          full_name: me.user.full_name,
          email: me.user.email,
          bio: me.user.bio ?? '',
          avatar: me.user.avatar_url ?? null,
        });
        setStats(me.stats ?? { recipe_count: 0, post_count: 0, recipe_views_sum: 0 });
        try {
          const pub = await apiJson<{ counts: { followers: number; following: number } }>(
            `/api/users/${me.user.id}/public`
          );
          setFollowers(pub.counts?.followers ?? 0);
          setFollowing(pub.counts?.following ?? 0);
        } catch {
          setFollowers(0);
          setFollowing(0);
        }
      } else {
        setUser(null);
        setUserId(null);
        setStats(null);
        setFollowers(0);
        setFollowing(0);
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

    const onAuthChange = (event: Event) => {
      const detail = getAuthChangeDetail(event);
      if (detail.authenticated === false) {
        setUser(null);
        setStats(null);
        return;
      }
      void loadMe();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, onAuthChange);

    // Also fetch blog categories for edit modal
    apiJson<{ categories: BlogCategory[] }>('/api/blog/categories')
      .then(d => setBlogCategories(d.categories ?? []))
      .catch(() => { });
    apiJson<{ categories: RecipeCategory[] }>('/api/recipes/categories')
      .then(d => setRecipeCategories(d.categories ?? []))
      .catch(() => { });

    return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChange);
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
    notifyAuthChanged({ authenticated: false });
    setUser(null);
    setStats(null);
    navigate('/', { replace: true });
  };

  const handleDeleteRecipe = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa công thức này?')) return;
    try {
      await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' });
      void loadTabData('recipes');
    } catch {
      alert('Không thể xóa công thức');
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    try {
      await apiFetch(`/api/blog/posts/${id}`, { method: 'DELETE' });
      void loadTabData('posts');
    } catch {
      alert('Không thể xóa bài viết');
    }
  };

  const handleProfilePageChange = (tab: PagedTab | 'shop', page: number) => {
    setPageByTab((prev) => ({ ...prev, [tab]: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveWishlist = async (productId: number) => {
    try {
      await apiFetch(`/api/marketplace/wishlist/${productId}`, { method: 'POST' });
      void loadTabData('wishlist');
    } catch {
      alert('Không thể bỏ yêu thích');
    }
  };

  const tabs = [
    { id: 'shop', label: 'Cửa hàng', icon: Store },
    { id: 'wallet', label: 'Ví Cook', icon: Wallet },
    { id: 'wishlist', label: 'Món yêu thích', icon: Heart },
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
      <ProfileHeader
        isLoading={isLoading}
        user={user}
        stats={stats}
        userId={userId}
        followers={followers}
        following={following}
      />

      <Reveal className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" y={22}>
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
                          {myRecipes.map((r) => {
                            const isPending = r.status === 'pending';
                            return (
                              <div
                                key={r.id}
                                className={`group overflow-hidden rounded-xl border transition-shadow hover:shadow-md ${isPending
                                  ? 'border-slate-300 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/70'
                                  : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                                  }`}
                              >
                                {r.image_url ? (
                                  <img src={r.image_url} alt={r.title} className="h-40 w-full object-cover" />
                                ) : (
                                  <div className="flex h-40 w-full items-center justify-center bg-gray-100 dark:bg-slate-700">
                                    <BookOpen className="h-8 w-8 text-gray-300 dark:text-slate-500" />
                                  </div>
                                )}
                                <div className="p-4 relative">
                                  {isPending && (
                                    <span className="absolute right-3 top-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                      Đang chờ duyệt
                                    </span>
                                  )}
                                  <h4 className="line-clamp-1 font-bold text-gray-900 dark:text-white pr-16">{r.title}</h4>
                                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{r.category_name}</p>
                                  <div className="mt-3 flex items-center justify-between">
                                    <Link to={`/recipes/detail/${r.id}`} className="inline-block text-sm font-medium text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400">
                                      Xem chi tiết &rarr;
                                    </Link>
                                    <div className="flex space-x-2">
                                      <button onClick={() => setEditingRecipeId(r.id)} className="p-1 text-gray-500 hover:text-blue-600 transition-colors" title="Sửa công thức">
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button onClick={() => handleDeleteRecipe(r.id)} className="p-1 text-gray-500 hover:text-red-600 transition-colors" title="Xóa bài">
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
                          {myPosts.map((p) => {
                            const isPending = p.status === 'pending';
                            return (
                              <div
                                key={p.id}
                                className={`relative rounded-xl border p-5 transition-shadow hover:shadow-md ${isPending
                                  ? 'border-slate-300 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/70'
                                  : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                                  }`}
                              >
                                {isPending && (
                                  <span className="absolute right-4 top-4 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                    Đang chờ duyệt
                                  </span>
                                )}
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
                            );
                          })}
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

                {activeTab === 'wishlist' && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold font-serif text-gray-950 dark:text-white">Món yêu thích</h2>
                    {isDataLoading ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">Đang tải...</div>
                    ) : wishlistItems.length === 0 ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        <Heart className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-slate-600" />
                        Bạn chưa yêu thích món nào.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {wishlistItems.map((item) => {
                            const price = item.product_sale_price ?? item.product_price;
                            const isUnavailable = item.product_status !== 'approved' || !item.product_is_available || item.product_stock <= 0;
                            return (
                              <div key={item.id} className={`overflow-hidden rounded-xl border border-gray-200 transition-shadow dark:border-slate-700 ${isUnavailable ? 'bg-gray-50/50 dark:bg-slate-800/50 opacity-60 grayscale' : 'bg-white hover:shadow-md dark:bg-slate-800'}`}>
                                <Link to={`/shop/${item.product_slug}`} className={`block relative ${isUnavailable ? 'pointer-events-none' : ''}`}>
                                  {item.product_image ? (
                                    <img src={item.product_image} alt={item.product_name} className="h-40 w-full object-cover" />
                                  ) : (
                                    <div className="flex h-40 w-full items-center justify-center bg-gray-100 dark:bg-slate-700">
                                      <Package className="h-8 w-8 text-gray-300 dark:text-slate-500" />
                                    </div>
                                  )}
                                  {isUnavailable && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <span className="bg-black/70 text-white font-bold py-1.5 px-4 rounded-full text-sm">
                                        {item.product_status !== 'approved' || !item.product_is_available ? 'Hàng không còn' : 'Hàng đã hết'}
                                      </span>
                                    </div>
                                  )}
                                </Link>
                                <div className="space-y-3 p-4">
                                  <div>
                                    <Link to={`/shop/${item.product_slug}`} className={`line-clamp-1 font-bold text-gray-900 dark:text-white ${isUnavailable ? 'pointer-events-none' : 'hover:text-amber-600 dark:hover:text-amber-400'}`}>
                                      {item.product_name}
                                    </Link>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.store_name || 'Cửa hàng'}</p>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-extrabold text-red-600 dark:text-red-400">{formatPrice(price)}</p>
                                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                        {Number(item.product_rating).toFixed(1)} ({item.product_total_reviews})
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => void handleRemoveWishlist(item.product_id)}
                                      className="inline-flex items-center gap-1 rounded-full border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                                    >
                                      <Heart className="h-4 w-4 fill-current" />
                                      Bỏ thích
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Pagination currentPage={pageByTab.wishlist} totalItems={totalByTab.wishlist} pageSize={PROFILE_PAGE_SIZE} onPageChange={(page) => handleProfilePageChange('wishlist', page)} />
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

                {activeTab === 'shop' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold font-serif text-gray-950 dark:text-white">Cửa hàng của tôi</h2>
                      <Link to="/seller" className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-semibold hover:opacity-80 transition-all">
                        <Store className="w-4 h-4" /> Quản lý cửa hàng
                      </Link>
                    </div>

                    {isDataLoading ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">Đang tải...</div>
                    ) : sellerNotRegistered ? (
                      <div className="py-12 text-center">
                        <Store className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-slate-600" />
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Bạn chưa đăng ký bán hàng.</p>
                        <Link to="/seller" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-full font-bold hover:bg-amber-600 transition-all shadow-md">
                          <Store className="w-5 h-5" /> Đăng ký ngay
                        </Link>
                      </div>
                    ) : (
                      <>
                        {/* Store info card */}
                        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800/30">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                              <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{sellerProfile?.store_name}</h3>
                          </div>
                          {sellerProfile?.store_description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 ml-12">{sellerProfile.store_description}</p>
                          )}
                          <div className="flex gap-6 mt-4 ml-12">
                            <div className="text-center">
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{sellerProducts.length}</p>
                              <p className="text-xs text-gray-500">Sản phẩm</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-green-600">{sellerProducts.filter(p => p.status === 'approved').length}</p>
                              <p className="text-xs text-gray-500">Đang bán</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-amber-600">{sellerProducts.filter(p => p.status === 'pending').length}</p>
                              <p className="text-xs text-gray-500">Chờ duyệt</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-purple-600">{sellerProducts.reduce((s, p) => s + p.total_sold, 0)}</p>
                              <p className="text-xs text-gray-500">Đã bán</p>
                            </div>
                          </div>
                        </div>

                        {/* Products */}
                        {sellerProducts.length === 0 ? (
                          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                            <Package className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-slate-600" />
                            <p>Chưa có sản phẩm nào. <Link to="/seller" className="text-amber-600 font-semibold hover:underline">Thêm sản phẩm mới &rarr;</Link></p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {sellerProducts.map(p => (
                              <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</h4>
                                  <p className="text-sm text-gray-500">{p.price.toLocaleString('vi-VN')}đ · Kho: {p.stock}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  p.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                  {p.status === 'approved' ? 'Đang bán' : p.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {totalByTab.shop > PROFILE_PAGE_SIZE && (
                          <div className="mt-8 flex justify-center">
                            <Pagination currentPage={pageByTab.shop} totalItems={totalByTab.shop} pageSize={PROFILE_PAGE_SIZE} onPageChange={(page) => handleProfilePageChange('shop', page)} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'wallet' && (
                  <div>
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Thanh toán</p>
                        <h2 className="mt-2 text-2xl font-bold font-serif text-gray-950 dark:text-white">Ví Cook</h2>
                      </div>
                      <Link
                        to="/wallet"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                      >
                        Mở ví <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-sky-950/30">
                      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                            <Wallet className="h-7 w-7" />
                          </div>
                          <div>
                            <h3 className="text-xl font-extrabold text-gray-950 dark:text-white">Quản lý số dư và tài khoản nhận tiền</h3>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                              Nạp tiền, rút tiền, thêm tài khoản ngân hàng và theo dõi giao dịch Ví Cook tại một nơi.
                            </p>
                          </div>
                        </div>
                        <div className="grid min-w-[220px] grid-cols-2 gap-3 text-center">
                          <div className="rounded-xl border border-white/70 bg-white/75 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Nạp tiền</p>
                            <p className="mt-1 text-lg font-black text-emerald-600">Ngân Hàng</p>
                          </div>
                          <div className="rounded-xl border border-white/70 bg-white/75 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Rút tiền</p>
                            <p className="mt-1 text-lg font-black text-sky-600">OTP</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <ProfileSettingsForm
                    isLoading={isLoading}
                    user={user}
                    initialView={(searchParams.get('settings') as 'main' | 'account' | 'addresses' | 'banks' | null) ?? 'main'}
                    onSuccessSubmit={() => setShowSuccessMenu(true)}
                  />
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

      {/* Edit Recipe Modal */}
      <EditRecipeModal
        isOpen={editingRecipeId !== null}
        recipeId={editingRecipeId ?? 0}
        onClose={() => setEditingRecipeId(null)}
        onSuccess={async () => { await loadTabData('recipes'); }}
        categoryOptions={recipeCategories}
      />
    </div>
  );
}
