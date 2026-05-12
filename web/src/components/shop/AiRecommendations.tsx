import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import ProductCard from './ProductCard';
import { apiJson } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';
import { Reveal } from '../../components/motion/ScrollReveal';
import type { Product } from '../../types/marketplace';

interface Props {
  /** Tiêu đề recipe hiện tại (nếu context từ recipe detail) */
  recipeTitle?: string;
  /** Nguyên liệu (nếu context từ recipe detail) */
  ingredients?: string;
  /** Context type: 'recipe' | 'shop' | 'general' */
  context?: string;
  /** Số lượng hiển thị */
  limit?: number;
}

export default function AiRecommendations({ recipeTitle, ingredients, context = 'general', limit = 4 }: Props) {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [reason, setReason] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (recipeTitle) q.set('recipe_title', recipeTitle);
    if (ingredients) q.set('ingredients', ingredients);
    q.set('context', context);

    apiJson<{ recommendations: Product[]; reason: string; source: string }>(
      `/api/marketplace/smart/recommend?${q.toString()}`
    )
      .then((d) => {
        setProducts((d.recommendations ?? []).slice(0, limit));
        setReason(d.reason ?? '');
        setSource(d.source ?? 'fallback');
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [recipeTitle, ingredients, context, limit, refreshKey]);

  const handleAddToCart = async (productId: number) => {
    try {
      await addItem(productId);
      toast.success('Đã thêm vào giỏ hàng!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vui lòng đăng nhập');
    }
  };

  if (!loading && products.length === 0) return null;

  return (
    <div>
      <Reveal y={16}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {source === 'ai' ? 'AI Gợi ý cho bạn' : 'Sản phẩm nổi bật'}
              </h3>
              {reason && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{reason}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="p-2 rounded-full text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all disabled:opacity-50"
            title="Gợi ý khác"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </Reveal>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white dark:bg-slate-800/80 overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-200 dark:bg-slate-700" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
