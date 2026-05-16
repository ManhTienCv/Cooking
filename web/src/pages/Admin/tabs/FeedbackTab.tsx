import { useCallback, useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function FeedbackTab() {
  const [feedback, setFeedback] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ feedback: Record<string, unknown>[] }>('/api/admin/feedback');
      setFeedback(data.feedback ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const onDeleteFeedback = useCallback(async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) return;
    try {
      await apiJson(`/api/admin/feedback/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa phản hồi thành công!');
      void loadFeedback();
    } catch {
      toast.error('Lỗi khi xóa phản hồi');
    }
  }, [loadFeedback]);

  if (loading) return <div className="p-12 text-center text-slate-500">Đang tải...</div>;

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
          onClick={() => void onDeleteFeedback(String(row.id))}
          className="text-red-600 hover:text-red-800 font-medium text-sm"
        >
          Xóa
        </button>
      )}
    />
  );
}
