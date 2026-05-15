import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

interface AdminSeller {
  user_id: number;
  full_name: string;
  email: string;
  store_name: string;
  store_description: string | null;
  phone: string | null;
  address: string | null;
  is_verified: boolean;
  total_sales: number;
  rating: number;
  created_at: string;
}

export default function SellersTab() {
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiJson<{ sellers: AdminSeller[]; total: number }>(
        '/api/admin/marketplace/sellers?limit=50'
      );
      setSellers(d.sellers ?? []);
      setTotal(d.total ?? 0);
    } catch {
      toast.error('Không thể tải danh sách người bán');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleVerify = async (id: number, is_verified: boolean) => {
    try {
      await apiJson(`/api/admin/marketplace/sellers/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ is_verified }),
      });
      toast.success(is_verified ? 'Đã duyệt người bán!' : 'Đã hủy duyệt người bán!');
      void load();
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Người bán</h2>
          <p className="text-sm text-slate-500">Quản lý các tài khoản đăng ký bán hàng ({total} tài khoản)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Đang tải...</div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Chưa có người bán nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Cửa hàng</th>
                  <th className="px-6 py-4 font-semibold">Người bán</th>
                  <th className="px-6 py-4 font-semibold">Liên hệ</th>
                  <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {sellers.map((s) => (
                  <tr key={s.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{s.store_name}</div>
                      <div className="text-xs text-slate-500 max-w-[200px] truncate" title={s.store_description || ''}>{s.store_description || 'Không có mô tả'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{s.full_name}</div>
                      <div className="text-xs text-slate-500">{s.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 dark:text-slate-300">{s.phone || 'N/A'}</div>
                      <div className="text-xs text-slate-500 max-w-[150px] truncate" title={s.address || ''}>{s.address || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        s.is_verified ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {s.is_verified ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.is_verified ? (
                        <button
                          onClick={() => handleVerify(s.user_id, false)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Khóa
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerify(s.user_id, true)}
                          className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Duyệt
                        </button>
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
