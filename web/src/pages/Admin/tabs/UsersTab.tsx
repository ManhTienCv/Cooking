import { useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function UsersTab() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const u = await apiJson<{ users: Record<string, unknown>[] }>('/api/admin/users');
      setUsers(u.users ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await apiJson(`/api/admin/users/${id}`, { method: 'DELETE' });
        toast.success('Đã xóa người dùng thành công!');
        await load();
      } catch {
        toast.error('Lỗi khi xóa người dùng');
      }
    }
  };

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <DataTableTab
      title="Người dùng"
      rows={users}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'full_name', label: 'Họ tên' },
        { key: 'email', label: 'Email' },
        {
          key: 'created_at',
          label: 'Ngày tham gia',
          render: (val) => new Date(String(val)).toLocaleDateString('vi-VN'),
        },
      ]}
      actions={(row) => (
        <button
          onClick={() => void handleDelete(String(row.id))}
          className="text-red-600 hover:text-red-800 font-medium text-sm"
        >
          Xóa
        </button>
      )}
    />
  );
}
