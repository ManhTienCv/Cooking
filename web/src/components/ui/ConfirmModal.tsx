import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onClose,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'danger',
}: ConfirmModalProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-gray-100 dark:border-slate-800 z-10"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                type === 'danger'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : type === 'warning'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <AlertTriangle className={`h-6 w-6 ${
                  type === 'danger'
                    ? 'text-red-600 dark:text-red-400'
                    : type === 'warning'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-gray-600 hover:text-black hover:bg-gray-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                  type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/10'
                    : type === 'warning'
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-md shadow-yellow-500/10'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
