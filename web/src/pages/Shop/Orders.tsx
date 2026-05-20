import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ChevronRight, Package, Search, X } from 'lucide-react';

import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import Pagination from '../../components/ui/Pagination';
import { scrollWindowToTop } from '../../lib/scroll';
import type { Order } from '../../types/marketplace';

const PAGE_SIZE = 10;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  preparing: { label: 'Đang chuẩn bị', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  shipping: { label: 'Đang giao', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  delivered: { label: 'Đã giao', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function formatOrderCode(order: Order) {
  const year = new Date(order.created_at).getFullYear();
  return `DH-${year}-${String(order.id).padStart(6, '0')}`;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const qParam = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
      const data = await apiJson<{ orders: Order[]; total: number }>(
        `/api/marketplace/orders?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}${qParam}`
      );
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 transition-colors pt-24 pb-16">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20 mb-8 rounded-3xl max-w-5xl mx-auto shadow-sm">
        <div className="px-6 py-8">
          <Reveal y={16}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h1 className="text-3xl font-serif italic font-bold text-black dark:text-white">Đơn hàng</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{total > 0 ? `${total} đơn hàng` : 'Chưa có đơn hàng'}</p>
              </div>

              {/* Premium Search input */}
              <div className="w-full md:w-80 relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo sản phẩm, mã đơn..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-sm shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-slate-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800/40 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chưa có đơn hàng</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Hãy bắt đầu mua sắm để tạo đơn hàng đầu tiên</p>
            <Link to="/shop" onClick={scrollWindowToTop} className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold hover:opacity-80 transition-opacity inline-flex items-center gap-2">
              <Package className="w-4 h-4" /> Mua sắm
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const st = STATUS_MAP[order.status] ?? STATUS_MAP['pending'];
              const hasItems = order.items && order.items.length > 0;
              const firstItem = hasItems ? order.items![0] : null;

              return (
                <Reveal key={order.id} y={12}>
                  <Link
                    to={`/orders/${order.id}`}
                    onClick={scrollWindowToTop}
                    className="block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-lg dark:border-slate-700/60 dark:bg-slate-800/80 dark:hover:border-slate-600 group"
                  >
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        {/* Product Image / Logo */}
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-900/20 dark:ring-blue-900/40 overflow-hidden shadow-inner">
                          {firstItem?.product_image ? (
                            <img
                              src={firstItem.product_image}
                              alt={firstItem.product_name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const t = e.target as HTMLImageElement;
                                t.src = '/assets/images/default-product.jpg';
                              }}
                            />
                          ) : (
                            <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-gray-100 dark:bg-slate-700 px-3 py-0.5 text-xs font-extrabold tracking-wide text-gray-700 dark:text-slate-200">
                              {formatOrderCode(order)}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.color}`}>{st.label}</span>
                          </div>

                          {/* Product names */}
                          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white truncate max-w-md">
                            {firstItem ? (
                              <>
                                {firstItem.product_name}
                                {firstItem.quantity > 1 && ` (x${firstItem.quantity})`}
                                {order.items && order.items.length > 1 && ` và ${order.items.length - 1} sản phẩm khác`}
                              </>
                            ) : (
                              'Đơn mua tại Marketplace'
                            )}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : order.payment_method}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4 sm:border-t-0 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tổng thanh toán</p>
                          <p className="mt-1 text-xl font-black text-red-600 dark:text-red-400">{formatPrice(order.total_amount)}</p>
                        </div>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition group-hover:bg-gray-950 group-hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-white dark:group-hover:text-slate-950">
                          <ChevronRight className="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}

            <Pagination currentPage={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
