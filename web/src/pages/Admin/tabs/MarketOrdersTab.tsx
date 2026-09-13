import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X, Truck, ExternalLink, RefreshCw, Package } from 'lucide-react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';
import Pagination from '../../../components/ui/Pagination';

interface AdminOrder {
  id: number;
  order_code?: string;
  total_amount: number;
  status: string;
  shipping_name: string;
  shipping_phone?: string;
  shipping_address?: string;
  buyer_email: string;
  created_at: string;
  payment_method?: string;
  payment_status?: string;
  tracking_code?: string;
  ghn_order_code?: string;
  shipping_partner?: string;
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Chờ xử lý', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'confirmed', label: 'Đã xác nhận', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'preparing', label: 'Đang đóng gói', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { value: 'shipping', label: 'Đang giao (GHN)', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { value: 'delivered', label: 'Đã giao', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'completed', label: 'Hoàn tất', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'cancelled', label: 'Đã hủy (Hoàn kho)', color: 'text-red-700 bg-red-50 border-red-200' },
];

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function MarketOrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const loadOrders = useCallback(async () => {
    if (!hasLoadedOnce) {
      setLoading(true);
    }
    try {
      const d = await apiJson<{ orders: AdminOrder[]; total: number }>(
        `/api/admin/marketplace/orders?status=${statusFilter}&limit=50`
      );
      setOrders(d.orders ?? []);
      setTotal(d.total ?? 0);
    } catch {
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [statusFilter, hasLoadedOnce]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const onUpdateStatus = useCallback(async (orderId: number, status: string) => {
    try {
      await apiJson(`/api/admin/marketplace/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast.success('Cập nhật trạng thái thành công!');
      void loadOrders();
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  }, [loadOrders]);

  /* 🚚 1-Click Dispatch to GHN Express */
  const handle1ClickGhn = async (order: AdminOrder) => {
    if (order.ghn_order_code || order.tracking_code) {
      toast.error('Đơn hàng này đã có mã vận đơn GHN!');
      return;
    }
    setDispatchingId(order.id);
    try {
      const res = await apiJson<{ success: boolean; order_code: string; message: string }>(
        `/api/admin/marketplace/orders/${order.id}/ghn-create`,
        { method: 'POST' }
      );
      toast.success(`Tạo vận đơn GHN thành công: ${res.order_code}!`);
      void loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tạo vận đơn GHN');
    } finally {
      setDispatchingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o => 
      o.id.toString().includes(q) || 
      (o.order_code && o.order_code.toLowerCase().includes(q)) ||
      o.shipping_name.toLowerCase().includes(q) || 
      (o.buyer_email && o.buyer_email.toLowerCase().includes(q)) ||
      (o.tracking_code && o.tracking_code.toLowerCase().includes(q))
    );
  }, [orders, search]);

  // Reset về trang 1 khi thay đổi điều kiện lọc / tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Điều chỉnh trang nếu số lượng đơn hàng giảm
  useEffect(() => {
    if (currentPage > 1 && (currentPage - 1) * PAGE_SIZE >= filteredOrders.length) {
      setCurrentPage(Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE)));
    }
  }, [filteredOrders.length, currentPage]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const getStatusLabel = (s: string) => ORDER_STATUSES.find(st => st.value === s)?.label ?? s;
  const getStatusColor = (s: string) => ORDER_STATUSES.find(st => st.value === s)?.color ?? 'bg-slate-50 text-slate-600 border-slate-200';

  const renderPaymentBadge = (method?: string, status?: string) => {
    const isPaid = status === 'paid';
    if (method === 'momo') {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
          isPaid ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300' : 'bg-pink-50 text-pink-600 border border-pink-200'
        }`}>
          MoMo {isPaid ? '✓ Đã TT' : 'Chờ TT'}
        </span>
      );
    }
    if (method === 'vietqr' || method === 'bank_transfer') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200">
          VietQR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200">
        COD (Tiền mặt)
      </span>
    );
  };

  return (
    <div className="font-vietnam space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-slate-900 dark:text-white" />
            Quản lý Đơn Hàng KitchenCook
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Đóng gói, quản lý thanh toán MoMo/COD và 1-Click gửi vận đơn GHN Express cho khách hàng.
          </p>
        </div>
        <button
          onClick={() => void loadOrders()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã đơn KC-, tên khách, số điện thoại..."
            className="w-full pl-10 pr-8 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 text-xs sm:text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 dark:focus:border-white outline-none" 
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
        </div>

        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-xs sm:text-sm font-medium outline-none focus:border-slate-900 dark:focus:border-white"
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <span className="ml-auto text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
          {total} đơn hàng KitchenCook
        </span>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500">Đang tải danh sách đơn hàng...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-slate-500">Không tìm thấy đơn hàng nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 font-bold">
                <tr>
                  <th className="px-5 py-3.5">Mã đơn hàng</th>
                  <th className="px-5 py-3.5">Khách hàng & Địa chỉ</th>
                  <th className="px-5 py-3.5">Thanh toán</th>
                  <th className="px-5 py-3.5">Tổng tiền</th>
                  <th className="px-5 py-3.5">Vận chuyển (GHN)</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedOrders.map(o => {
                  const trackingCode = o.tracking_code || o.ghn_order_code;
                  const canDispatchGhn = (o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing') && !trackingCode;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                      {/* Mã đơn */}
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                          {o.order_code || `CAM-${String(o.id).padStart(6, '0')}`}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(o.created_at).toLocaleString('vi-VN')}
                        </p>
                      </td>

                      {/* Khách hàng */}
                      <td className="px-5 py-4 max-w-xs">
                        <p className="font-bold text-slate-800 dark:text-white">{o.shipping_name || 'Khách hàng'}</p>
                        {o.shipping_phone && <p className="text-xs text-slate-500 font-mono">{o.shipping_phone}</p>}
                        {o.shipping_address && <p className="text-[11px] text-slate-400 truncate mt-0.5" title={o.shipping_address}>{o.shipping_address}</p>}
                      </td>

                      {/* Thanh toán */}
                      <td className="px-5 py-4">
                        {renderPaymentBadge(o.payment_method, o.payment_status)}
                      </td>

                      {/* Tổng tiền */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                          {formatPrice(o.total_amount)}
                        </span>
                      </td>

                      {/* Vận đơn GHN */}
                      <td className="px-5 py-4">
                        {trackingCode ? (
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs">
                              {trackingCode}
                            </span>
                            <a
                              href={`https://donhang.ghn.vn/?order_code=${trackingCode}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 font-semibold underline"
                            >
                              Tra cứu GHN
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : canDispatchGhn ? (
                          <button
                            type="button"
                            disabled={dispatchingId === o.id}
                            onClick={() => void handle1ClickGhn(o)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            title="Tạo vận đơn bưu cục GHN Express ngay lập tức"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            {dispatchingId === o.id ? 'Đang đẩy GHN...' : '🚚 1-Click GHN'}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Chưa tạo vận đơn</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(o.status)}`}>
                          {getStatusLabel(o.status)}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="px-5 py-4 text-right">
                        <select 
                          value={o.status} 
                          onChange={e => void onUpdateStatus(o.id, e.target.value)}
                          className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 px-2.5 py-1.5 outline-none focus:border-slate-900 dark:focus:border-white"
                        >
                          {ORDER_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredOrders.length > PAGE_SIZE && (
          <div className="p-5 border-t border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hiển thị <strong className="text-slate-700 dark:text-slate-200">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredOrders.length)}</strong> -{' '}
              <strong className="text-slate-700 dark:text-slate-200">{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)}</strong> trên tổng số{' '}
              <strong className="text-slate-700 dark:text-slate-200">{filteredOrders.length}</strong> đơn hàng
            </p>
            <div className="scale-90 sm:scale-95 origin-center sm:origin-right">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredOrders.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                autoScrollTop={false}
                activeClassName="bg-blue-600 text-white shadow-md border-blue-600 dark:bg-blue-600 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
