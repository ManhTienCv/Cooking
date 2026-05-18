import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, ArrowRight, Star, Truck, ShieldCheck,
  ChefHat, Flame, Package, UtensilsCrossed
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';
import { apiJson } from '../../lib/api';

/* ── types ─────────────────────────────────────── */
interface FeaturedProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  product_type: string;
  rating: number;
  total_sold: number;
  store_name: string;
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

/* ── static showcase categories ──────────────── */
const SHOP_CATEGORIES = [
  {
    icon: Flame,
    title: 'Đồ ăn sẵn',
    desc: 'Món ngon giao tận nơi, sẵn sàng thưởng thức',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    link: '/shop?type=food',
  },
  {
    icon: Package,
    title: 'Nguyên liệu',
    desc: 'Tươi ngon, đóng gói cẩn thận từ nhà cung cấp uy tín',
    color: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    link: '/shop?type=ingredient',
  },
  {
    icon: UtensilsCrossed,
    title: 'Đồ dùng bếp',
    desc: 'Dụng cụ chất lượng cao cho đầu bếp tại gia',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    link: '/shop?type=equipment',
  },
];

const PERKS = [
  { icon: ShieldCheck, text: 'Chất lượng đảm bảo' },
  { icon: Truck, text: 'Giao hàng nhanh chóng' },
  { icon: ChefHat, text: 'Từ người bán uy tín' },
];

/* ── component ───────────────────────────────── */
export default function HomeMarketplace() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson<{ products: FeaturedProduct[] }>('/api/marketplace/products?sort=popular&limit=6&status=approved')
      .then(d => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Decorative BG */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(251,191,36,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(251,191,36,0.06),transparent)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── Header ─── */}
        <Reveal className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-700 shadow-sm dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-400">
              <ShoppingBag className="h-4 w-4" />
              Cửa hàng ẩm thực
            </span>
            <h2 className="text-4xl font-serif font-bold text-black dark:text-white md:text-5xl">
              Mua sắm cho bếp của bạn
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-600 dark:text-slate-300 md:text-lg">
              Từ nguyên liệu tươi ngon đến dụng cụ nhà bếp chuyên nghiệp — tất cả trong một nơi, giao hàng tận nhà.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-600"
          >
            Ghé cửa hàng
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        {/* ─── 3 Category Showcase Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {SHOP_CATEGORIES.map((cat, idx) => (
            <RevealStaggerItem key={cat.title} index={idx} stagger={0.08} y={20}>
              <Link to={cat.link} className="block h-full">
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  className={`relative group h-full flex flex-col p-6 sm:p-8 rounded-2xl ${cat.bg} border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden`}
                >
                  {/* Gradient orb */}
                  <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${cat.color} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-500`} />

                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${cat.color} shadow-lg mb-4`}>
                    <cat.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-4 flex-1">
                    {cat.desc}
                  </p>

                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white group-hover:gap-3 transition-all duration-300 mt-auto">
                    Khám phá
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </motion.div>
              </Link>
            </RevealStaggerItem>
          ))}
        </div>

        {/* ─── Featured Products Grid ─── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 dark:bg-slate-700 rounded-2xl aspect-[4/3]" />
                <div className="mt-3 space-y-2 px-1">
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <Reveal className="mb-6">
              <h3 className="text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-4">
                Sản phẩm được yêu thích
              </h3>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
              {products.map((p, idx) => {
                const hasDiscount = p.sale_price != null && p.sale_price < p.price;
                const discountPct = hasDiscount ? Math.round((1 - p.sale_price! / p.price) * 100) : 0;
                
                return (
                  <RevealStaggerItem key={p.id} index={idx} stagger={0.06} y={18}>
                    <Link to={`/shop/${p.slug}`} className="block h-full">
                      <motion.div
                        whileHover={{ y: -5 }}
                        className="group flex h-full flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300"
                      >
                        {/* Image */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-slate-700">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 dark:from-slate-700 dark:to-slate-600">
                              <ShoppingBag className="w-10 h-10 text-amber-300 dark:text-slate-500" />
                            </div>
                          )}

                          {hasDiscount && (
                            <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                              -{discountPct}%
                            </span>
                          )}
                        </div>
                        {/* Details */}
                        <div className="flex flex-1 flex-col p-3 sm:p-4">
                          <h4 className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-100 line-clamp-2 flex-1">
                            {p.name}
                          </h4>
                          <div className="mt-2">
                            {hasDiscount ? (
                              <>
                                <span className="text-sm sm:text-base font-bold text-red-600 dark:text-red-500">{fmt(p.sale_price!)}</span>
                                <span className="ml-2 text-xs sm:text-sm text-gray-400 line-through">{fmt(p.price)}</span>
                              </>
                            ) : (
                              <span className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-200">{fmt(p.price)}</span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="font-bold">{p.rating.toFixed(1)}</span>
                            <span className="text-gray-400">({p.total_sold})</span>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </RevealStaggerItem>
                );
              })}
            </div>
          </>
        ) : null}

        {/* ─── Banner CTA + Perks ─── */}
        <Reveal y={24}>
          <div className="relative rounded-2xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900" />
            <div className="absolute inset-0 opacity-[0.07]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />

            <div className="relative flex flex-col md:flex-row items-center gap-8 p-8 sm:p-12 md:p-16">
              {/* Left */}
              <div className="md:w-3/5 text-left">
                <h3 className="text-2xl sm:text-4xl font-serif font-bold text-white mb-4 leading-tight">
                  Mở gian hàng của bạn<br className="hidden sm:block" /> trên CookingBoy
                </h3>
                <p className="text-base text-gray-300 mb-6 max-w-xl">
                  Bạn là đầu bếp tài năng hay nhà cung cấp thực phẩm? Đăng ký bán hàng miễn phí và tiếp cận hàng ngàn người yêu ẩm thực.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 font-bold text-xs uppercase tracking-[0.15em] hover:bg-gray-100 transition-colors duration-300 rounded-full shadow-lg group"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Mua sắm ngay
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-2 border-2 border-white/30 text-white px-6 py-3 font-bold text-xs uppercase tracking-[0.15em] hover:bg-white/10 transition-colors duration-300 rounded-full group"
                  >
                    Đăng ký bán hàng
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </div>

              {/* Right — Perks */}
              <div className="md:w-2/5 flex flex-col gap-4">
                {PERKS.map((perk, i) => (
                  <motion.div
                    key={perk.text}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4"
                  >
                    <div className="p-2.5 rounded-lg bg-amber-500/20">
                      <perk.icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-sm font-semibold text-white">{perk.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
