import { useCallback, useEffect, useState } from 'react';
import DataTableTab from './DataTableTab';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';
import AdminConfirmModal from '../components/AdminConfirmModal';

export default function FeedbackTab() {
  const [feedback, setFeedback] = useState<Record<string, unknown>[]>([]);
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

  const triggerDeleteFeedback = useCallback((id: string, name: string) => {
    setConfirmModal({
      open: true,
      title: 'Xóa phản hồi',
      type: 'danger',
      confirmText: 'Đồng ý xóa',
      description: (
        <span>
          Bạn có chắc chắn muốn xóa phản hồi của khách hàng <strong>{name}</strong> không? Hành động này không thể hoàn tác.
        </span>
      ),
      onConfirm: async () => {
        try {
          await apiJson(`/api/admin/feedback/${id}`, { method: 'DELETE' });
          toast.success('Đã xóa phản hồi thành công!');
          void loadFeedback();
        } catch {
          toast.error('Lỗi khi xóa phản hồi');
        }
      }
    });
  }, [loadFeedback]);

  if (loading) return <div className="p-12 text-center text-slate-500">Đang tải...</div>;

  return (
    <>
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
            onClick={() => triggerDeleteFeedback(String(row.id), String(row.name))}
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
