import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Gift, ArrowRight } from 'lucide-react';

import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import { scrollWindowToTop } from '../../lib/scroll';

interface Bundle {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  original_price: number;
  bundle_price: number;
  is_active: boolean;
  item_count: number;
}

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function FeaturedBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson<{ bundles: Bundle[] }>('/api/marketplace/bundles?limit=4')
      .then((d) => setBundles(d.bundles ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && bundles.length === 0) return null;

  return (
    <div>
      <Reveal y={16}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-md">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Combo tiết kiệm</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mua theo gói — giá ưu đãi hơn</p>
            </div>
          </div>
        </div>
      </Reveal>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-white dark:bg-slate-800/80 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {bundles.map((b, i) => {
            const discount = b.original_price > 0
              ? Math.round(((b.original_price - b.bundle_price) / b.original_price) * 100)
              : 0;

            return (
              <Reveal key={b.id} y={14} delay={i * 0.06}>
                <Link
                  to={`/shop/bundles/${b.slug}`}
                  onClick={scrollWindowToTop}
                  className="group block bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Image / placeholder */}
                  <div className="relative h-32 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 overflow-hidden">
                    {b.image_url ? (
                      <img src={b.image_url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-emerald-300 dark:text-emerald-700" />
                      </div>
                    )}

                    {/* Discount badge */}
                    {discount > 0 && (
                      <span className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                        Giảm {discount}%
                      </span>
                    )}

                    {/* Item count */}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[10px] font-medium rounded-full backdrop-blur-sm">
                      {b.item_count} sản phẩm
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {b.name}
                    </h4>
                    {b.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mt-1">{b.description}</p>
                    )}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-base font-bold text-red-600 dark:text-red-400">{formatPrice(b.bundle_price)}</span>
                      {b.original_price > b.bundle_price && (
                        <span className="text-xs text-gray-400 line-through">{formatPrice(b.original_price)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
