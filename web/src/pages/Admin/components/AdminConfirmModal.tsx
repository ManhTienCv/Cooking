import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Trash2, AlertTriangle, Info, Loader2 } from 'lucide-react';

export interface AdminConfirmModalProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'approve' | 'danger' | 'warning' | 'info';
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function AdminConfirmModal({
  open,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  type = 'info',
  onClose,
  onConfirm
}: AdminConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Errors should be handled inside the parent's onConfirm
    } finally {
      setLoading(false);
    }
  };

  // Theme-specific styles
  const config = {
    approve: {
      icon: <CheckCircle className="w-6 h-6 text-green-500" />,
      headerColor: 'text-green-600 dark:text-green-400',
      btnColor: 'bg-green-600 hover:bg-green-700 shadow-green-500/10 focus:ring-green-400/50',
      bgColor: 'bg-green-50/50 dark:bg-green-950/10 border-green-100/80 dark:border-green-900/20',
      textColor: 'text-green-700 dark:text-green-300'
    },
    danger: {
      icon: <Trash2 className="w-6 h-6 text-red-500" />,
      headerColor: 'text-red-655 dark:text-red-400',
      btnColor: 'bg-red-600 hover:bg-red-700 shadow-red-500/10 focus:ring-red-400/50',
      bgColor: 'bg-red-50/50 dark:bg-red-950/10 border-red-100/80 dark:border-red-900/20',
      textColor: 'text-red-700 dark:text-red-300'
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      headerColor: 'text-amber-600 dark:text-amber-400',
      btnColor: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/10 focus:ring-amber-400/50',
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100/80 dark:border-amber-900/20',
      textColor: 'text-amber-700 dark:text-amber-300'
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-500" />,
      headerColor: 'text-blue-600 dark:text-blue-400',
      btnColor: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10 focus:ring-blue-400/50',
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-100/80 dark:border-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-300'
    }
  }[type];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal box */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700/80 p-6 z-10 text-slate-900 dark:text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className={`text-lg font-bold flex items-center gap-2.5 ${config.headerColor}`}>
                {config.icon}
                {title}
              </h3>
              <button
                onClick={onClose}
                disabled={loading}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-655 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description / Content */}
            <div className="mt-4 space-y-5">
              <div className={`p-4 border rounded-2xl flex items-start gap-3 ${config.bgColor}`}>
                <div className="text-sm font-medium leading-relaxed break-words flex-1">
                  {description}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 rounded-xl font-bold transition-all text-sm disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className={`flex-1 py-3 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${config.btnColor}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
