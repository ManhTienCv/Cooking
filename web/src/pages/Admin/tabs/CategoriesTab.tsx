import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function CategoriesTab() {
  const [type, setType] = useState<'recipe' | 'blog'>('recipe');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ categories: Category[] }>(`/api/admin/categories/${type}`);
      setCategories(data.categories ?? []);
    } catch {
      toast.error('Không tải được danh mục');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await apiJson(`/api/admin/categories/${type}`, {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName('');
      toast.success('Đã thêm danh mục');
      void loadCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi tạo');
    } finally {
      setBusy(false);
    }
  };

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !newName.trim()) return;
    setBusy(true);
    try {
      await apiJson(`/api/admin/categories/${type}/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName.trim() }),
      });
      setEditing(null);
      setNewName('');
      toast.success('Đã cập nhật');
      void loadCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Xóa danh mục này?')) return;
    try {
      await apiJson(`/api/admin/categories/${type}/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa');
      void loadCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa');
    }
  };

  const startEdit = (cat: Category) => {
    setEditing(cat);
    setNewName(cat.name);
  };

  const cancelEdit = () => {
    setEditing(null);
    setNewName('');
  };

  const tabs = useMemo(() => [
    { key: 'recipe', label: 'Công thức' },
    { key: 'blog', label: 'Bài viết' },
  ], []);

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Quản lý danh mục</h2>
        <p className="text-slate-500 dark:text-slate-400">Thêm, sửa, xóa các danh mục nội dung.</p>
      </div>

      {/* Type Switcher */}
      <div className="flex gap-2 mb-8 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setType(tab.key as 'recipe' | 'blog'); cancelEdit(); }}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              type === tab.key
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-8 w-full">
        <form onSubmit={editing ? onUpdate : onCreate} className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={editing ? 'Tên danh mục mới' : 'Tên danh mục cần thêm'}
              className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-400/20 outline-none"
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className={`px-8 py-3 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 sm:min-w-[176px] ${
              editing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editing ? 'Cập nhật' : 'Thêm mới'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              Hủy
            </button>
          )}
        </form>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Chưa có danh mục nào.</div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {categories.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{cat.name}</p>
                  <p className="text-xs text-slate-400">{cat.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void onDelete(cat.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
