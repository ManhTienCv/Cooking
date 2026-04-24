import { useEffect, useState } from 'react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function ApprovalsTab() {
  const [recipes, setRecipes] = useState<Record<string, unknown>[]>([]);
  const [blogs, setBlogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [r, b] = await Promise.all([
        apiJson<{ recipes: Record<string, unknown>[] }>('/api/admin/recipes?status=pending'),
        apiJson<{ blogs: Record<string, unknown>[] }>('/api/admin/blogs?status=pending'),
      ]);
      setRecipes(r.recipes ?? []);
      setBlogs(b.blogs ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAction = async (type: 'recipes' | 'blogs', id: string, action: 'approve' | 'reject') => {
    if (window.confirm(`Bạn có chắc chắn muốn ${action === 'approve' ? 'Duyệt' : 'Từ chối'} nội dung này?`)) {
      try {
        await apiJson(`/api/admin/${type}/${id}/${action}`, { method: 'POST' });
        toast.success(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} thành công!`);
        await load();
      } catch {
        toast.error('Có lỗi xảy ra, vui lòng thử lại.');
      }
    }
  };

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  const totalPending = recipes.length + blogs.length;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Duyệt bài</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Hiện có {totalPending} nội dung đang chờ phê duyệt.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Recipes */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Công thức chờ duyệt</h3>
            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold px-3 py-1 rounded-full">
              {recipes.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recipes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">Không có công thức nào đang chờ.</div>
            ) : (
              recipes.map((r) => (
                <div key={String(r.id)} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{String(r.title)}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">bởi {String(r.author_name || 'Ẩn danh')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => void handleAction('recipes', String(r.id), 'approve')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => void handleAction('recipes', String(r.id), 'reject')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Blogs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Bài viết chờ duyệt</h3>
            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold px-3 py-1 rounded-full">
              {blogs.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {blogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">Không có bài viết nào đang chờ.</div>
            ) : (
              blogs.map((b) => (
                <div key={String(b.id)} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{String(b.title)}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">bởi {String(b.author_name || 'Ẩn danh')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => void handleAction('blogs', String(b.id), 'approve')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => void handleAction('blogs', String(b.id), 'reject')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
