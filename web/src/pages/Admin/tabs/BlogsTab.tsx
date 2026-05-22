import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import AdminConfirmModal from '../components/AdminConfirmModal';

export default function BlogsTab() {
  const [blogs, setBlogs] = useState<Record<string, unknown>[]>([]);
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

  const triggerBlogAction = useCallback((id: string, action: 'approve' | 'reject' | 'delete', title: string) => {
    const isDelete = action === 'delete';
    const isApprove = action === 'approve';

    let modalTitle = 'Xóa bài viết';
    let type: 'approve' | 'danger' | 'warning' | 'info' = 'danger';
    let confirmText = 'Đồng ý xóa';
    let desc = <span>Bạn có chắc chắn muốn <strong>xóa vĩnh viễn</strong> bài viết <strong>{title}</strong> không?</span>;

    if (isApprove) {
      modalTitle = 'Duyệt bài viết';
      type = 'approve';
      confirmText = 'Đồng ý duyệt';
      desc = <span>Bạn có chắc chắn muốn <strong>duyệt</strong> bài viết <strong>{title}</strong> không?</span>;
    } else if (action === 'reject') {
      modalTitle = 'Từ chối bài viết';
      type = 'warning';
      confirmText = 'Đồng ý từ chối';
      desc = <span>Bạn có chắc chắn muốn <strong>từ chối</strong> bài viết <strong>{title}</strong> không?</span>;
    }

    setConfirmModal({
      open: true,
      title: modalTitle,
      type,
      confirmText,
      description: desc,
      onConfirm: async () => {
        if (isDelete) {
          try {
            await apiJson(`/api/admin/blogs/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa bài viết thành công!');
          } catch {
            toast.error('Lỗi khi xóa bài viết');
          }
        } else {
          try {
            await apiJson(`/api/admin/blogs/${id}/${action}`, { method: 'POST' });
            toast.success(`Đã ${isApprove ? 'duyệt' : 'từ chối'} bài viết thành công!`);
          } catch {
            toast.error('Lỗi khi cập nhật trạng thái');
          }
        }
        void loadBlogs();
      }
    });
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
          <button onClick={() => triggerBlogAction(String(row.id), 'approve', String(row.title))} className="text-green-600 hover:text-green-800">
            Duyệt
          </button>
          <button onClick={() => triggerBlogAction(String(row.id), 'reject', String(row.title))} className="text-yellow-600 hover:text-yellow-800">
            Từ chối
          </button>
        </>
      )}
      <button onClick={() => triggerBlogAction(String(row.id), 'delete', String(row.title))} className="text-red-600 hover:text-red-800">
        Xóa
      </button>
    </div>
  ), [triggerBlogAction]);

  if (loading) return <div className="p-12 text-center text-slate-500">Đang tải...</div>;

  return (
    <>
      <DataTableTab
        title="Bài viết Blog"
        rows={blogs}
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
