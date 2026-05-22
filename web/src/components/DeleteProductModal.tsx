import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';

interface DeleteProductModalProps {
  open: boolean;
  product: { id: number; name: string } | null;
  onClose: () => void;
  onSuccess: (id: number) => void;
}

export default function DeleteProductModal({ open, product, onClose, onSuccess }: DeleteProductModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!product) return;
    setLoading(true);
    try {
      await apiFetch(`/api/marketplace/seller/products/${product.id}`, { method: 'DELETE' });
      toast.success('Đã xóa sản phẩm thành công');
      onSuccess(product.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra khi xóa sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && product && (
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
              <h3 className="text-lg font-bold flex items-center gap-2 text-red-650 dark:text-red-400">
                <Trash2 className="w-5 h-5 text-red-500" />
                Xác nhận xóa sản phẩm
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-4 bg-red-50/70 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  Hành động này không thể hoàn tác. Sản phẩm và các dữ liệu liên quan sẽ bị xóa vĩnh viễn khỏi cửa hàng.
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tên sản phẩm</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                  {product.name}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-650 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-md shadow-red-500/10 flex items-center justify-center gap-2 animate-pulse"
                >
                  {loading ? 'Đang xóa...' : 'Đồng ý xóa'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
