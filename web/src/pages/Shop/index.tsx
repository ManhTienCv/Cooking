import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, ChefHat } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import ProductCard from '../../components/shop/ProductCard';
import FeaturedBundles from '../../components/shop/FeaturedBundles';
import KitchenCookHero from '../../components/shop/KitchenCookHero';
import KitchenCookIntro from '../../components/shop/KitchenCookIntro';
import { KitchenToRecipeBanner } from '../../components/common/CrossPromotionBanners';
import { apiJson } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';
import type { Product } from '../../types/marketplace';

export default function Shop() {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  /* Fetch best-selling featured products for home showcase */
  useEffect(() => {
    setLoading(true);
    apiJson<{ products: Product[]; total: number }>('/api/marketplace/products?sort=popular&limit=8')
      .then((data) => {
        setFeaturedProducts(data.products ?? []);
      })
      .catch(() => {
        setFeaturedProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleAddToCart = useCallback(async (productId: number) => {
    try {
      await addItem(productId);
      toast.success('Đã thêm vào giỏ hàng!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể thêm vào giỏ');
    }
  }, [addItem]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 transition-colors duration-300 font-vietnam">
      {/* 1. KitchenCook Hero Banner */}
      <KitchenCookHero
        onExploreClick={() => navigate('/shop/products')}
        onCookwareClick={() => navigate('/shop/products?type=equipment')}
      />

      {/* 2. Giá trị cốt lõi súc tích KitchenCook */}
      <KitchenCookIntro />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* 3. Bộ Sưu Tập Đồ Bếp Nổi Bật */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/80 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Sản Phẩm Được Yêu Thích
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                Những sản phẩm nồi niêu, xoong chảo và phụ kiện bán chạy nhất tại KitchenCook
              </p>
            </div>

            <Link
              to="/shop/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-[#E8590C] text-white text-xs sm:text-sm font-bold shadow-md shadow-slate-900/10 hover:shadow-[#E8590C]/25 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <span>Xem tất cả sản phẩm</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-3xl bg-white dark:bg-slate-800/80 overflow-hidden animate-pulse border border-stone-200/80 dark:border-slate-700">
                  <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredProducts.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  index={i}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-800/60 rounded-3xl border border-stone-200 dark:border-slate-700">
              <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Đang cập nhật danh mục sản phẩm mới...</p>
            </div>
          )}

          <div className="text-center pt-4">
            <Link
              to="/shop/products"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <span>Khám phá kho toàn bộ sản phẩm ({featuredProducts.length}+)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* 4. Lời mời khám phá Công thức Ẩm thực CookingBoy */}
        <section>
          <KitchenToRecipeBanner />
        </section>

        {/* 5. Featured Bundles (Combo đồ bếp thông minh) */}
        <section>
          <FeaturedBundles />
        </section>
      </div>
    </div>
  );
}
