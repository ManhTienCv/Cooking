import { useCallback, useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';
import AdminConfirmModal from '../components/AdminConfirmModal';

export default function CommentsTab() {
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
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

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ comments: Record<string, unknown>[] }>('/api/admin/comments');
      setComments(data.comments ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const triggerDeleteComment = useCallback((id: string, content: string) => {
    const briefContent = content.length > 50 ? `${content.substring(0, 50)}...` : content;
    setConfirmModal({
      open: true,
      title: 'Xóa bình luận',
      type: 'danger',
      confirmText: 'Đồng ý xóa',
      description: (
        <span>
          Bạn có chắc chắn muốn xóa bình luận: <strong>"{briefContent}"</strong> không? Hành động này không thể hoàn tác.
        </span>
      ),
      onConfirm: async () => {
        try {
          await apiJson(`/api/admin/comments/${id}`, { method: 'DELETE' });
          toast.success('Đã xóa bình luận thành công!');
          void loadComments();
        } catch {
          toast.error('Lỗi khi xóa bình luận');
        }
      }
    });
  }, [loadComments]);

  if (loading) return <div className="p-12 text-center text-slate-500">Đang tải...</div>;

  return (
    <>
      <DataTableTab
        title="Bình luận & Đánh giá"
        rows={comments}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'user_name', label: 'Người dùng' },
          { key: 'content', label: 'Nội dung' },
          { key: 'target_type', label: 'Loại', render: (val) => val === 'recipe' ? 'Công thức' : 'Blog' },
          {
            key: 'created_at',
            label: 'Ngày gửi',
            render: (val) => new Date(String(val)).toLocaleDateString('vi-VN'),
          },
        ]}
        actions={(row) => (
          <button
            onClick={() => triggerDeleteComment(String(row.id), String(row.content))}
            className="text-red-600 hover:text-red-800 font-medium text-sm"
          >
            Xóa
          </button>
        )}
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
