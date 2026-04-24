import { useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function FeedbackTab() {
  const [feedback, setFeedback] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const f = await apiJson<{ feedback: Record<string, unknown>[] }>('/api/admin/feedback');
      setFeedback(f.feedback ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) {
      try {
        await apiJson(`/api/admin/feedback/${id}`, { method: 'DELETE' });
        toast.success('Đã xóa phản hồi thành công!');
        await load();
      } catch {
        toast.error('Lỗi khi xóa phản hồi');
      }
    }
  };

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <DataTableTab
      title="Phản hồi khách hàng"
      rows={feedback}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Họ tên' },
        { key: 'email', label: 'Email' },
        { key: 'message', label: 'Nội dung' },
        {
          key: 'created_at',
          label: 'Ngày gửi',
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
