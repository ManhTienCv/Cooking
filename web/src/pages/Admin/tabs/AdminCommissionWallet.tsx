import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Building2, Plus, ArrowRightLeft, ShieldCheck, X, Landmark, PlusCircle, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { apiJson } from '../../../lib/api';

interface WalletStats {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface BankAccount {
  id: string;
  bank_bin: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}

interface Transaction {
  type: 'fee' | 'withdrawal';
  amount: string;
  description: string;
  created_at: string;
  status: string;
}

type VietQrBank = {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
};

function formatCurrency(amount: string | number) {
  return Number(amount).toLocaleString('vi-VN') + ' đ';
}

export default function AdminCommissionWallet() {
  const [wallet, setWallet] = useState<WalletStats | null>(null);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankLogos, setBankLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('https://api.vietqr.io/v2/banks')
      .then((res) => res.json())
      .then((res: any) => {
        if (res && Array.isArray(res.data)) {
          const map: Record<string, string> = {};
          res.data.forEach((item: any) => {
            if (item.bin && item.logo) {
              map[item.bin] = item.logo;
            }
          });
          setBankLogos(map);
        }
      })
      .catch((err) => console.error('Lỗi tải logo ngân hàng:', err));
  }, []);

  // Modal controls
  const [showAddBank, setShowAddBank] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await apiJson<{
        wallet: WalletStats;
        banks: BankAccount[];
        transactions: Transaction[];
      }>('/api/admin/ewallet/me');
      
      setWallet(res.wallet);
      setBanks(res.banks || []);
      setTransactions(res.transactions || []);
    } catch {
      toast.error('Không thể tải thông tin ví hoa hồng admin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDeleteBank = async (id: string) => {
    if (!window.confirm('Xác nhận xóa tài khoản ngân hàng liên kết này?')) return;
    try {
      await apiJson(`/api/admin/ewallet/banks/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa tài khoản ngân hàng liên kết.');
      void loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xóa tài khoản.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const balance = wallet?.balance || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-7 h-7 text-blue-500" /> Quản lý Ví Hoa Hồng Nền Tảng
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Theo dõi tổng doanh thu hoa hồng ẩn thu được từ các đơn hàng và rút tiền về ngân hàng của quản trị viên
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden lg:col-span-2 flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <ShieldCheck className="w-36 h-36" />
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 font-medium mb-1">Số dư hoa hồng khả dụng</p>
            <h2 className="text-4xl font-extrabold mb-6">{formatCurrency(balance)}</h2>
            
            <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 mb-6">
              <div>
                <p className="text-xs text-blue-200">Tổng hoa hồng đã nhận</p>
                <p className="text-lg font-bold">{formatCurrency(wallet?.total_earned || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Tổng tiền đã rút</p>
                <p className="text-lg font-bold">{formatCurrency(wallet?.total_withdrawn || 0)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 relative z-10">
            <button
              onClick={() => setShowWithdraw(true)}
              disabled={balance <= 0}
              className="flex-1 bg-white text-blue-600 disabled:bg-blue-100/50 disabled:text-blue-300 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpRight className="w-5 h-5" /> Rút tiền hoa hồng
            </button>
            <button
              onClick={() => setShowAddBank(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-5 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-white/20 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" /> Liên kết ngân hàng
            </button>
          </div>
        </motion.div>

        {/* Bank Accounts Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-400" /> Tài khoản ngân hàng
            </h3>
            <button
              onClick={() => setShowAddBank(true)}
              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-full transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
            {banks.length === 0 ? (
              <div className="text-center py-8">
                <Landmark className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Chưa liên kết ngân hàng nhận tiền.</p>
                <button
                  onClick={() => setShowAddBank(true)}
                  className="mt-3 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  + Liên kết ngay
                </button>
              </div>
            ) : (
              banks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="w-9 h-9 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 font-bold text-slate-400 text-[10px] overflow-hidden shrink-0">
                    {bankLogos[b.bank_bin] ? (
                      <img src={bankLogos[b.bank_bin]} alt={b.bank_name} className="w-7 h-7 object-contain" />
                    ) : (
                      b.bank_bin
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">{b.bank_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">
                      {b.account_number} · {b.account_name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteBank(b.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                    title="Hủy liên kết"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-slate-400" /> Lịch sử giao dịch hoa hồng
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto custom-scrollbar">
          {transactions.length === 0 ? (
            <p className="text-center py-12 text-slate-400 dark:text-slate-500">Chưa phát sinh giao dịch hoa hồng nào.</p>
          ) : (
            transactions.map((tx, idx) => {
              const isFee = tx.type === 'fee';
              const iconBg = isFee
                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
              const amountColor = isFee ? 'text-green-600 dark:text-green-400' : 'text-slate-950 dark:text-white font-bold';

              return (
                <div
                  key={idx}
                  className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={'w-10 h-10 rounded-full flex items-center justify-center ' + iconBg}>
                      {isFee ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(tx.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={'font-bold text-sm ' + amountColor}>
                      {isFee ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Thành công
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      <AdminAddBankModal open={showAddBank} onClose={() => setShowAddBank(false)} onSuccess={loadData} />
      <AdminWithdrawModal open={showWithdraw} onClose={() => setShowWithdraw(false)} onSuccess={loadData} banks={banks} maxAmount={balance} bankLogos={bankLogos} />
    </div>
  );
}

/* ================================================================
   Admin Add Bank account Modal (VietQR selection)
   ================================================================ */
interface AdminAddBankModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AdminAddBankModal({ open, onClose, onSuccess }: AdminAddBankModalProps) {
  const [loading, setLoading] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [banks, setBanks] = useState<VietQrBank[]>([]);
  const [bankQuery, setBankQuery] = useState('');
  const [showBankList, setShowBankList] = useState(true);
  const [form, setForm] = useState({
    bank_bin: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });

  useEffect(() => {
    if (!open || banks.length > 0) return;
    setBankLoading(true);
    fetch('https://api.vietqr.io/v2/banks')
      .then((res) => res.json() as Promise<{ data?: VietQrBank[] }>)
      .then((data) => {
        setBanks(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => toast.error('Không thể tải danh sách ngân hàng.'))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bank_bin || !form.bank_name || !form.account_number || !form.account_name) {
      toast.error('Vui lòng nhập đầy đủ thông tin ngân hàng.');
      return;
    }
    setLoading(true);
    try {
      await apiJson('/api/admin/ewallet/banks', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Liên kết tài khoản ngân hàng admin thành công!');
      onSuccess();
      onClose();
      setForm({ bank_bin: '', bank_name: '', account_number: '', account_name: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi liên kết ngân hàng.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" /> Thêm ngân hàng liên kết
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Chọn ngân hàng
                    </label>
                    {selectedBank && !showBankList ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {selectedBank.logo ? (
                            <img
                              src={selectedBank.logo}
                              alt={selectedBank.shortName}
                              className="h-8 w-8 rounded-full object-contain bg-white"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {selectedBank.shortName || selectedBank.name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">BIN {selectedBank.bin}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowBankList(true)}
                          className="whitespace-nowrap text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          Thay đổi
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          value={bankQuery}
                          onChange={(e) => setBankQuery(e.target.value)}
                          placeholder="Tìm ngân hàng..."
                          className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                          {bankLoading ? (
                            <div className="p-3 text-xs text-slate-500">Đang tải danh sách ngân hàng...</div>
                          ) : filteredBanks.length === 0 ? (
                            <div className="p-3 text-xs text-slate-500">Không tìm thấy ngân hàng.</div>
                          ) : (
                            filteredBanks.map((bank) => (
                              <button
                                type="button"
                                key={bank.bin}
                                onClick={() => {
                                  setForm((f) => ({
                                    ...f,
                                    bank_bin: bank.bin,
                                    bank_name: bank.shortName || bank.name,
                                  }));
                                  setShowBankList(false);
                                  setBankQuery('');
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left border-b border-slate-100 last:border-b-0 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                              >
                                {bank.logo ? (
                                  <img
                                    src={bank.logo}
                                    alt={bank.shortName}
                                    className="h-6 w-6 rounded-full object-contain bg-white shrink-0"
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-950 dark:text-white truncate">
                                    {bank.shortName || bank.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">{bank.name}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Số tài khoản
                    </label>
                    <input
                      required
                      value={form.account_number}
                      onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                      placeholder="Nhập số tài khoản"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Tên chủ tài khoản
                    </label>
                    <input
                      required
                      value={form.account_name}
                      onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value.toUpperCase() }))}
                      placeholder="VD: NGUYEN VAN A"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 uppercase outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !form.bank_bin}
                    className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Xác nhận liên kết
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ================================================================
   Admin Withdraw Modal
   ================================================================ */
interface AdminWithdrawModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  banks: BankAccount[];
  maxAmount: number;
  bankLogos: Record<string, string>;
}

function AdminWithdrawModal({ open, onClose, onSuccess, banks, maxAmount, bankLogos }: AdminWithdrawModalProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');

  useEffect(() => {
    if (open && banks.length > 0) {
      setSelectedBankId(banks[0].id);
    }
  }, [open, banks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount.replace(/[^0-9]/g, ''));
    if (num < 50000) {
      toast.error('Số tiền rút tối thiểu là 50.000đ.');
      return;
    }
    if (num > maxAmount) {
      toast.error('Vượt quá số dư hoa hồng khả dụng.');
      return;
    }
    if (!selectedBankId) {
      toast.error('Vui lòng chọn tài khoản ngân hàng liên kết.');
      return;
    }

    setLoading(true);
    try {
      await apiJson('/api/admin/ewallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: num, bankAccountId: selectedBankId }),
      });
      toast.success('Rút tiền hoa hồng thành công! (Lệnh đã hoàn thành)');
      onSuccess();
      onClose();
      setAmount('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi rút tiền.');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAmount(val ? Number(val).toLocaleString('vi-VN') : '');
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-blue-500" /> Rút tiền hoa hồng admin
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/40 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-blue-800 dark:text-blue-200">
                    Số dư khả dụng: <strong>{maxAmount.toLocaleString('vi-VN')} đ</strong> (Rút tối thiểu 50.000 đ)
                  </span>
                </div>

                {banks.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-500">Chưa liên kết tài khoản ngân hàng nhận tiền.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Số tiền rút
                      </label>
                      <input
                        required
                        type="text"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="VD: 50,000"
                        className="w-full px-4 py-2.5 text-lg font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Nhận qua ngân hàng
                      </label>
                      <div className="space-y-2">
                        {banks.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBankId(b.id)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                              selectedBankId === b.id
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-350'
                            }`}
                          >
                            <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 font-extrabold text-slate-400 text-[10px] overflow-hidden shrink-0">
                              {bankLogos[b.bank_bin] ? (
                                <img src={bankLogos[b.bank_bin]} alt={b.bank_name} className="w-6 h-6 object-contain" />
                              ) : (
                                b.bank_bin
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {b.bank_name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                {b.account_number} · {b.account_name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !amount}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      Xác nhận rút tiền
                    </button>
                  </form>
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
