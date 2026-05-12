import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ChevronRight, Package } from 'lucide-react';

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

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ orders: Order[]; total: number }>(
        `/api/marketplace/orders?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`
      );
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 transition-colors">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Reveal y={16}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-serif italic font-bold text-black dark:text-white">Đơn hàng</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{total > 0 ? `${total} đơn hàng` : 'Chưa có đơn hàng'}</p>
          </Reveal>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-slate-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
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
              return (
                <Reveal key={order.id} y={12}>
                  <Link
                    to={`/orders/${order.id}`}
                    onClick={scrollWindowToTop}
                    className="block bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                          <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">#{order.id}</span>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${st.color}`}>{st.label}</span>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(order.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">{formatPrice(order.total_amount)}</span>
                        <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-black dark:group-hover:text-white transition-colors" />
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
