import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Store } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCart } from '../../contexts/CartContext';
import { Reveal } from '../../components/motion/ScrollReveal';
import { scrollWindowToTop } from '../../lib/scroll';

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function Cart() {
  const { items, total, loading, updateItem, removeItem, clearAll } = useCart();
  const [removing, setRemoving] = useState<number | null>(null);

  const handleQuantity = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      await updateItem(itemId, newQty);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật');
    }
  };

  const handleRemove = async (itemId: number) => {
    setRemoving(itemId);
    try {
      await removeItem(itemId);
      toast.success('Đã xóa khỏi giỏ');
    } catch {
      toast.error('Không thể xóa');
    } finally {
      setRemoving(null);
    }
  };

  const handleClear = async () => {
    if (!confirm('Xóa toàn bộ giỏ hàng?')) return;
    try {
      await clearAll();
      toast.success('Đã xóa giỏ hàng');
    } catch {
      toast.error('Lỗi xóa giỏ');
    }
  };

  /* Group items by seller */
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.store_name || `seller-${item.seller_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 transition-colors">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Reveal y={16}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <ShoppingBag className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-3xl font-serif italic font-bold text-black dark:text-white">Giỏ hàng</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {items.length > 0 ? `${items.length} sản phẩm trong giỏ` : 'Giỏ hàng trống'}
            </p>
          </Reveal>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Giỏ hàng trống</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Hãy khám phá cửa hàng và thêm sản phẩm yêu thích</p>
            <Link to="/shop" onClick={scrollWindowToTop} className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold hover:opacity-80 transition-opacity inline-flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Clear button */}
              <div className="flex justify-end">
                <button onClick={handleClear} className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors">
                  Xóa tất cả
                </button>
              </div>

              {/* Grouped by seller */}
              {Object.entries(grouped).map(([storeName, storeItems]) => (
                <Reveal key={storeName} y={12}>
                  <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 overflow-hidden">
                    {/* Store header */}
                    <div className="px-5 py-3 bg-gray-50 dark:bg-slate-700/40 border-b border-gray-100 dark:border-slate-700/50 flex items-center gap-2">
                      <Store className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{storeName}</span>
                    </div>

                    {/* Items */}
                    <AnimatePresence mode="popLayout">
                      {storeItems.map((item) => {
                        const price = item.product_sale_price ?? item.product_price;
                        return (
                          <motion.div
                            key={item.id}
                            layout
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25 }}
                            className="flex gap-4 p-5 border-b last:border-b-0 border-gray-50 dark:border-slate-700/30"
                          >
                            {/* Image */}
                            <Link to={`/shop/${item.product_id}`} onClick={scrollWindowToTop} className="shrink-0">
                              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700">
                                {item.product_image ? (
                                  <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">📦</div>
                                )}
                              </div>
                            </Link>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <Link to={`/shop/${item.product_id}`} onClick={scrollWindowToTop} className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 hover:text-amber-600 transition-colors">
                                {item.product_name}
                              </Link>
                              <p className="text-red-600 dark:text-red-400 font-bold mt-1">{formatPrice(price)}<span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1">/ {item.product_unit}</span></p>

                              <div className="flex items-center justify-between mt-2">
                                {/* Quantity */}
                                <div className="flex items-center gap-0 border border-gray-200 dark:border-slate-700 rounded-full overflow-hidden">
                                  <button
                                    onClick={() => handleQuantity(item.id, item.quantity - 1)}
                                    disabled={loading || item.quantity <= 1}
                                    className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                                  <button
                                    onClick={() => handleQuantity(item.id, item.quantity + 1)}
                                    disabled={loading || item.quantity >= item.product_stock}
                                    className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Subtotal + Remove */}
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(price * item.quantity)}</span>
                                  <button
                                    onClick={() => handleRemove(item.id)}
                                    disabled={removing === item.id}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                                    aria-label="Xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Tóm tắt đơn hàng</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Tạm tính ({items.length} sp)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Phí vận chuyển</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">Miễn phí</span>
                  </div>
                  <div className="border-t border-gray-100 dark:border-slate-700 pt-3 flex justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">Tổng cộng</span>
                    <span className="text-xl font-extrabold text-red-600 dark:text-red-400">{formatPrice(total)}</span>
                  </div>
                </div>

                <Link
                  to="/checkout"
                  onClick={scrollWindowToTop}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg"
                >
                  Thanh toán <ArrowRight className="w-4 h-4" />
                </Link>

                <Link to="/shop" onClick={scrollWindowToTop} className="block text-center mt-3 text-sm text-amber-600 dark:text-amber-400 hover:underline font-medium">
                  ← Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
