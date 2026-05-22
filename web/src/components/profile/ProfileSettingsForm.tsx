import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CreditCard,
  MapPin,
  MessageCircle,
  Plus,
  Shield,
  Trash2,
  User,
  Moon,
} from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import type { ProfileUser } from './types';
import { apiFetch, apiJson } from '../../lib/api';
import { notifyAuthChanged } from '../../lib/authEvents';
import { useTheme } from '../../hooks/useTheme';
import toast from 'react-hot-toast';
import {
  loadProfilePreferences,
  saveProfilePreferences,
  type LinkedBankAccount,
  type SavedAddress,
} from '../../lib/profilePreferences';

interface ProfileSettingsFormProps {
  isLoading: boolean;
  user: ProfileUser | null;
  onSuccessSubmit: () => void;
  initialView?: SettingsView;
}

type SettingsView = 'main' | 'account' | 'addresses' | 'banks';
type Notice = { text: string; type: 'success' | 'error' } | null;

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 transition-all placeholder:text-gray-400 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 dark:border-slate-600 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500';
const labelClass = 'mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200';
const sectionTitleClass = 'bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-500 dark:bg-slate-800/70 dark:text-slate-400';

const blankAddress: Omit<SavedAddress, 'id' | 'isDefault'> = { name: '', phone: '', address: '' };
const blankBank: Omit<LinkedBankAccount, 'id' | 'isDefault'> = { bankName: '', accountName: '', accountNumber: '' };

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Date.now());
}

interface VietQrBank {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

interface PayoutAccountSync {
  id: number;
  bank_name: string;
  account_name: string;
  account_number_last4: string;
  is_default: boolean;
}

interface SellerProfileSync {
  store_name: string;
  store_description?: string;
  phone?: string;
}

function maskBankNumber(value: string) {
  const compact = value.replace(/\s+/g, '');
  if (compact.length <= 4) return compact;
  return `**** ${compact.slice(-4)}`;
}

function SettingRow({
  icon: Icon,
  label,
  detail,
  onClick,
}: {
  icon: typeof User;
  label: string;
  detail?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
    >
      <Icon className="h-5 w-5 shrink-0 text-gray-400 dark:text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
        {detail && <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-slate-400">{detail}</p>}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 dark:text-slate-600" />
    </button>
  );
}

export default function ProfileSettingsForm({ isLoading, user, onSuccessSubmit, initialView = 'main' }: ProfileSettingsFormProps) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [view, setView] = useState<SettingsView>(initialView);
  const [profileMsg, setProfileMsg] = useState<Notice>(null);
  const [emailMsg, setEmailMsg] = useState<Notice>(null);
  const [passMsg, setPassMsg] = useState<Notice>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [banks, setBanks] = useState<LinkedBankAccount[]>([]);
  const [addressForm, setAddressForm] = useState(blankAddress);
  const [bankForm, setBankForm] = useState(blankBank);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);

