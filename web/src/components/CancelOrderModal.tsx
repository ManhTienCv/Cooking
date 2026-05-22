import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson } from '../lib/api';

interface CancelOrderModalProps {
  open: boolean;
  orderId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  role: 'buyer' | 'seller';
}

const PREDEFINED_REASONS = [
  'Muốn thay đổi địa chỉ nhận hàng',
  'Muốn thay đổi sản phẩm/số lượng trong đơn',
  'Tìm thấy giá tốt hơn ở nơi khác',
  'Thời gian giao hàng dự kiến quá lâu',
  'Không có nhu cầu mua nữa',
  'Khác (vui lòng ghi rõ lý do bên dưới)',
];

export default function CancelOrderModal({ open, orderId, onClose, onSuccess, role }: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] = useState(PREDEFINED_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    const finalReason = selectedReason.startsWith('Khác')
      ? customReason.trim()
      : selectedReason;

    if (selectedReason.startsWith('Khác') && !customReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy đơn hàng');
      return;
    }

    setLoading(false);
    try {
      setLoading(true);
      const url = role === 'seller'
        ? `/api/marketplace/seller/orders/${orderId}/status`
        : `/api/marketplace/orders/${orderId}/cancel`;

      const method = 'PUT';
      const body = role === 'seller'
        ? JSON.stringify({ status: 'cancelled', reason: finalReason })
        : JSON.stringify({ reason: finalReason });

      const data = await apiJson<{ success?: boolean; message?: string }>(url, {
        method,
        body,
      });

      if (data.success === false) {
        throw new Error(data.message || 'Không thể hủy đơn hàng');
      }

      toast.success('Đã hủy đơn hàng thành công');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra khi hủy đơn');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-700/80 p-6 z-10 text-gray-900 dark:text-white"
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Hủy Đơn Hàng #{orderId}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vui lòng chọn lý do hủy đơn hàng. Quyết định này không thể hoàn tác.
              </p>

              <div className="space-y-2">
                {PREDEFINED_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedReason === reason
                        ? 'border-red-500 bg-red-50/30 dark:bg-red-950/10'
                        : 'border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="mt-1 accent-red-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium">{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason.startsWith('Khác') && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Lý do chi tiết *
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Nhập lý do chi tiết..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-750 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 outline-none transition-all"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-md shadow-red-500/10"
                >
                  {loading ? 'Đang xử lý...' : 'Xác nhận hủy'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
