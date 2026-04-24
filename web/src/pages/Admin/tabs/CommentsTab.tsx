import { useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function CommentsTab() {
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const c = await apiJson<{ comments: Record<string, unknown>[] }>('/api/admin/comments');
      setComments(c.comments ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải bình luận');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
      try {
        await apiJson(`/api/admin/comments/${id}`, { method: 'DELETE' });
        toast.success('Đã xóa bình luận thành công!');
        await load();
      } catch {
        toast.error('Lỗi khi xóa bình luận');
      }
    }
  };

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <DataTableTab
      title="Bình luận (Diễn đàn)"
      rows={comments}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'author_name', label: 'Người dùng' },
        { key: 'post_title', label: 'Bài viết' },
        { key: 'content', label: 'Nội dung' },
        {
          key: 'created_at',
          label: 'Ngày đăng',
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
