import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Store,
  BookOpen,
  PenTool,
  Package,
  MessageCircle,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiJson } from '../../lib/api';
import ImageWithFallback from '../../lib/ImageWithFallback';
import FollowButton from '../../components/social/FollowButton';
import PageBackBar from '../../components/ui/PageBackBar';
import Pagination from '../../components/ui/Pagination';

type PublicProfileData = {
  user: {
    id: number;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  seller: {
    store_name: string;
    store_description: string | null;
    is_verified: boolean;
    rating: number;
    total_sales: number;
    stats: {
      total_products: number;
      total_sold: number;
      total_orders: number;
      total_revenue: number;
    } | null;
  } | null;
  counts: {
    followers: number;
    following: number;
    recipes: number;
    posts: number;
  };
  is_following: boolean;
  is_self: boolean;
};

type TabId = 'shop' | 'recipes' | 'posts';

const PAGE_SIZE = 12;

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function namesDiffer(a: string, b: string): boolean {
  return a.trim().toLowerCase() !== b.trim().toLowerCase();
}

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('shop');
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<
    { id: number; name: string; slug: string; price: number; sale_price: number | null; image_url: string | null }[]
  >([]);
  const [recipes, setRecipes] = useState<
    { id: number; title: string; image_url: string | null; category_name: string | null }[]
  >([]);
  const [posts, setPosts] = useState<
    { id: number; title: string; slug: string; excerpt: string | null; image_url: string | null }[]
  >([]);
  const [tabTotal, setTabTotal] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiJson<PublicProfileData>(`/api/users/${userId}/public`)
      .then((data) => {
        setProfile(data);
        if (data.counts.recipes > 0) setTab('recipes');
        else if (data.counts.posts > 0) setTab('posts');
        else if (data.seller) setTab('shop');
        else setTab('recipes');
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const loadTab = useCallback(async () => {
    if (!userId) return;
    setTabLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const q = `limit=${PAGE_SIZE}&offset=${offset}`;
    try {
      if (tab === 'shop') {
        const d = await apiJson<{ products: typeof products; total: number }>(`/api/users/${userId}/products?${q}`);
        setProducts(d.products ?? []);
        setTabTotal(d.total ?? 0);
      } else if (tab === 'recipes') {
        const d = await apiJson<{ recipes: typeof recipes; total: number }>(`/api/users/${userId}/recipes?${q}`);
        setRecipes(d.recipes ?? []);
        setTabTotal(d.total ?? 0);
      } else {
        const d = await apiJson<{ posts: typeof posts; total: number }>(`/api/users/${userId}/posts?${q}`);
        setPosts(d.posts ?? []);
        setTabTotal(d.total ?? 0);
      }
    } catch {
      setProducts([]);
      setRecipes([]);
      setPosts([]);
      setTabTotal(0);
    } finally {
      setTabLoading(false);
    }
  }, [userId, tab, page]);

  useEffect(() => {
    if (profile) void loadTab();
  }, [profile, loadTab]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const identity = useMemo(() => {
    if (!profile) return null;
    const authorName = profile.user.full_name;
    const storeName = profile.seller?.store_name ?? null;
    return { authorName, storeName };
  }, [profile]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="h-11 w-11 rounded-full border-4 border-amber-500/30 border-t-amber-500"
        />
      </motion.div>
    );
  }

  if (!profile || !identity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 dark:bg-slate-950"
      >
        <PageBackBar fallbackTo="/" className="absolute left-4 top-6 sm:left-8" />
        <p className="text-6xl">😕</p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Không tìm thấy trang</h2>
        <Link to="/" className="text-amber-600 hover:underline dark:text-amber-400">
          Về trang chủ
        </Link>
      </motion.div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof Store; count: number }[] = [];
  // Công thức & Bài viết luôn hiển thị trước
  tabs.push({ id: 'recipes', label: 'Công thức', icon: BookOpen, count: profile.counts.recipes });
  tabs.push({ id: 'posts', label: 'Bài viết', icon: PenTool, count: profile.counts.posts });
  // Cửa hàng chỉ hiển thị khi người dùng là seller
  if (profile.seller) {
    tabs.push({ id: 'shop', label: 'Cửa hàng', icon: Store, count: profile.seller.stats?.total_products ?? 0 });
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Cover */}
      <motion.div className="relative h-44 overflow-hidden sm:h-52 md:h-56">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/80 via-orange-100/60 to-gray-50 dark:from-amber-600/40 dark:via-orange-600/25 dark:to-slate-950" />
        <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(251,191,36,0.25),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(251,191,36,0.35),_transparent_55%)]" />
        <motion.div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwIDkuOTQxLTguMDU5IDE4LTE4IDE4cy0xOC04LjA1OS0xOC0xOCA4LjA1OS0xOCAxOC0xOCAxOCA4LjA1OSAxOCAxOHoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvZz48L3N2Zz4=')] opacity-60" />
        <motion.div className="absolute left-4 top-5 z-10 sm:left-8">
          <PageBackBar fallbackTo="/shop" label="Quay lại" />
        </motion.div>
      </motion.div>

      <motion.div className="relative mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        {/* Profile card */}
        <motion.div className="-mt-20 mb-8 rounded-3xl border border-gray-200/80 bg-white/95 p-6 shadow-xl shadow-gray-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-2xl dark:shadow-black/40 sm:p-8">
          <motion.div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <motion.div className="relative mx-auto shrink-0 sm:mx-0">
              <motion.div className="rounded-full bg-gradient-to-br from-gray-800 to-black p-1 shadow-lg shadow-black/20 dark:from-gray-200 dark:to-white">
                {profile.user.avatar_url ? (
                  <ImageWithFallback
                    src={profile.user.avatar_url}
                    alt={identity.authorName}
                    className="h-28 w-28 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 sm:h-32 sm:w-32"
                  />
                ) : (
                  <motion.div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 text-4xl font-bold text-gray-700 dark:bg-slate-800 dark:text-gray-300 sm:h-32 sm:w-32">
                    {identity.authorName.charAt(0).toUpperCase()}
                  </motion.div>
                )}
              </motion.div>
              {profile.seller?.is_verified && (
                <motion.span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-white dark:ring-slate-900">
                  <ShieldCheck className="h-4 w-4" />
                </motion.span>
              )}
            </motion.div>

            <motion.div className="min-w-0 flex-1 text-center sm:text-left">
              {/* Tên cá nhân luôn là tiêu đề chính */}
              <motion.h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                {identity.authorName}
              </motion.h1>

              {/* Bio luôn hiển thị nếu có */}
              {profile.user.bio && (
                <motion.p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-400">{profile.user.bio}</motion.p>
              )}

              {/* Thông tin cửa hàng (nếu có) — hiển thị phía dưới */}
              {profile.seller && (
                <motion.div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Store className="h-3.5 w-3.5" />
                    {identity.storeName}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-500">
                    <Star className="h-3.5 w-3.5 fill-gray-800 text-gray-800 dark:fill-slate-300 dark:text-slate-300" />
                    {Number(profile.seller.rating).toFixed(1)}
                    <span className="text-gray-400 dark:text-slate-600">·</span>
                    {profile.seller.stats?.total_sold ?? 0} đã bán
                  </span>
                </motion.div>
              )}

              {profile.seller?.store_description && (
                <motion.p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-slate-500">{profile.seller.store_description}</motion.p>
              )}

              <div
                className={`mt-5 grid gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-slate-800/50 sm:inline-flex sm:gap-0 sm:p-0 sm:rounded-none sm:border-0 sm:bg-transparent ${
                  profile.seller ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                {[
                  { value: profile.counts.followers, label: 'Theo dõi' },
                  { value: profile.counts.following, label: 'Đang theo dõi' },
                  ...(profile.seller
                    ? [{ value: profile.seller.stats?.total_sold ?? 0, label: 'Đã bán' }]
                    : []),
                ].map((stat, i, arr) => (
                  <div
                    key={stat.label}
                    className={`text-center sm:px-5 ${i < arr.length - 1 ? 'sm:border-r sm:border-gray-200 dark:sm:border-slate-700' : ''}`}
                  >
                    <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">{stat.value}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500 sm:text-[11px]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <FollowButton
                  userId={profile.user.id}
                  initialFollowing={profile.is_following}
                  isSelf={profile.is_self}
                  onChange={(following) =>
                    setProfile((prev) =>
                      prev
                        ? {
                            ...prev,
                            is_following: following,
                            counts: {
                              ...prev.counts,
                              followers: prev.counts.followers + (following ? 1 : -1),
                            },
                          }
                        : prev
                    )
                  }
                />
                {!profile.is_self && profile.seller && (
                  <Link
                    to={`/messages?sellerId=${profile.user.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Nhắn tin
                  </Link>
                )}
                {profile.is_self && (
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-200 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    Quản lý hồ sơ
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <motion.div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white/90 p-1.5 shadow-sm backdrop-blur dark:border-white/5 dark:bg-slate-900/60 dark:shadow-none">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
                  active ? 'text-white dark:text-black' : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="creator-tab"
                    className="absolute inset-0 rounded-xl bg-gray-900 shadow-md dark:bg-white"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <t.icon className="h-4 w-4" />
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-black/15' : 'bg-gray-200 dark:bg-white/10'}`}
                  >
                    {t.count}
                  </span>
                </span>
              </button>
            );
          })}
        </motion.div>

        {tabLoading ? (
          <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-800/80" />
            ))}
          </motion.div>
        ) : tab === 'shop' ? (
          products.length === 0 ? (
            <motion.div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <Package className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-slate-600" />
              <p className="text-gray-500 dark:text-slate-500">Chưa có sản phẩm đang bán</p>
            </motion.div>
          ) : (
            <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={`/shop/${p.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:border-amber-400/50 hover:shadow-lg dark:border-white/5 dark:bg-slate-900/80 dark:shadow-xl dark:hover:border-amber-500/30 dark:hover:shadow-amber-500/10"
                  >
                    <motion.div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-slate-800">
                      {p.image_url ? (
                        <ImageWithFallback
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <motion.div className="flex h-full items-center justify-center text-5xl opacity-40">📦</motion.div>
                      )}
                      <motion.div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 opacity-0 transition group-hover:opacity-100">
                        <span className="text-xs font-semibold text-amber-300">Xem chi tiết →</span>
                      </motion.div>
                    </motion.div>
                    <motion.div className="p-4">
                      <p className="line-clamp-2 font-semibold text-gray-900 dark:text-white">{p.name}</p>
                      <p className="mt-2 text-lg font-bold text-amber-600 dark:text-amber-400">{formatPrice(p.sale_price ?? p.price)}</p>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )
        ) : tab === 'recipes' ? (
          recipes.length === 0 ? (
            <motion.div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-500 dark:border-slate-700 dark:text-slate-500">
              Chưa có công thức công khai
            </motion.div>
          ) : (
            <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={`/recipes/detail/${r.id}`}
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-amber-400/50 dark:border-white/5 dark:bg-slate-900/80 dark:hover:border-amber-500/30"
                  >
                    <motion.div className="aspect-video overflow-hidden bg-gray-100 dark:bg-slate-800">
                      {r.image_url ? (
                        <ImageWithFallback
                          src={r.image_url}
                          alt={r.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <motion.div className="flex h-full items-center justify-center text-4xl opacity-30">🍳</motion.div>
                      )}
                    </motion.div>
                    <motion.div className="p-4">
                      <p className="line-clamp-2 font-semibold text-gray-900 dark:text-white">{r.title}</p>
                      {r.category_name && (
                        <p className="mt-1 text-xs text-amber-600/90 dark:text-amber-400/80">{r.category_name}</p>
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )
        ) : posts.length === 0 ? (
          <motion.div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-500 dark:border-slate-700 dark:text-slate-500">
            Chưa có bài viết
          </motion.div>
        ) : (
          <motion.div className="space-y-4">
            {posts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={`/blog/detail/${p.id}`}
                  className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-amber-400/30 hover:bg-gray-50 dark:border-white/5 dark:bg-slate-900/80 dark:hover:border-amber-500/20 dark:hover:bg-slate-800/80"
                >
                  {p.image_url ? (
                    <ImageWithFallback
                      src={p.image_url}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <motion.div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl dark:bg-slate-800">
                      📝
                    </motion.div>
                  )}
                  <motion.div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">{p.title}</p>
                    {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-slate-500">{p.excerpt}</p>}
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {tabTotal > PAGE_SIZE && (
          <motion.div className="mt-10 flex justify-center">
            <Pagination currentPage={page} totalItems={tabTotal} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
