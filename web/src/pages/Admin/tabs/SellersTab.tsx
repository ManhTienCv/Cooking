import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';
import DataTableTab from './DataTableTab';
import { CheckCircle2, XCircle } from 'lucide-react';
import AdminConfirmModal from '../components/AdminConfirmModal';

interface AdminSeller {
  user_id: number;
  store_name: string;
  is_verified: boolean;
  full_name: string;
  email: string;
  created_at: string;
  phone: string | null;
  address: string | null;
}

export default function SellersTab() {
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: React.ReactNode;
    type: 'approve' | 'danger' | 'warning' | 'info';
    confirmText: string;
    onConfirm: () => Promise<void> | void;
  }>({
    open: false,
    title: '',
    description: '',
    type: 'info',
    confirmText: '',
    onConfirm: () => {}
  });

  const loadSellers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ sellers: AdminSeller[]; total: number }>('/api/admin/marketplace/sellers?limit=50');
      setSellers(data.sellers ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('Không thể tải danh sách người bán');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSellers();
  }, [loadSellers]);

  const triggerVerifySeller = useCallback((id: number, verify: boolean, storeName: string) => {
    const label = verify ? 'Duyệt' : 'Bỏ duyệt';
    setConfirmModal({
      open: true,
      title: verify ? 'Phê duyệt người bán' : 'Hủy duyệt người bán',
      type: verify ? 'approve' : 'warning',
      confirmText: verify ? 'Đồng ý duyệt' : 'Đồng ý hủy duyệt',
      description: (
        <span>
          Bạn có chắc chắn muốn <strong>{label.toLowerCase()}</strong> cửa hàng <strong>{storeName}</strong> của người bán này?
        </span>
      ),
      onConfirm: async () => {
        try {
          await apiJson(`/api/admin/marketplace/sellers/${id}/verify`, {
            method: 'POST',
            body: JSON.stringify({ is_verified: verify }),
          });
          toast.success(`Đã ${label.toLowerCase()} thành công!`);
          void loadSellers();
        } catch {
          toast.error('Có lỗi xảy ra, vui lòng thử lại.');
        }
      }
    });
  }, [loadSellers]);

  if (loading) return <div className="p-12 text-center text-slate-500">Đang tải...</div>;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Quản lý người bán</h2>
          <p className="text-slate-500 dark:text-slate-400">Phê duyệt hồ sơ đăng ký bán hàng.</p>
        </div>
        <span className="text-sm font-semibold text-slate-400">{total} người bán</span>
      </div>

      <DataTableTab
        title="Danh sách người bán"
        rows={sellers.map(s => ({ ...s, id: s.user_id }))}
        columns={[
          {
            key: 'store_name',
            label: 'Cửa hàng',
            render: (val, row) => (
              <div>
                <p className="font-bold text-slate-800 dark:text-white">{String(val)}</p>
                <p className="text-xs text-slate-400">{String(row.full_name)}</p>
              </div>
            )
          },
          { key: 'email', label: 'Email' },
          {
            key: 'is_verified',
            label: 'Xác minh',
            render: (val) => (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                val ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              }`}>
                {val ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {val ? 'Đã duyệt' : 'Chưa duyệt'}
              </span>
            )
          },
          {
            key: 'created_at',
            label: 'Ngày đăng ký',
            render: (val) => new Date(String(val)).toLocaleDateString('vi-VN')
          }
        ]}
        actions={(row) => (
          <div className="flex justify-end gap-2">
            {!row.is_verified ? (
              <button
                onClick={() => triggerVerifySeller(Number(row.user_id), true, String(row.store_name))}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Duyệt hồ sơ
              </button>
            ) : (
              <button
                onClick={() => triggerVerifySeller(Number(row.user_id), false, String(row.store_name))}
                className="px-4 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy duyệt
              </button>
            )}
          </div>
        )}
      />

      <AdminConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
