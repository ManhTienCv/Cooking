import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson } from '../../../lib/api';

interface BankAccount {
  id: string;
  bank_bin: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  banks: BankAccount[];
  maxAmount: number;
}

export default function EWalletWithdrawModal({ open, onClose, onSuccess, banks, maxAmount }: WithdrawModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    bankAccountId: '',
    otpCode: ''
  });

  const handleRequestOtp = async () => {
    const amountNum = Number(form.amount.replace(/[^0-9]/g, ''));
    if (amountNum < 50000) {
      toast.error('Số tiền rút tối thiểu là 50.000đ.');
      return;
    }
    if (amountNum > maxAmount) {
      toast.error('Số tiền rút vượt quá số dư khả dụng.');
      return;
    }
    if (!form.bankAccountId) {
      toast.error('Vui lòng chọn tài khoản nhận tiền.');
      return;
    }

    setLoading(true);
    try {
      await apiJson('/api/ewallet/otp', {
        method: 'POST',
        body: JSON.stringify({ action: 'withdraw' })
      });
      toast.success('Đã gửi mã OTP qua email.');
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndWithdraw = async () => {
    if (form.otpCode.length !== 6) {
      toast.error('Mã OTP phải gồm 6 số.');
      return;
    }
    setLoading(true);
    try {
      const amountNum = Number(form.amount.replace(/[^0-9]/g, ''));
      const res = await apiJson<{ message: string }>('/api/ewallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          bankAccountId: form.bankAccountId,
          otpCode: form.otpCode
        })
      });
      toast.success(res.message || 'Tạo lệnh rút tiền thành công!');
      onSuccess();
      onClose();
      setStep(1);
      setForm({ amount: '', bankAccountId: '', otpCode: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi rút tiền');
    } finally {
      setLoading(false);
    }
  };

  const formatAmountInput = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    if (!num) return '';
    return Number(num).toLocaleString('vi-VN');
  };

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
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden flex flex-col border border-gray-200/80 dark:border-slate-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-amber-500" /> Rút tiền
                </h3>
                <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                {step === 1 ? (
                  <>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl flex gap-3 items-start border border-amber-100 dark:border-amber-800/50">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                        Số dư khả dụng: <strong className="font-bold">{maxAmount.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Số tiền rút (VND)</label>
                      <input 
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: formatAmountInput(e.target.value) }))}
                        placeholder="VD: 50,000"
                        className="w-full px-4 py-3 text-lg font-bold rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Chuyển về tài khoản</label>
                      {banks.length === 0 ? (
                        <div className="text-xs text-red-500 flex items-start gap-1 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Vui lòng thêm tài khoản ngân hàng trước khi rút tiền.</span>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {banks.map(b => (
                            <div
                              key={b.id}
                              onClick={() => setForm(f => ({ ...f, bankAccountId: b.id }))}
                              className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                                form.bankAccountId === b.id
                                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                                  : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-slate-700 font-bold text-gray-400 text-[10px] shrink-0">
                                {b.bank_bin}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{b.bank_name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{b.account_number} · {b.account_name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleRequestOtp}
                      disabled={loading || banks.length === 0}
                      className="w-full mt-4 bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      <ShieldCheck className="w-5 h-5" /> Xác nhận Rút tiền
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-amber-500" />
                      </div>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">Nhập mã xác thực</h4>
                      <p className="text-sm text-gray-500 mt-1">Chúng tôi đã gửi mã OTP gồm 6 số đến email của bạn.</p>
                    </div>

                    <input 
                      value={form.otpCode}
                      onChange={e => setForm(f => ({ ...f, otpCode: e.target.value.replace(/[^0-9]/g, '').slice(0,6) }))}
                      placeholder="• • • • • •"
                      className="w-full text-center text-3xl tracking-[0.5em] px-4 py-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                    />

                    <button 
                      onClick={handleVerifyAndWithdraw}
                      disabled={loading || form.otpCode.length !== 6}
                      className="w-full mt-6 bg-amber-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      Hoàn tất Rút tiền
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
