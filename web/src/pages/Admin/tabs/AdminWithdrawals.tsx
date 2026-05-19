import { useState, useEffect } from 'react';
import { Wallet, CheckCircle, XCircle, Ban } from 'lucide-react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

interface WithdrawalRequest {
  id: string;
  user_id: number;
  fullname: string;
  email: string;
  amount: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  processing: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Đã duyệt', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function AdminWithdrawals() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await apiJson<{ withdrawals: WithdrawalRequest[] }>('/api/admin/withdrawals');
      setRequests(res.withdrawals || []);
    } catch {
      toast.error('Lỗi tải danh sách rút tiền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'duyệt' : 'từ chối';
    if (!window.confirm(`Xác nhận ${label} lệnh rút tiền này?`)) return;
    try {
      await apiJson(`/api/admin/withdrawals/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ adminNote: '' }),
      });
      toast.success(`Đã ${label} lệnh rút tiền.`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi thao tác');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
        <Wallet className="w-7 h-7 text-emerald-500" /> Duyệt Rút Tiền (Ví Cook)
      </h1>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Ban className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Chưa có lệnh rút tiền nào.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Người dùng</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Số tiền</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Ngân hàng</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Ngày tạo</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Trạng thái</th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {requests.map((r) => {
                  const st = STATUS_MAP[r.status] || { label: r.status, color: 'bg-slate-100 text-slate-700' };
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{r.fullname}</p>
                        <p className="text-xs text-slate-500">{r.email}</p>
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {Number(r.amount).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{r.bank_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{r.account_number}</p>
                        <p className="text-xs text-slate-500">{r.account_name}</p>
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {new Date(r.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="p-4">
                        {(r.status === 'pending' || r.status === 'processing') && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(r.id, 'approve')}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                              title="Duyệt"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleAction(r.id, 'reject')}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Từ chối"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
