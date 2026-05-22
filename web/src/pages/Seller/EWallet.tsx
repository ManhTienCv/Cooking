import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Building2, Plus, ArrowRightLeft, ShieldCheck, Clock, X, Landmark, PlusCircle, AlertCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiJson, apiFetch } from '../../lib/api';
import EWalletAddBankModal from './components/EWalletAddBankModal';
import EWalletWithdrawModal from './components/EWalletWithdrawModal';
import EWalletTopupModal from './components/EWalletTopupModal';
import EWalletTransactionDetailModal from './components/EWalletTransactionDetailModal';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface VietQrBank {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

interface WalletData {
  id: string;
  balance: string;
  frozen_balance: string;
  currency: string;
}

interface Transaction {
  id: string;
  amount: string;
  type: 'deposit' | 'withdrawal' | 'fee' | 'refund' | 'payment';
  status: 'pending' | 'completed' | 'failed' | 'invalid';
  description: string;
  created_at: string;
}

interface BankAccount {
  id: string;
  bank_bin: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
}

const TX_LABEL: Record<string, string> = {
  deposit: 'Nạp tiền vào ví',
  withdrawal: 'Rút tiền',
  fee: 'Phí hoa hồng',
  refund: 'Hoàn tiền',
  payment: 'Thanh toán đơn hàng',
};

const STATUS_LABEL: Record<string, string> = {
  completed: 'Hoàn tất',
  pending: 'Đang xử lý',
  failed: 'Thất bại',
  invalid: 'Không hợp lệ',
};

// Kiểm tra xem loại giao dịch có phải là tiền đi vào ví hay không (nạp tiền hoặc hoàn tiền)
function isIncome(type: string): boolean {
  return type === 'deposit' || type === 'refund';
}

// Định dạng số tiền sang đơn vị tiền tệ Việt Nam Đồng (VND) dạng: "1.000.000 đ"
function formatCurrency(amount: string | number) {
  return Number(amount).toLocaleString('vi-VN') + ' đ';
}


export default function EWallet() {
  const [now, setNow] = useState(0);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankLogos, setBankLogos] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('https://api.vietqr.io/v2/banks')
      .then((res) => res.json())
      .then((res: { data?: VietQrBank[] }) => {
        if (res && Array.isArray(res.data)) {
          const map: Record<string, string> = {};
          res.data.forEach((item) => {
            if (item.bin && item.logo) {
              map[item.bin] = item.logo;
            }
          });
          setBankLogos(map);
        }
      })
      .catch((err) => console.error('Lỗi tải logo ngân hàng:', err));
  }, []);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showTxDetail, setShowTxDetail] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Tải dữ liệu thông tin ví và danh sách ngân hàng liên kết từ API
  const loadData = useCallback(async () => {
    try {
      const [walletRes, banksRes] = await Promise.all([
        apiJson<{ wallet: WalletData; transactions: Transaction[] }>('/api/ewallet/me'),
        apiJson<{ accounts: BankAccount[] }>('/api/ewallet/banks'),
      ]);
      setWallet(walletRes.wallet);
      setTransactions(walletRes.transactions);
      setBanks(banksRes.accounts);
    } catch {
      toast.error('Không thể tải thông tin ví');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setNow(Date.now());
    void loadData();
  }, [loadData]);

  // Mở hộp thoại xác nhận và thực hiện gửi yêu cầu xóa tài khoản ngân hàng liên kết
  const triggerDeleteBank = (bank: BankAccount) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa tài khoản ngân hàng',
      message: `Bạn có chắc chắn muốn xóa tài khoản ngân hàng ${bank.bank_name} (${bank.account_number}) này không?`,
      onConfirm: async () => {
        try {
          await apiFetch('/api/ewallet/banks/' + bank.id, { method: 'DELETE' });
          toast.success('Đã xoá tài khoản ngân hàng.');
          void loadData();
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Lỗi xoá tài khoản.');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const balance = Number(wallet?.balance || 0);
  const frozen = Number(wallet?.frozen_balance || 0);

  // Xác định trạng thái thực tế của giao dịch (đánh dấu không hợp lệ nếu giao dịch chờ xử lý quá 1 giờ)
  const getTxStatus = (tx: Transaction) => {
    if (tx.status === 'pending') {
      const createdTime = new Date(tx.created_at).getTime();
      const oneHour = 3600000;
      if (now - createdTime > oneHour) {
        return 'invalid';
      }
    }
    return tx.status;
  };

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter((tx) => {
    const desc = (tx.description || TX_LABEL[tx.type] || 'Giao dịch').toLowerCase();
    const amountStr = formatCurrency(tx.amount).toLowerCase();
    const statusStr = (STATUS_LABEL[getTxStatus(tx)] || tx.status).toLowerCase();
    const search = searchTerm.toLowerCase();
    return desc.includes(search) || amountStr.includes(search) || statusStr.includes(search);
  });

  // Group transactions by date string
  const groupedTransactions: Record<string, Transaction[]> = {};
  filteredTransactions.forEach((tx) => {
    const txDate = new Date(tx.created_at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let dateKey = '';
    if (txDate.toDateString() === today.toDateString()) {
      dateKey = 'Hôm nay';
    } else if (txDate.toDateString() === yesterday.toDateString()) {
      dateKey = 'Hôm qua';
    } else {
      dateKey = txDate.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      });
    }

    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = [];
    }
    groupedTransactions[dateKey].push(tx);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-7 h-7 text-emerald-500" /> Ví Cook
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý số dư, nạp tiền và rút tiền về ngân hàng</p>
      </div>

      {banks.length === 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3 text-red-800 dark:text-red-300 shadow-sm animate-pulse">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Chưa liên kết tài khoản ngân hàng</h4>
            <p className="text-xs mt-1 text-red-700 dark:text-red-400 leading-relaxed">
              Bạn chưa xác thực đăng ký hoặc kết nối tài khoản ngân hàng nào. Vui lòng bấm vào nút <strong className="font-bold text-red-800 dark:text-red-300">"+"</strong> ở phần <strong>"Tài khoản ngân hàng"</strong> bên dưới để thực hiện liên kết trước khi nạp/rút tiền.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <ShieldCheck className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-100 font-medium mb-1">Số dư khả dụng</p>
            <h2 className="text-4xl font-bold mb-4">{formatCurrency(balance)}</h2>

            {frozen > 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-200 mb-6">
                <Clock className="w-4 h-4" />
                <span>Đóng băng (đang rút): {formatCurrency(frozen)}</span>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex-1 bg-white text-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="w-5 h-5" /> Rút tiền
              </button>
              <button
                onClick={() => setShowTopup(true)}
                className="flex-1 bg-white/20 text-white py-3 rounded-xl font-bold hover:bg-white/30 transition-colors flex items-center justify-center gap-2 border border-white/30"
              >
                <PlusCircle className="w-5 h-5" /> Nạp tiền
              </button>
            </div>
          </div>
        </motion.div>

        {/* Bank Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-400" /> Tài khoản ngân hàng
            </h3>
            <button
              onClick={() => setShowAddBank(true)}
              className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 p-2 rounded-full transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {banks.length === 0 ? (
              <div className="text-center py-6">
                <Landmark className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có tài khoản ngân hàng nào.</p>
                <button onClick={() => setShowAddBank(true)} className="mt-3 text-sm font-semibold text-amber-600 hover:underline">
                  + Thêm ngay
                </button>
              </div>
            ) : (
              banks.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                  <div className="w-10 h-10 bg-white dark:bg-slate-100 p-1.5 rounded-xl flex items-center justify-center border border-gray-200 dark:border-slate-300 font-bold text-gray-400 text-xs overflow-hidden shrink-0 shadow-sm">
                    {bankLogos[b.bank_bin] ? (
                      <img src={bankLogos[b.bank_bin]} alt={b.bank_name} className="w-full h-full object-contain" />
                    ) : (
                      b.bank_bin
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{b.bank_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{b.account_number} · {b.account_name}</p>
                  </div>
                  <button
                    onClick={() => triggerDeleteBank(b)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    title="Xoá tài khoản"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-gray-400" /> Lịch sử giao dịch
          </h3>
          
          {/* Ô tìm kiếm ở góc trên */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm giao dịch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Khung chứa danh sách có nút cuộn khi quá dài */}
        <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700 pr-1 scrollbar-thin">
          {Object.keys(groupedTransactions).length === 0 ? (
            <p className="text-center py-10 text-gray-400 dark:text-gray-500">Không tìm thấy giao dịch nào.</p>
          ) : (
            Object.keys(groupedTransactions).map((dateKey) => (
              <div key={dateKey} className="flex flex-col">
                {/* Header Ngày giao dịch */}
                <div className="bg-gray-50/70 dark:bg-slate-900/30 px-6 py-2 text-xs font-bold text-gray-500 dark:text-slate-400 sticky top-0 backdrop-blur-md z-10">
                  Giao dịch {dateKey}
                </div>

                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {groupedTransactions[dateKey].map((tx) => {
                    const income = isIncome(tx.type);
                    const realStatus = getTxStatus(tx);
                    const iconBg = income
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
                    const amountColor = income ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white';
                    
                    const statusBadge =
                      realStatus === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : realStatus === 'pending'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : realStatus === 'invalid'
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200/30'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

                    return (
                      <div
                        key={tx.id}
                        onClick={() => {
                          setSelectedTx({ ...tx, status: realStatus });
                          setShowTxDetail(true);
                        }}
                        className="p-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer active:scale-[0.99] select-none"
                      >
                        <div className="flex items-center gap-4">
                          <div className={'w-10 h-10 rounded-full flex items-center justify-center ' + iconBg}>
                            {income ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {tx.description || TX_LABEL[tx.type] || 'Giao dịch'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(tx.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={'font-bold ' + amountColor}>
                            {income ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ' + statusBadge}>
                            {STATUS_LABEL[realStatus] || realStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <EWalletAddBankModal
        open={showAddBank}
        onClose={() => setShowAddBank(false)}
        onSuccess={() => void loadData()}
      />

      <EWalletWithdrawModal
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onSuccess={() => void loadData()}
        banks={banks}
        maxAmount={balance}
        bankLogos={bankLogos}
      />

      <EWalletTopupModal
        open={showTopup}
        onClose={() => setShowTopup(false)}
        onSuccess={() => void loadData()}
        banks={banks}
        bankLogos={bankLogos}
      />

      <EWalletTransactionDetailModal
        open={showTxDetail}
        onClose={() => {
          setShowTxDetail(false);
          setSelectedTx(null);
        }}
        transaction={selectedTx}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
