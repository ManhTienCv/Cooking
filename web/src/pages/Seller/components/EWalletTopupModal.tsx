import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiJson } from '../../../lib/api';

interface EWalletTopupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function EWalletTopupModal({ open, onClose }: EWalletTopupModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount.replace(/\D/g, ''));

    if (numAmount < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000đ');
      return;
    }

    setLoading(true);
    try {
      const res = await apiJson<{ payUrl: string }>('/api/ewallet/topup/momo', {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount }),
      });
      
      if (res.payUrl) {
        window.location.href = res.payUrl;
      } else {
        toast.error('Không lấy được link thanh toán MoMo');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tạo giao dịch nạp tiền');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value) {
      setAmount(Number(value).toLocaleString('vi-VN'));
    } else {
      setAmount('');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-xl"
          >
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" /> Nạp tiền vào ví
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Số tiền cần nạp (VND)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={handleAmountChange}
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="0"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                    đ
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Tối thiểu 10.000đ. Giao dịch qua ví MoMo.</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[50000, 100000, 200000, 500000, 1000000, 2000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toLocaleString('vi-VN'))}
                    className="py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                  >
                    {val.toLocaleString('vi-VN')}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || !amount}
                className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Nạp qua MoMo</>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