  const [banksList, setBanksList] = useState<VietQrBank[]>([]);
  const [bankQuery, setBankQuery] = useState('');
  const [showBankList, setShowBankList] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);

  useEffect(() => {
    if (view !== 'banks' || banksList.length > 0) return;
    setBankLoading(true);
    fetch('https://api.vietqr.io/v2/banks')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<{ data?: VietQrBank[] }>;
      })
      .then((data) => {
        setBanksList(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {})
      .finally(() => setBankLoading(false));
  }, [view, banksList.length]);

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q) return banksList;
    return banksList.filter((b) => {
      const name = `${b.name} ${b.shortName} ${b.bin}`.toLowerCase();
      return name.includes(q);
    });
  }, [bankQuery, banksList]);

  useEffect(() => {
    if (!user?.email) return;
    apiJson<{ payout_accounts?: PayoutAccountSync[] }>('/api/marketplace/seller/settings')
      .then((data) => {
        if (data && Array.isArray(data.payout_accounts)) {
          const prefs = loadProfilePreferences(user.email);
          let updated = false;
          data.payout_accounts.forEach((payout) => {
            const match = prefs.banks.find(
              (b) =>
                b.bankName.toLowerCase() === payout.bank_name.toLowerCase() &&
                (b.accountNumber.endsWith(payout.account_number_last4) || payout.account_number_last4.endsWith(b.accountNumber.slice(-4)))
            );
            if (!match) {
              prefs.banks.push({
                id: String(payout.id),
                bankName: payout.bank_name,
                accountName: payout.account_name,
                accountNumber: `**** **** **** ${payout.account_number_last4}`,
                isDefault: payout.is_default,
              });
              updated = true;
            } else {
              if (match.isDefault !== payout.is_default) {
                match.isDefault = payout.is_default;
                updated = true;
              }
            }
          });
          if (updated) {
            setBanks(prefs.banks);
            saveProfilePreferences(user.email, prefs);
          }
        }
      })
      .catch(() => {
        // Not a seller, ignore
      });
  }, [user?.email]);

  useEffect(() => {
    const prefs = loadProfilePreferences(user?.email);
    setAddresses(prefs.addresses);
    setBanks(prefs.banks);
  }, [user?.email]);

  useEffect(() => {
    setEmailDraft(user?.email ?? '');
    setEmailOtp('');
    setEmailOtpSent(false);
    setEmailMsg(null);
  }, [user?.email]);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const persist = (nextAddresses = addresses, nextBanks = banks) => {
    setAddresses(nextAddresses);
    setBanks(nextBanks);
    saveProfilePreferences(user?.email, { addresses: nextAddresses, banks: nextBanks });
    onSuccessSubmit();

    // Sync default address to seller store address if seller profile is active
    const defaultAddr = nextAddresses.find((a) => a.isDefault) ?? nextAddresses[0];
    if (defaultAddr && user?.email) {
      apiJson<{ profile?: SellerProfileSync }>('/api/marketplace/seller/settings')
        .then((data) => {
          if (data && data.profile) {
            return apiJson('/api/marketplace/seller/settings/store', {
              method: 'PUT',
              body: JSON.stringify({
                store_name: data.profile.store_name,
                store_description: data.profile.store_description ?? '',
                phone: data.profile.phone ?? defaultAddr.phone,
                address: defaultAddr.address,
              }),
            });
          }
        })
        .catch(() => {
          // Ignore
        });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMsg(null);
    const fd = new FormData(e.currentTarget);
    const full_name = fd.get('full_name') as string;
    const bio = fd.get('bio') as string;

    try {
      const r = await apiFetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, bio }),
      });
      const data = (await r.json().catch(() => ({}))) as { message?: string };
      if (!r.ok) {
        throw new Error(data.message ?? 'Lỗi cập nhật hồ sơ');
      }
      setProfileMsg({ text: 'Cập nhật hồ sơ thành công!', type: 'success' });
      notifyAuthChanged({ authenticated: true });
      onSuccessSubmit();
    } catch (err: unknown) {
      setProfileMsg({ text: err instanceof Error ? err.message : 'Lỗi cập nhật hồ sơ', type: 'error' });
    }
  };

  const handleRequestEmailOtp = async () => {
    const nextEmail = emailDraft.trim().toLowerCase();
    if (!nextEmail) {
      setEmailMsg({ text: 'Vui lòng nhập email mới.', type: 'error' });
      return;
    }
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const data = await apiJson<{ message?: string }>('/api/auth/email/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email: nextEmail }),
      });
      setEmailMsg({ text: data.message ?? 'Đã gửi mã OTP.', type: 'success' });
      setEmailOtp('');
      setEmailOtpSent(true);
    } catch (err) {
      setEmailMsg({ text: err instanceof Error ? err.message : 'Không gửi được mã OTP.', type: 'error' });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const otp = emailOtp.trim();
    if (!otp) {
      setEmailMsg({ text: 'Vui lòng nhập mã OTP.', type: 'error' });
      return;
    }
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const data = await apiJson<{ message?: string }>('/api/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify({ otp }),
      });
      setEmailMsg({ text: data.message ?? 'Đổi email thành công.', type: 'success' });
      setEmailOtp('');
      setEmailOtpSent(false);
      notifyAuthChanged({ authenticated: true });
      onSuccessSubmit();
    } catch (err) {
      setEmailMsg({ text: err instanceof Error ? err.message : 'Xác thực OTP thất bại.', type: 'error' });
    } finally {
      setEmailBusy(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPassMsg(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const current_password = fd.get('current_password') as string;
    const new_password = fd.get('new_password') as string;
    const confirm_password = fd.get('confirm_password') as string;

    if (new_password !== confirm_password) {
      setPassMsg({ text: 'Mật khẩu xác nhận không khớp.', type: 'error' });
      return;
    }

    try {
      await apiFetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password, new_password }),
      });
      setPassMsg({ text: 'Đổi mật khẩu thành công!', type: 'success' });
      form.reset();
    } catch (err: unknown) {
      setPassMsg({ text: err instanceof Error ? err.message : 'Lỗi đổi mật khẩu', type: 'error' });
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.name.trim() || !addressForm.phone.trim() || !addressForm.address.trim()) return;

    const phoneVal = addressForm.phone.trim();
    if (!/^[0-9]{10}$/.test(phoneVal)) {
      toast.error('Số điện thoại phải bao gồm đúng 10 chữ số và không chứa ký tự khác.');
      return;
    }

    const nextAddress: SavedAddress = {
      id: editingAddressId ?? makeId(),
      name: addressForm.name.trim(),
      phone: phoneVal,
      address: addressForm.address.trim(),
      isDefault: editingAddressId
        ? addresses.find((item) => item.id === editingAddressId)?.isDefault ?? addresses.length === 0
        : addresses.length === 0,
    };

    const nextAddresses = editingAddressId
      ? addresses.map((item) => (item.id === editingAddressId ? nextAddress : item))
      : [...addresses, nextAddress];
    persist(nextAddresses, banks);
    setAddressForm(blankAddress);
    setEditingAddressId(null);
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bankName.trim() || !bankForm.accountName.trim() || !bankForm.accountNumber.trim()) return;

    const nextBank: LinkedBankAccount = {
      id: editingBankId ?? makeId(),
      bankName: bankForm.bankName.trim(),
      accountName: bankForm.accountName.trim(),
      accountNumber: bankForm.accountNumber.trim(),
      isDefault: editingBankId
        ? banks.find((item) => item.id === editingBankId)?.isDefault ?? banks.length === 0
        : banks.length === 0,
    };

    const nextBanks = editingBankId
      ? banks.map((item) => (item.id === editingBankId ? nextBank : item))
      : [...banks, nextBank];
    persist(addresses, nextBanks);
    setBankForm(blankBank);
    setBankQuery('');
    setEditingBankId(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-6">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  const defaultAddress = addresses.find((item) => item.isDefault);
  const defaultBank = banks.find((item) => item.isDefault);

  if (view === 'main') {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className={sectionTitleClass}>Tài khoản của tôi</div>
        <SettingRow icon={Shield} label="Tài khoản & Bảo mật" detail={user?.email} onClick={() => setView('account')} />
        <SettingRow
          icon={MapPin}
          label="Địa chỉ"
          detail={defaultAddress ? `${defaultAddress.name} · ${defaultAddress.address}` : 'Thêm địa chỉ giao hàng'}
          onClick={() => setView('addresses')}
        />
        <SettingRow
          icon={CreditCard}
          label="Tài khoản / Thẻ ngân hàng"
          detail={defaultBank ? `${defaultBank.bankName} · ${maskBankNumber(defaultBank.accountNumber)}` : 'Liên kết tài khoản ngân hàng'}
          onClick={() => setView('banks')}
        />

        <div className={sectionTitleClass}>Cài đặt</div>
        <SettingRow
          icon={MessageCircle}
          label="Cài đặt Chat"
          detail="Mở tin nhắn với cửa hàng"
          onClick={() => navigate('/messages', { state: { from: '/profile?tab=settings' } })}
        />
        <SettingRow
          icon={Bell}
          label="Cài đặt Thông báo"
          detail="Nhận thông báo đơn hàng và tài khoản"
          onClick={() => navigate('/seller/settings?section=notifications', { state: { from: '/profile?tab=settings' } })}
        />
        <div className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Moon className="h-5 w-5 shrink-0 text-gray-400 dark:text-slate-500" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">Giao diện tối</p>
              <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-slate-400">Bật/tắt chế độ ban đêm</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDark ? 'true' : 'false'}
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${isDark ? 'bg-amber-500' : 'bg-gray-200 dark:bg-slate-700'}`}
          >
            <span className="sr-only">Bật giao diện tối</span>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-slate-100">
      <button
        type="button"
        onClick={() => setView('main')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại cài đặt
      </button>

      {view === 'account' && (
        <div className="space-y-8">
          <div>
            <h2 className="mb-6 text-2xl font-bold text-gray-950 dark:text-white">Tài khoản & Bảo mật</h2>
            <form className="max-w-lg space-y-6" onSubmit={handleProfileSubmit}>
              <div>
                <label className={labelClass}>Họ và tên</label>
                <input name="full_name" type="text" defaultValue={user?.full_name} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tên người dùng</label>
                <input value={user?.email.split('@')[0] ?? ''} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 font-medium text-gray-600 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" />
              </div>
              <div>
                <label className={labelClass}>Email nhận hóa đơn</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => {
                      setEmailDraft(e.target.value);
                      if (emailOtpSent) {
                        setEmailOtpSent(false);
                        setEmailOtp('');
                      }
                      setEmailMsg(null);
                    }}
                    placeholder="Email mới"
                    className={`${inputClass} sm:w-auto sm:flex-1`}
                  />
                  <button
                    type="button"
                    disabled={emailBusy || !emailDraft.trim()}
                    onClick={handleRequestEmailOtp}
                    className="whitespace-nowrap rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
                  >
                    {emailBusy ? 'Đang gửi…' : 'Xác nhận'}
                  </button>
                </div>
                {emailOtpSent && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Nhập OTP 6 số"
                        className={`${inputClass} sm:w-auto sm:flex-1`}
                      />
                      <button
                        type="button"
                        disabled={emailBusy || emailOtp.length !== 6}
                        onClick={handleVerifyEmailOtp}
                        className="whitespace-nowrap rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                      >
                        Xác nhận OTP
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">OTP đã gửi tới email mới. Vui lòng nhập để hoàn tất đổi email.</p>
                  </div>
                )}
                {emailMsg && (
                  <div className={`mt-3 rounded-md border p-3 text-sm ${emailMsg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
                    {emailMsg.text}
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Tiểu sử</label>
                <textarea name="bio" defaultValue={user?.bio} rows={4} className={inputClass} />
              </div>
              {profileMsg && (
                <div className={`rounded-md border p-3 text-sm ${profileMsg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
                  {profileMsg.text}
                </div>
              )}
              <button type="submit" className="rounded-lg bg-black px-6 py-2 font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                Lưu hồ sơ
              </button>
            </form>
          </div>

          <div className="border-t border-gray-200 pt-8 dark:border-slate-700">
            <h3 className="mb-6 text-xl font-bold text-gray-950 dark:text-white">Đổi mật khẩu</h3>
            <form className="max-w-lg space-y-6" onSubmit={handlePasswordSubmit}>
              <input name="current_password" type="password" required placeholder="Mật khẩu hiện tại" className={inputClass} />
              <input name="new_password" type="password" required minLength={8} placeholder="Mật khẩu mới" className={inputClass} />
              <input name="confirm_password" type="password" required minLength={8} placeholder="Xác nhận mật khẩu mới" className={inputClass} />
              {passMsg && (
                <div className={`rounded-md border p-3 text-sm ${passMsg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
                  {passMsg.text}
                </div>
              )}
              <button type="submit" className="rounded-lg bg-black px-6 py-2 font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                Đổi mật khẩu
              </button>
            </form>
          </div>
        </div>
      )}

      {view === 'addresses' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white">Địa chỉ của tôi</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {addresses.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 dark:text-slate-400">Chưa có địa chỉ nào.</div>
            ) : (
              addresses.map((item) => (
                <div key={item.id} className="border-b border-gray-100 p-5 last:border-b-0 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-950 dark:text-white">{item.name} <span className="font-normal text-gray-400">| {item.phone}</span></p>
                      <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-slate-300">{item.address}</p>
                      {item.isDefault && <span className="mt-3 inline-flex rounded border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-500">Mặc định</span>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!item.isDefault && <button type="button" onClick={() => persist(addresses.map((a) => ({ ...a, isDefault: a.id === item.id })), banks)} className="text-xs font-semibold text-amber-600">Mặc định</button>}
                      <button type="button" onClick={() => { setEditingAddressId(item.id); setAddressForm({ name: item.name, phone: item.phone, address: item.address }); }} className="text-xs font-semibold text-blue-600">Sửa</button>
                      <button type="button" onClick={() => persist(addresses.filter((a) => a.id !== item.id), banks)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddressSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-950 dark:text-white"><Plus className="h-4 w-4" /> {editingAddressId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <input value={addressForm.name} onChange={(e) => setAddressForm((f) => ({ ...f, name: e.target.value }))} placeholder="Họ tên người nhận" className={inputClass} />
              <input
                value={addressForm.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length <= 10) {
                    setAddressForm((f) => ({ ...f, phone: val }));
                  }
                }}
                placeholder="Số điện thoại"
                className={inputClass}
              />
              <textarea value={addressForm.address} onChange={(e) => setAddressForm((f) => ({ ...f, address: e.target.value }))} rows={3} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" className={`${inputClass} resize-none md:col-span-2`} />
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className="rounded-lg bg-black px-5 py-2 font-semibold text-white dark:bg-white dark:text-slate-950">{editingAddressId ? 'Lưu địa chỉ' : 'Thêm địa chỉ'}</button>
              {editingAddressId && <button type="button" onClick={() => { setEditingAddressId(null); setAddressForm(blankAddress); }} className="rounded-lg border border-gray-200 px-5 py-2 font-semibold text-gray-600 dark:border-slate-700 dark:text-slate-300">Hủy</button>}
            </div>
          </form>
        </div>
      )}

      {view === 'banks' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white">Phương thức thanh toán</h2>
          <div className={sectionTitleClass}>Ngân hàng liên kết</div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {banks.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 dark:text-slate-400">Chưa liên kết tài khoản ngân hàng.</div>
            ) : (
              banks.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 border-b border-gray-100 p-5 last:border-b-0 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-gray-950 dark:text-white">{item.bankName}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{item.accountName} · {maskBankNumber(item.accountNumber)}</p>
                    {item.isDefault && <span className="mt-3 inline-flex rounded border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-500">Mặc định</span>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!item.isDefault && <button type="button" onClick={() => persist(addresses, banks.map((b) => ({ ...b, isDefault: b.id === item.id })))} className="text-xs font-semibold text-amber-600">Mặc định</button>}
                    <button type="button" onClick={() => { setEditingBankId(item.id); setBankForm({ bankName: item.bankName, accountName: item.accountName, accountNumber: item.accountNumber }); setBankQuery(item.bankName); }} className="text-xs font-semibold text-blue-600">Sửa</button>
                    <button type="button" onClick={() => persist(addresses, banks.filter((b) => b.id !== item.id))} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleBankSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-950 dark:text-white"><Plus className="h-4 w-4" /> {editingBankId ? 'Cập nhật tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng'}</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <input
                  className={inputClass}
                  placeholder="Tên ngân hàng"
                  value={bankQuery}
                  onChange={(e) => {
                    setBankQuery(e.target.value);
                    setBankForm((f) => ({ ...f, bankName: e.target.value }));
                    setShowBankList(true);
                  }}
                  onFocus={() => setShowBankList(true)}
                />
                {showBankList && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowBankList(false)} />
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      {bankLoading && <div className="p-3 text-sm text-slate-500">Đang tải...</div>}
                      {!bankLoading && filteredBanks.length === 0 && (
                        <div className="p-3 text-sm text-slate-500">Không tìm thấy ngân hàng.</div>
                      )}
                      {filteredBanks.map((bank) => (
                        <button
                          key={bank.bin}
                          type="button"
                          onClick={() => {
                            setBankForm((f) => ({ ...f, bankName: bank.shortName || bank.name }));
                            setBankQuery(bank.shortName || bank.name);
                            setShowBankList(false);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-slate-800"
                        >
                          {bank.logo ? (
                            <img src={bank.logo} alt={bank.shortName} className="h-6 w-6 rounded-full object-contain bg-white shrink-0" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{bank.shortName}</p>
                            <p className="text-xs text-slate-400 truncate">{bank.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <input value={bankForm.accountName} onChange={(e) => setBankForm((f) => ({ ...f, accountName: e.target.value }))} placeholder="Tên chủ tài khoản" className={inputClass} />
              <input value={bankForm.accountNumber} onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))} placeholder="Số tài khoản" className={inputClass} />
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className="rounded-lg bg-black px-5 py-2 font-semibold text-white dark:bg-white dark:text-slate-950">{editingBankId ? 'Lưu tài khoản' : 'Liên kết ngân hàng'}</button>
              {editingBankId && <button type="button" onClick={() => { setEditingBankId(null); setBankForm(blankBank); setBankQuery(''); }} className="rounded-lg border border-gray-200 px-5 py-2 font-semibold text-gray-600 dark:border-slate-700 dark:text-slate-300">Hủy</button>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
