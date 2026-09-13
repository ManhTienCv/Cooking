import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';
import AdminConfirmModal from '../components/AdminConfirmModal';
import Pagination from '../../../components/ui/Pagination';

export default function ApprovalsTab() {
  const [recipes, setRecipes] = useState<Record<string, unknown>[]>([]);
  const [blogs, setBlogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipePage, setRecipePage] = useState(1);
  const [blogPage, setBlogPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const loadApprovals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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
  }, []);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  const triggerApproveReject = useCallback((type: 'recipes' | 'blogs', id: string, action: 'approve' | 'reject', title: string) => {
    const isApprove = action === 'approve';
    const contentLabel = type === 'recipes' ? 'công thức' : 'bài viết';
    
    setConfirmModal({
      open: true,
      title: isApprove ? `Duyệt ${contentLabel}` : `Từ chối ${contentLabel}`,
      type: isApprove ? 'approve' : 'danger',
      confirmText: isApprove ? 'Đồng ý duyệt' : 'Đồng ý từ chối',
      description: (
        <span>
          Bạn có chắc chắn muốn <strong>{isApprove ? 'duyệt' : 'từ chối'}</strong> {contentLabel} <strong>{title}</strong> này không?
        </span>
      ),
      onConfirm: async () => {
        try {
          await apiJson(`/api/admin/${type}/${id}/${action}`, { method: 'POST' });
          toast.success(`Đã ${isApprove ? 'duyệt' : 'từ chối'} thành công!`);
          if (type === 'recipes') {
            setRecipes((prev) => prev.filter((r) => String(r.id) !== id));
          } else {
            setBlogs((prev) => prev.filter((b) => String(b.id) !== id));
          }
          void loadApprovals(true);
        } catch {
          toast.error('Có lỗi xảy ra, vui lòng thử lại.');
        }
      }
    });
  }, [loadApprovals]);

  useEffect(() => {
    if (recipePage > 1 && (recipePage - 1) * PAGE_SIZE >= recipes.length) {
      setRecipePage(Math.max(1, Math.ceil(recipes.length / PAGE_SIZE)));
    }
  }, [recipes.length, recipePage]);

  useEffect(() => {
    if (blogPage > 1 && (blogPage - 1) * PAGE_SIZE >= blogs.length) {
      setBlogPage(Math.max(1, Math.ceil(blogs.length / PAGE_SIZE)));
    }
  }, [blogs.length, blogPage]);

  const paginatedRecipes = useMemo(() => {
    const start = (recipePage - 1) * PAGE_SIZE;
    return recipes.slice(start, start + PAGE_SIZE);
  }, [recipes, recipePage]);

  const paginatedBlogs = useMemo(() => {
    const start = (blogPage - 1) * PAGE_SIZE;
    return blogs.slice(start, start + PAGE_SIZE);
  }, [blogs, blogPage]);

  if (loading) return <div className="p-12 text-center text-slate-500">Đang tải...</div>;

  const totalPending = recipes.length + blogs.length;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Duyệt bài</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Hiện có <strong className="text-slate-800 dark:text-white">{totalPending}</strong> nội dung đang chờ phê duyệt.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Recipes */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Công thức chờ duyệt</h3>
            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold px-3 py-1 rounded-full">
              {recipes.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recipes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Không có công thức nào đang chờ.</div>
            ) : (
              paginatedRecipes.map((r) => (
                <div key={String(r.id)} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base truncate">{String(r.title)}</h4>
                    <p className="text-sm text-slate-500 mt-1">bởi {String(r.author_name || 'Ẩn danh')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => triggerApproveReject('recipes', String(r.id), 'approve', String(r.title))}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => triggerApproveReject('recipes', String(r.id), 'reject', String(r.title))}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {recipes.length > PAGE_SIZE && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Hiển thị <strong className="text-slate-700 dark:text-slate-200">{Math.min((recipePage - 1) * PAGE_SIZE + 1, recipes.length)}</strong> -{' '}
                <strong className="text-slate-700 dark:text-slate-200">{Math.min(recipePage * PAGE_SIZE, recipes.length)}</strong> /{' '}
                <strong className="text-slate-700 dark:text-slate-200">{recipes.length}</strong>
              </p>
              <div className="scale-90 origin-center sm:origin-right">
                <Pagination
                  currentPage={recipePage}
                  totalItems={recipes.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setRecipePage}
                  autoScrollTop={false}
                  activeClassName="bg-blue-600 text-white shadow-md border-blue-600 dark:bg-blue-600 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pending Blogs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Bài viết chờ duyệt</h3>
            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold px-3 py-1 rounded-full">
              {blogs.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {blogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Không có bài viết nào đang chờ.</div>
            ) : (
              paginatedBlogs.map((b) => (
                <div key={String(b.id)} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base truncate">{String(b.title)}</h4>
                    <p className="text-sm text-slate-500 mt-1">bởi {String(b.author_name || 'Ẩn danh')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => triggerApproveReject('blogs', String(b.id), 'approve', String(b.title))}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => triggerApproveReject('blogs', String(b.id), 'reject', String(b.title))}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {blogs.length > PAGE_SIZE && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Hiển thị <strong className="text-slate-700 dark:text-slate-200">{Math.min((blogPage - 1) * PAGE_SIZE + 1, blogs.length)}</strong> -{' '}
                <strong className="text-slate-700 dark:text-slate-200">{Math.min(blogPage * PAGE_SIZE, blogs.length)}</strong> /{' '}
                <strong className="text-slate-700 dark:text-slate-200">{blogs.length}</strong>
              </p>
              <div className="scale-90 origin-center sm:origin-right">
                <Pagination
                  currentPage={blogPage}
                  totalItems={blogs.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setBlogPage}
                  autoScrollTop={false}
                  activeClassName="bg-blue-600 text-white shadow-md border-blue-600 dark:bg-blue-600 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

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
