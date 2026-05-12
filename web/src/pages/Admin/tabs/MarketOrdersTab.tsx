import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

interface AdminOrder {
  id: number;
  buyer_id: number;
  buyer_name: string;
  buyer_email: string;
  total_amount: number;
  status: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  payment_method: string;
  created_at: string;
}

const ORDER_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'preparing', label: 'Đang chuẩn bị' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function getStatusColor(s: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    preparing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    shipping: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[s] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
}

export default function MarketOrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `status=${statusFilter}&` : '';
      const d = await apiJson<{ orders: AdminOrder[]; total: number }>(
        `/api/admin/marketplace/orders?${q}limit=50`
      );
      setOrders(d.orders ?? []);
      setTotal(d.total ?? 0);
    } catch {
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (!window.confirm(`Cập nhật đơn #${orderId} → ${newStatus}?`)) return;
    setUpdatingId(orderId);
    try {
      await apiJson(`/api/admin/marketplace/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success('Đã cập nhật trạng thái!');
      await load();
    } catch {
      toast.error('Lỗi cập nhật trạng thái');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Quản lý đơn hàng</h2>
        <p className="text-slate-500 dark:text-slate-400">Theo dõi và cập nhật trạng thái tất cả đơn hàng.</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ORDER_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              statusFilter === s.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto self-center text-sm text-slate-500 dark:text-slate-400">{total} đơn hàng</span>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">Không có đơn hàng nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Mã đơn</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Khách hàng</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Giao hàng</th>
                  <th className="text-right p-4 font-semibold text-slate-600 dark:text-slate-300">Tổng tiền</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Thanh toán</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Trạng thái</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Ngày tạo</th>
                  <th className="text-right p-4 font-semibold text-slate-600 dark:text-slate-300">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-bold text-slate-800 dark:text-white">#{o.id}</td>
                    <td className="p-4">
                      <p className="font-medium text-slate-700 dark:text-slate-200">{o.buyer_name}</p>
                      <p className="text-xs text-slate-400">{o.buyer_email}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-slate-600 dark:text-slate-300">{o.shipping_name}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{o.shipping_address}</p>
                    </td>
                    <td className="p-4 text-right font-bold text-red-600 dark:text-red-400">
                      {formatPrice(o.total_amount)}
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-300 uppercase">{o.payment_method}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(o.status)}`}>
                        {ORDER_STATUSES.find(s => s.value === o.status)?.label ?? o.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-4 text-right">
                      {!['completed', 'cancelled'].includes(o.status) && (
                        <select
                          value=""
                          disabled={updatingId === o.id}
                          onChange={(e) => {
                            if (e.target.value) void handleStatusChange(o.id, e.target.value);
                          }}
                          className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 px-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                        >
                          <option value="">Chuyển →</option>
                          {ORDER_STATUSES.filter(s => s.value && s.value !== o.status).map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
