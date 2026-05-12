import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ShoppingBag, ChevronDown, ChevronUp, Check, Sparkles, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

import { apiJson } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';
import { scrollWindowToTop } from '../../lib/scroll';
import type { Product } from '../../types/marketplace';

interface Props {
  ingredients: string;
}

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function BuyIngredientsPanel({ ingredients }: Props) {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);

  const handleMatch = async () => {
    if (products.length > 0) {
      setExpanded(!expanded);
      return;
    }

    setLoading(true);
    try {
      const data = await apiJson<{ products: Product[]; keywords: string[] }>(
        '/api/marketplace/smart/match-ingredients',
        { method: 'POST', body: JSON.stringify({ ingredients }) }
      );
      setProducts(data.products ?? []);
      setKeywords(data.keywords ?? []);
      setSelected(new Set((data.products ?? []).map(p => p.id)));
      setExpanded(true);
    } catch {
      toast.error('Không tìm thấy sản phẩm phù hợp');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddAll = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      let added = 0;
      for (const id of selected) {
        try {
          await addItem(id, 1);
          added++;
        } catch { /* skip unavailable */ }
      }
      toast.success(`Đã thêm ${added} sản phẩm vào giỏ!`);
    } catch {
      toast.error('Lỗi thêm sản phẩm');
    } finally {
      setAdding(false);
    }
  };

  const totalPrice = products
    .filter(p => selected.has(p.id))
    .reduce((sum, p) => sum + (p.sale_price ?? p.price), 0);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-200/60 dark:border-amber-700/30 overflow-hidden">
      {/* Header — trigger */}
      <button
        onClick={handleMatch}
        disabled={loading}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 dark:bg-amber-500 flex items-center justify-center shadow-md">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm text-gray-900 dark:text-white">
              {loading ? 'Đang tìm sản phẩm...' : 'Mua nguyên liệu ngay'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tìm sản phẩm tương ứng trong cửa hàng
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {loading ? (
            <div className="w-5 h-5 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
          ) : expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && products.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">
              {/* Matched keywords */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] bg-amber-200/60 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Product list */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {products.map(p => {
                  const isSelected = selected.has(p.id);
                  const price = p.sale_price ?? p.price;
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-white dark:bg-slate-800/80 shadow-sm'
                          : 'border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 opacity-60'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-amber-500 border-amber-500' : 'border-gray-300 dark:border-slate-600'
                      }`} onClick={() => toggleProduct(p.id)}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 flex-shrink-0">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm">🥬</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/shop/${p.slug}`}
                          onClick={scrollWindowToTop}
                          className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1 hover:text-amber-600 transition-colors inline-flex items-center gap-1"
                        >
                          {p.name} <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                        <p className="text-xs text-gray-400">{p.unit} · {p.category_name}</p>
                      </div>

                      <span className="text-sm font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {formatPrice(price)}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-amber-200/40 dark:border-amber-800/30">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{selected.size}/{products.length} đã chọn</span>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatPrice(totalPrice)}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddAll}
                  disabled={selected.size === 0 || adding}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-all shadow-md"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {expanded && products.length === 0 && !loading && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Chưa có sản phẩm phù hợp trong cửa hàng
              </p>
              <Link
                to="/shop"
                onClick={scrollWindowToTop}
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline font-medium"
              >
                Khám phá cửa hàng →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
