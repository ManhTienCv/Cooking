import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

interface AdminOrder {
  id: number;
  total_amount: number;
  status: string;
  shipping_name: string;
  buyer_email: string;
  created_at: string;
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Chờ xác nhận', color: 'text-amber-600 bg-amber-50' },
  { value: 'confirmed', label: 'Đã xác nhận', color: 'text-blue-600 bg-blue-50' },
  { value: 'preparing', label: 'Đang chuẩn bị', color: 'text-purple-600 bg-purple-50' },
  { value: 'shipping', label: 'Đang giao', color: 'text-orange-600 bg-orange-50' },
  { value: 'delivered', label: 'Đã giao', color: 'text-emerald-600 bg-emerald-50' },
  { value: 'completed', label: 'Hoàn thành', color: 'text-green-600 bg-green-50' },
  { value: 'cancelled', label: 'Đã hủy', color: 'text-red-600 bg-red-50' },
];

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function MarketOrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
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
    }
  }, [statusFilter]);

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

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o => 
      o.id.toString().includes(q) || 
      o.shipping_name.toLowerCase().includes(q) || 
      (o.buyer_email && o.buyer_email.toLowerCase().includes(q))
    );
  }, [orders, search]);

  const getStatusLabel = (s: string) => ORDER_STATUSES.find(st => st.value === s)?.label ?? s;
  const getStatusColor = (s: string) => ORDER_STATUSES.find(st => st.value === s)?.color ?? 'bg-slate-50 text-slate-600';

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Quản lý đơn hàng</h2>
        <p className="text-slate-500 dark:text-slate-400">Xem và cập nhật trạng thái đơn hàng toàn sàn.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã đơn, tên khách, email..."
            className="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-400/20 outline-none" 
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
        </div>

        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm font-medium outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">{total} đơn hàng</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Đang tải...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Không có đơn hàng nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">Mã đơn</th>
                  <th className="px-6 py-4 font-semibold">Khách hàng</th>
                  <th className="px-6 py-4 font-semibold">Tổng tiền</th>
                  <th className="px-6 py-4 font-semibold">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">#{o.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 dark:text-white">{o.shipping_name}</p>
                      <p className="text-xs text-slate-400">{o.buyer_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-red-600 dark:text-red-400">{formatPrice(o.total_amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(o.status)}`}>
                        {getStatusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select 
                        value={o.status} 
                        onChange={e => void onUpdateStatus(o.id, e.target.value)}
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 px-2 py-1 outline-none"
                      >
                        {ORDER_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
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
