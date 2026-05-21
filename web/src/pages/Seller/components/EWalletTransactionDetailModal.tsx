import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Hash, Info, CheckCircle2, XCircle, AlertTriangle, Clock, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  amount: string;
  type: 'deposit' | 'withdrawal' | 'fee' | 'refund' | 'payment';
  status: 'pending' | 'completed' | 'failed' | 'invalid';
  description: string;
  created_at: string;
}

interface EWalletTransactionDetailModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const TX_LABEL: Record<string, string> = {
  deposit: 'Nạp tiền vào ví',
  withdrawal: 'Rút tiền về ngân hàng',
  fee: 'Phí hoa hồng khấu trừ',
  refund: 'Hoàn tiền giao dịch',
  payment: 'Thanh toán đơn hàng',
};

const STATUS_TEXT: Record<string, string> = {
  completed: 'Giao dịch thành công',
  pending: 'Đang chờ xử lý',
  failed: 'Giao dịch thất bại',
  invalid: 'Giao dịch không hợp lệ',
};

export default function EWalletTransactionDetailModal({ open, onClose, transaction }: EWalletTransactionDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!transaction) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.id);
    setCopied(true);
    toast.success('Đã sao chép mã giao dịch');
    setTimeout(() => setCopied(false), 2000);
  };

  const isIncome = transaction.type === 'deposit' || transaction.type === 'refund';
  const formatCurrency = (val: string) => Number(val).toLocaleString('vi-VN') + ' đ';

  // Định nghĩa màu sắc & Icon cho trạng thái
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-12 h-12 text-emerald-500" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/20',
          textClass: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'pending':
        return {
          icon: <Clock className="w-12 h-12 text-amber-500 animate-pulse" />,
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          textClass: 'text-amber-600 dark:text-amber-400',
        };
      case 'invalid':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-red-500" />,
          bg: 'bg-red-50 dark:bg-red-950/20 border border-red-200/30',
          textClass: 'text-red-600 dark:text-red-400',
        };
      default:
        return {
          icon: <XCircle className="w-12 h-12 text-gray-500" />,
          bg: 'bg-gray-50 dark:bg-slate-900',
          textClass: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  const statusConfig = getStatusConfig(transaction.status);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />
          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800 shadow-2xl pointer-events-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chi tiết giao dịch</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Khu vực trạng thái */}
                <div className={`p-5 rounded-2xl flex flex-col items-center justify-center text-center ${statusConfig.bg}`}>
                  {statusConfig.icon}
                  <h4 className={`font-bold mt-3 text-base ${statusConfig.textClass}`}>
                    {STATUS_TEXT[transaction.status] || 'Trạng thái không xác định'}
                  </h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Hóa đơn điện tử CookPay</p>
                </div>

                {/* Số tiền */}
                <div className="text-center space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Số tiền giao dịch</span>
                  <div className={`text-3xl font-black ${isIncome ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </div>
                </div>

                {/* Chi tiết biên lai (E-Receipt Details) */}
                <div className="space-y-4 bg-gray-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-gray-100/50 dark:border-slate-800/50">
                  {/* Mã giao dịch */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                      <Hash className="w-4 h-4 text-gray-400" /> Mã giao dịch
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300 font-bold">
                        {transaction.id.slice(0, 12)}...
                      </span>
                      <button
                        onClick={handleCopyId}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        title="Sao chép toàn bộ ID"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Loại giao dịch */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                      <Info className="w-4 h-4 text-gray-400" /> Loại giao dịch
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white text-right">
                      {TX_LABEL[transaction.type] || 'Khác'}
                    </span>
                  </div>

                  {/* Thời gian */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 text-gray-400" /> Thời gian tạo
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 text-right">
                      {new Date(transaction.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* Nội dung / Mô tả */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Nội dung chi tiết</span>
                  <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                    {transaction.description || `Thực hiện giao dịch ${transaction.type === 'deposit' ? 'nạp tiền' : 'rút tiền'} thành công tại CookApp.`}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 dark:text-slate-900 text-white py-3 rounded-2xl font-bold transition-all shadow-md active:scale-[0.98]"
                >
                  Xác nhận đóng
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
