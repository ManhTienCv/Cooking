import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, ShieldCheck, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson } from '../../../lib/api';

interface AddBankModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type VietQrBank = {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
};

export default function EWalletAddBankModal({ open, onClose, onSuccess }: AddBankModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankQuery, setBankQuery] = useState('');
  const [banks, setBanks] = useState<VietQrBank[]>([]);
  const [showBankList, setShowBankList] = useState(true);
  const [form, setForm] = useState({
    bank_bin: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    otpCode: ''
  });

  useEffect(() => {
    if (!open || banks.length > 0) return;
    setBankLoading(true);
    setBankError(null);
    fetch('https://api.vietqr.io/v2/banks')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải danh sách ngân hàng.');
        return res.json() as Promise<{ data?: VietQrBank[] }>;
      })
      .then((data) => {
        setBanks(Array.isArray(data.data) ? data.data : []);
      })
      .catch((err) => {
        setBankError(err instanceof Error ? err.message : 'Không thể tải danh sách ngân hàng.');
      })
      .finally(() => setBankLoading(false));
  }, [open, banks.length]);

  useEffect(() => {
    if (!open) return;
    setShowBankList(true);
    setBankQuery('');
  }, [open]);

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => {
      const name = `${b.name} ${b.shortName} ${b.bin}`.toLowerCase();
      return name.includes(q);
    });
  }, [bankQuery, banks]);

  const selectedBank = useMemo(
    () => banks.find((b) => b.bin === form.bank_bin) ?? null,
    [banks, form.bank_bin]
  );

  const handleRequestOtp = async () => {
    if (!form.bank_bin || !form.bank_name) {
      toast.error('Vui lòng chọn ngân hàng.');
      return;
    }
    if (!form.account_number || !form.account_name) {
      toast.error('Vui lòng điền đầy đủ thông tin ngân hàng.');
      return;
    }
    setLoading(true);
    try {
      await apiJson('/api/ewallet/otp', {
        method: 'POST',
        body: JSON.stringify({ action: 'add_bank' })
      });
      toast.success('Đã gửi mã OTP qua email.');
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndAdd = async () => {
    if (form.otpCode.length !== 6) {
      toast.error('Mã OTP phải gồm 6 số.');
      return;
    }
    setLoading(true);
    try {
      await apiJson('/api/ewallet/banks', {
        method: 'POST',
        body: JSON.stringify({
          bank: {
            bank_bin: form.bank_bin,
            bank_name: form.bank_name,
            account_number: form.account_number,
            account_name: form.account_name.toUpperCase(),
          },
          otpCode: form.otpCode
        })
      });
      toast.success('Thêm tài khoản thành công!');
      onSuccess();
      onClose();
      // Reset
      setStep(1);
      setForm({ bank_bin: '', bank_name: '', account_number: '', account_name: '', otpCode: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi thêm tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-500" /> Thêm ngân hàng
                </h3>
                <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {step === 1 ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chọn ngân hàng</label>
                      {selectedBank && !showBankList ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {selectedBank.logo ? (
                              <img src={selectedBank.logo} alt={selectedBank.shortName} className="h-8 w-8 rounded-full object-contain bg-white" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-600" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedBank.shortName || selectedBank.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">BIN {selectedBank.bin}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowBankList(true)}
                            className="whitespace-nowrap text-xs font-semibold text-amber-600 hover:text-amber-700"
                          >
                            Đổi ngân hàng
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            value={bankQuery}
                            onChange={(e) => setBankQuery(e.target.value)}
                            placeholder="Tìm theo tên, viết tắt, mã BIN..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          />
                          <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700">
                            {bankLoading && (
                              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Đang tải danh sách ngân hàng...</div>
                            )}
                            {!bankLoading && bankError && (
                              <div className="p-4 text-sm text-red-500">{bankError}</div>
                            )}
                            {!bankLoading && !bankError && filteredBanks.length === 0 && (
                              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Không tìm thấy ngân hàng phù hợp.</div>
                            )}
                            {!bankLoading && !bankError && filteredBanks.map((bank) => {
                              const active = bank.bin === form.bank_bin;
                              return (
                                <button
                                  type="button"
                                  key={bank.bin}
                                  onClick={() => {
                                    setForm((f) => ({
                                      ...f,
                                      bank_bin: bank.bin,
                                      bank_name: bank.shortName || bank.name,
                                    }));
                                    setBankQuery('');
                                    setShowBankList(false);
                                  }}
                                  className={`flex w-full items-center gap-3 px-4 py-3 text-left border-b border-gray-100 last:border-b-0 dark:border-slate-700/60 hover:bg-amber-50/60 dark:hover:bg-slate-700/40 transition-colors ${
                                    active ? 'bg-amber-50 dark:bg-slate-700/60' : ''
                                  }`}
                                >
                                  {bank.logo ? (
                                    <img src={bank.logo} alt={bank.shortName} className="h-7 w-7 rounded-full object-contain bg-white" />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-slate-600" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{bank.shortName || bank.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{bank.name} · BIN {bank.bin}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số tài khoản</label>
                      <input 
                        value={form.account_number}
                        onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
                        placeholder="VD: 0123456789"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên chủ tài khoản</label>
                      <input 
                        value={form.account_name}
                        onChange={e => setForm(f => ({ ...f, account_name: e.target.value.toUpperCase() }))}
                        placeholder="VD: NGUYEN VAN A"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 uppercase"
                      />
                    </div>

                    <button 
                      onClick={handleRequestOtp}
                      disabled={loading}
                      className="w-full mt-4 bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      <ShieldCheck className="w-5 h-5" /> Xác thực & Thêm
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
                      onClick={handleVerifyAndAdd}
                      disabled={loading || form.otpCode.length !== 6}
                      className="w-full mt-6 bg-amber-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      Xác nhận Thêm Ngân Hàng
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
