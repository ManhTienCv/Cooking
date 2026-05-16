import { useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function UsersTab() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

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

  const onDeleteUser = useCallback(async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    try {
      await apiJson(`/api/admin/users/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa người dùng thành công!');
      void loadUsers();
    } catch {
      toast.error('Lỗi khi xóa người dùng');
    }
  }, [loadUsers]);

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

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
      onClick={() => void onDeleteUser(String(row.id))}
      className="text-red-600 hover:text-red-800 font-medium text-sm"
    >
      Xóa
    </button>
  ), [onDeleteUser]);

  return (
    <DataTableTab
      title="Người dùng"
      rows={users}
      columns={columns}
      actions={actions}
    />
  );
}
