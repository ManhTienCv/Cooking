import { useCallback, useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function CommentsTab() {
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

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

  const onDeleteComment = useCallback(async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    try {
      await apiJson(`/api/admin/comments/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa bình luận thành công!');
      void loadComments();
    } catch {
      toast.error('Lỗi khi xóa bình luận');
    }
  }, [loadComments]);

  if (loading) return <div className="p-12 text-center text-slate-500">Đang tải...</div>;

  return (
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
          onClick={() => void onDeleteComment(String(row.id))}
          className="text-red-600 hover:text-red-800 font-medium text-sm"
        >
          Xóa
        </button>
      )}
    />
  );
}
