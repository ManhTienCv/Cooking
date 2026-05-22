import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import AdminConfirmModal from '../components/AdminConfirmModal';

export default function UsersTab() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ users: Record<string, unknown>[] }>('/api/admin/users');
      setUsers(data.users ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const triggerDeleteUser = useCallback((id: string, name: string) => {
    setConfirmModal({
      open: true,
      title: 'Xóa người dùng',
      type: 'danger',
      confirmText: 'Đồng ý xóa',
      description: (
        <span>
          Bạn có chắc chắn muốn xóa người dùng <strong>{name}</strong>? Hành động này sẽ xóa vĩnh viễn tài khoản và các dữ liệu liên quan.
        </span>
      ),
      onConfirm: async () => {
        try {
          await apiJson(`/api/admin/users/${id}`, { method: 'DELETE' });
          toast.success('Đã xóa người dùng thành công!');
          void loadUsers();
        } catch {
          toast.error('Lỗi khi xóa người dùng');
        }
      }
    });
  }, [loadUsers]);

  const columns = useMemo(() => [
    { key: 'id', label: 'ID' },
    { key: 'full_name', label: 'Họ tên' },
    { key: 'email', label: 'Email' },
    {
      key: 'created_at',
      label: 'Ngày tham gia',
      render: (val: unknown) => new Date(String(val)).toLocaleDateString('vi-VN'),
    },
  ], []);

  const actions = useCallback((row: Record<string, unknown>) => (
    <button
      onClick={() => triggerDeleteUser(String(row.id), String(row.full_name))}
      className="text-red-600 hover:text-red-800 font-medium text-sm"
    >
      Xóa
    </button>
  ), [triggerDeleteUser]);

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <>
      <DataTableTab
        title="Người dùng"
        rows={users}
        columns={columns}
        actions={actions}
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
    </>
  );
}
