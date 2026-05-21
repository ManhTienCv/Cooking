import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, AlertCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiJson } from '../../../lib/api';

interface BankAccount {
  id: string;
  bank_bin: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}

interface EWalletTopupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  banks: BankAccount[];
  bankLogos: Record<string, string>;
}

export default function EWalletTopupModal({ open, onClose, onSuccess, banks, bankLogos }: EWalletTopupModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'momo' | 'bank'>('momo');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');

  // Auto-select first bank if method switches to bank
  const handleMethodChange = (newMethod: 'momo' | 'bank') => {
    setMethod(newMethod);
    if (newMethod === 'bank' && banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0].id);
    }
  };

  const handleSendOtp = async () => {
    const numAmount = Number(amount.replace(/\D/g, ''));
    if (numAmount < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000đ');
      return;
    }
    if (method === 'bank' && !selectedBankId) {
      toast.error('Vui lòng chọn tài khoản ngân hàng liên kết');
      return;
    }

    setLoading(true);
    try {
      await apiJson('/api/ewallet/otp', {
        method: 'POST',
        body: JSON.stringify({ action: 'topup' }),
      });
      toast.success('Đã gửi mã OTP xác thực qua email của bạn.');
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi gửi OTP xác thực');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount.replace(/\D/g, ''));

    if (numAmount < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000đ');
      return;
    }

    // Nếu từ 5 triệu trở lên mà chưa qua bước OTP thì bắt buộc gửi OTP trước
    if (numAmount >= 5000000 && step === 1) {
      await handleSendOtp();
      return;
    }

    setLoading(true);
    try {
      if (method === 'momo') {
        const res = await apiJson<{ payUrl: string }>('/api/ewallet/topup/momo', {
          method: 'POST',
          body: JSON.stringify({ amount: numAmount, otpCode: numAmount >= 5000000 ? otpCode : undefined }),
        });
        
        if (res.payUrl) {
          window.location.href = res.payUrl;
        } else {
          toast.error('Không lấy được link thanh toán MoMo');
        }
      } else {
        if (!selectedBankId) {
          toast.error('Vui lòng chọn tài khoản ngân hàng liên kết');
          setLoading(false);
          return;
        }
        const res = await apiJson<{ success: boolean; message: string }>('/api/ewallet/topup/bank', {
          method: 'POST',
          body: JSON.stringify({
            amount: numAmount,
            bankAccountId: selectedBankId,
            otpCode: numAmount >= 5000000 ? otpCode : undefined
          }),
        });
        if (res.success) {
          toast.success(res.message || 'Nạp tiền qua tài khoản ngân hàng thành công!');
          onSuccess();
          onClose();
          setAmount('');
          setOtpCode('');
          setStep(1);
        }
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

  const handleReset = () => {
    setAmount('');
    setOtpCode('');
    setStep(1);
    onClose();
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
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col my-4 overflow-hidden border border-gray-200/80 dark:border-slate-800 shadow-2xl pointer-events-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
                <h3 className="text-2xl font-bold text-black dark:text-white flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-emerald-500" /> Nạp tiền vào ví
                </h3>
                <button onClick={handleReset} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {step === 1 ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Số tiền */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Số tiền cần nạp (VND)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={amount}
                          onChange={handleAmountChange}
                          className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                          placeholder="0"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold">
                          đ
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Tối thiểu 10.000đ. Từ 5.000.000đ trở lên yêu cầu xác thực OTP qua email.
                      </p>
                    </div>

                    {/* Phím nhanh số tiền */}
                    <div className="grid grid-cols-3 gap-2">
                      {[50000, 100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmount(val.toLocaleString('vi-VN'))}
                          className="py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          {val.toLocaleString('vi-VN')}
                        </button>
                      ))}
                    </div>

                    {/* Phương thức thanh toán */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Phương thức thanh toán
                      </label>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* MoMo Option */}
                        <div
                          onClick={() => handleMethodChange('momo')}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                            method === 'momo'
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                              : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs font-bold text-gray-900 dark:text-white mb-1">Ví MoMo</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">Nạp qua ứng dụng</span>
                        </div>

                        {/* Bank Option */}
                        <div
                          onClick={() => handleMethodChange('bank')}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                            method === 'bank'
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                              : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs font-bold text-gray-900 dark:text-white mb-1">Ngân hàng liên kết</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">Trừ trực tiếp</span>
                        </div>
                      </div>

                      {/* Sub-UI based on selection */}
                      {method === 'bank' && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 space-y-2">
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                            Chọn tài khoản liên kết
                          </label>
                          {banks.length === 0 ? (
                            <div className="text-xs text-red-500 flex items-start gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>Chưa có tài khoản ngân hàng liên kết. Vui lòng đóng cửa sổ này và thêm tài khoản ở mục "Tài khoản ngân hàng".</span>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                              {banks.map((b) => (
                                <div
                                  key={b.id}
                                  onClick={() => setSelectedBankId(b.id)}
                                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                                    selectedBankId === b.id
                                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                                      : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                                  }`}
                                >
                                  <div className="w-8 h-8 bg-white p-1 rounded-lg flex items-center justify-center border border-gray-200 dark:border-slate-300 font-bold text-gray-400 text-[10px] shrink-0 overflow-hidden shadow-sm">
                                    {bankLogos[b.bank_bin] ? (
                                      <img src={bankLogos[b.bank_bin]} alt={b.bank_name} className="w-full h-full object-contain" />
                                    ) : (
                                      b.bank_bin
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{b.bank_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{b.account_number} · {b.account_name}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !amount || (method === 'bank' && banks.length === 0)}
                      className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : Number(amount.replace(/\D/g, '')) >= 5000000 ? (
                        <>Xác thực & Nạp tiền</>
                      ) : method === 'momo' ? (
                        <>Nạp qua MoMo</>
                      ) : (
                        <>Nạp qua Ngân hàng</>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">Xác thực giao dịch</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Do bạn đang thực hiện nạp số tiền lớn <strong>({amount}đ)</strong>, vui lòng nhập mã OTP gồm 6 số được gửi đến email của bạn để xác thực.
                      </p>
                    </div>

                    <input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      className="w-full text-center text-3xl tracking-[0.5em] px-4 py-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono outline-none"
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(1)}
                        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Quay lại
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading || otpCode.length !== 6}
                        className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>Hoàn tất Nạp tiền</>
                        )}
                      </button>
                    </div>
                  </div>
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
