import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';

export default function BlogsTab() {
  const [blogs, setBlogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ blogs: Record<string, unknown>[] }>('/api/admin/blogs?status=all');
      setBlogs(data.blogs ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlogs();
  }, [loadBlogs]);

  const onBlogAction = useCallback(async (id: string, action: string) => {
    if (action === 'delete') {
      if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
      try {
        await apiJson(`/api/admin/blogs/${id}`, { method: 'DELETE' });
        toast.success('Đã xóa bài viết thành công!');
      } catch {
        toast.error('Lỗi khi xóa bài viết');
        return;
      }
    } else {
      try {
        await apiJson(`/api/admin/blogs/${id}/${action}`, { method: 'POST' });
        toast.success(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} bài viết!`);
      } catch {
        toast.error('Lỗi khi cập nhật trạng thái');
        return;
      }
    }
    void loadBlogs();
  }, [loadBlogs]);

  const columns = useMemo(() => [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Tiêu đề' },
    { key: 'author_name', label: 'Tác giả' },
    { key: 'category_name', label: 'Danh mục' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (val: unknown) => (
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
  ], []);

  const actions = useCallback((row: Record<string, unknown>) => (
    <div className="flex justify-end gap-3 text-sm font-medium">
      {row.status === 'pending' && (
        <>
          <button onClick={() => void onBlogAction(String(row.id), 'approve')} className="text-green-600 hover:text-green-800">
            Duyệt
          </button>
          <button onClick={() => void onBlogAction(String(row.id), 'reject')} className="text-yellow-600 hover:text-yellow-800">
            Từ chối
          </button>
        </>
      )}
      <button onClick={() => void onBlogAction(String(row.id), 'delete')} className="text-red-600 hover:text-red-800">
        Xóa
      </button>
    </div>
  ), [onBlogAction]);

  if (loading) return <div className="p-12 text-center text-slate-500">Đang tải...</div>;

  return (
    <DataTableTab
      title="Bài viết Blog"
      rows={blogs}
      columns={columns}
      actions={actions}
    />
  );
}
