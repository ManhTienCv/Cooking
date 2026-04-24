import { useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function CategoriesTab() {
  const [type, setType] = useState<'recipe' | 'blog'>('recipe');
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const c = await apiJson<{ categories: Record<string, unknown>[] }>(`/api/admin/categories/${type}`);
      setCategories(c.categories ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [type]);

  const handleAdd = async () => {
    const name = window.prompt('Nhập tên danh mục mới:');
    if (!name) return;
    try {
      await apiJson(`/api/admin/categories/${type}`, { method: 'POST', body: JSON.stringify({ name }) });
      toast.success('Đã thêm danh mục mới');
      await load();
    } catch {
      toast.error('Lỗi khi thêm danh mục');
    }
  };

  const handleEdit = async (id: string, currentName: string) => {
    const name = window.prompt('Nhập tên mới:', currentName);
    if (!name || name === currentName) return;
    try {
      await apiJson(`/api/admin/categories/${type}/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
      toast.success('Cập nhật thành công');
      await load();
    } catch {
      toast.error('Lỗi khi cập nhật danh mục');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa danh mục này? Nó có thể ảnh hưởng đến bài viết đang sử dụng.')) {
      try {
        await apiJson(`/api/admin/categories/${type}/${id}`, { method: 'DELETE' });
        toast.success('Xóa danh mục thành công');
        await load();
      } catch {
        toast.error('Lỗi khi xóa. Vui lòng kiểm tra lại');
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setType('recipe')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${type === 'recipe' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
          >
            Công thức
          </button>
          <button
            onClick={() => setType('blog')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${type === 'blog' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
          >
            Bài viết
          </button>
        </div>
        <button
          onClick={() => void handleAdd()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          + Thêm danh mục
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500">Đang tải...</div>
      ) : (
        <DataTableTab
          title={`Danh mục ${type === 'recipe' ? 'Công thức' : 'Bài viết'}`}
          rows={categories}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Tên danh mục' },
          ]}
          actions={(row) => (
            <div className="flex justify-end gap-3 text-sm font-medium">
              <button
                onClick={() => void handleEdit(String(row.id), String(row.name))}
                className="text-blue-600 hover:text-blue-800"
              >
                Sửa
              </button>
              <button
                onClick={() => void handleDelete(String(row.id))}
                className="text-red-600 hover:text-red-800"
              >
                Xóa
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}
