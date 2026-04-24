import { useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function RecipesTab() {
  const [recipes, setRecipes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await apiJson<{ recipes: Record<string, unknown>[] }>('/api/admin/recipes?status=all');
      setRecipes(r.recipes ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAction = async (id: string, action: string) => {
    if (action === 'delete') {
      if (!window.confirm('Bạn có chắc chắn muốn xóa công thức này?')) return;
      try {
        await apiJson(`/api/admin/recipes/${id}`, { method: 'DELETE' });
        toast.success('Đã xóa công thức thành công!');
      } catch {
        toast.error('Lỗi khi xóa công thức');
        return;
      }
    } else {
      try {
        await apiJson(`/api/admin/recipes/${id}/${action}`, { method: 'POST' });
        toast.success(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} công thức!`);
      } catch {
        toast.error('Lỗi khi cập nhật trạng thái');
        return;
      }
    }
    await load();
  };

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <DataTableTab
      title="Công thức"
      rows={recipes}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Tiêu đề' },
        { key: 'author_name', label: 'Tác giả' },
        { key: 'category_name', label: 'Danh mục' },
        {
          key: 'status',
          label: 'Trạng thái',
          render: (val) => (
            <span
              className={`px-2 py-1 rounded text-xs font-bold ${
                val === 'approved'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : val === 'rejected'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}
            >
              {val === 'approved' ? 'Đã duyệt' : val === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
            </span>
          ),
        },
      ]}
      actions={(row) => (
        <div className="flex justify-end gap-3 text-sm font-medium">
          {row.status === 'pending' && (
            <>
              <button onClick={() => void handleAction(String(row.id), 'approve')} className="text-green-600 hover:text-green-800">
                Duyệt
              </button>
              <button onClick={() => void handleAction(String(row.id), 'reject')} className="text-yellow-600 hover:text-yellow-800">
                Từ chối
              </button>
            </>
          )}
          <button onClick={() => void handleAction(String(row.id), 'delete')} className="text-red-600 hover:text-red-800">
            Xóa
          </button>
        </div>
      )}
    />
  );
}
