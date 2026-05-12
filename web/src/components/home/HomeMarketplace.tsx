import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Star, TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';
import { apiJson } from '../../lib/api';

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

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  food: { label: 'Đồ ăn', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  ingredient: { label: 'Nguyên liệu', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  equipment: { label: 'Đồ bếp', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

export default function HomeMarketplace() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson<{ products: FeaturedProduct[] }>('/api/marketplace/products?sort=popular&limit=8&status=approved')
      .then(d => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-amber-50/60 via-white to-white dark:from-slate-800/60 dark:via-slate-900 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <ShoppingBag className="w-3.5 h-3.5" />
            Cửa hàng
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-black dark:text-white mb-3 sm:mb-4">
            Sản Phẩm Nổi Bật
          </h2>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium">
            Nguyên liệu tươi ngon, đồ bếp chất lượng — mọi thứ bạn cần để nấu món ngon tại nhà.
          </p>
        </Reveal>

        {/* Stats bar */}
        <Reveal className="mb-10">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            {[
              { icon: ShoppingBag, label: 'Sản phẩm đa dạng', value: 'Đồ ăn · Nguyên liệu · Đồ bếp' },
              { icon: TrendingUp, label: 'Giao hàng', value: 'Nhanh chóng & An toàn' },
              { icon: Sparkles, label: 'AI gợi ý', value: 'Thông minh theo sở thích' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/20">
                  <s.icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{s.label}</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 dark:bg-slate-700 rounded-2xl h-48 sm:h-56" />
                <div className="mt-3 space-y-2 px-1">
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p, idx) => {
              const badge = TYPE_BADGE[p.product_type] ?? TYPE_BADGE.food;
              const hasDiscount = p.sale_price && p.sale_price < p.price;
              const discountPct = hasDiscount ? Math.round((1 - p.sale_price! / p.price) * 100) : 0;

              return (
                <RevealStaggerItem key={p.id} index={idx} stagger={0.05} y={20}>
                  <Link to={`/shop/${p.slug}`}>
                    <motion.div
                      whileHover={{ y: -6 }}
                      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300"
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
                          <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                        )}

                        {/* Discount badge */}
                        {hasDiscount && (
                          <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                            -{discountPct}%
                          </span>
                        )}

                        {/* Type badge */}
                        <span className={`absolute bottom-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="p-3.5 sm:p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {p.name}
                        </h3>

                        <div className="flex items-center gap-1.5 mb-2">
                          {p.rating > 0 && (
                            <>
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{p.rating.toFixed(1)}</span>
                            </>
                          )}
                          {p.total_sold > 0 && (
                            <span className="text-xs text-gray-400">· Đã bán {p.total_sold}</span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                            {formatPrice(hasDiscount ? p.sale_price! : p.price)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-gray-400 line-through">{formatPrice(p.price)}</span>
                          )}
                        </div>

                        {p.store_name && (
                          <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-700/50 text-xs text-gray-400 dark:text-gray-500 truncate">
                            {p.store_name}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </Link>
                </RevealStaggerItem>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <Reveal className="text-center mt-10 sm:mt-14">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2.5 bg-black dark:bg-white text-white dark:text-black px-8 py-3.5 font-bold text-xs uppercase tracking-[0.15em] hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors duration-300 rounded-full shadow-lg group"
          >
            <ShoppingBag className="w-4 h-4" />
            Khám phá cửa hàng
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
