import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  MailCheck,
  MessageCircle,
  ShieldCheck,
  Store,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson } from '../../lib/api';

type VerificationStatus = 'draft' | 'pending' | 'verified' | 'rejected' | 'suspended';
type BusinessType = 'individual' | 'household' | 'company';

interface SellerProfileSettings {
  user_id: number;
  store_name: string;
  store_description: string | null;
  phone: string | null;
  address: string | null;
  is_verified: boolean;
  verification_status: VerificationStatus;
  legal_name: string | null;
  business_type: BusinessType;
  tax_code: string | null;
  identity_last4: string | null;
  rejection_reason: string | null;
  full_name: string;
  email: string;
}

interface SellerPreferences {
  chat_enabled: boolean;
  order_notifications: boolean;
  account_notifications: boolean;
  marketing_notifications: boolean;
  profile_visible: boolean;
  show_phone: boolean;
  show_address: boolean;
}

interface PayoutAccount {
  id: number;
  bank_name: string;
  account_name: string;
  account_number_last4: string;
  is_default: boolean;
  verification_status: string;
}

interface SecurityState {
  passwordVerified: boolean;
  passwordVerifiedUntil: number | null;
  otpVerified: boolean;
  otpVerifiedUntil: number | null;
}

interface SettingsResponse {
  profile: SellerProfileSettings;
  settings: SellerPreferences;
  payout_accounts: PayoutAccount[];
  security: SecurityState;
}

const panelClass = 'rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200';

function statusLabel(status: VerificationStatus) {
  const map: Record<VerificationStatus, string> = {
    draft: 'Chưa gửi xác minh',
    pending: 'Đang chờ duyệt',
    verified: 'Đã xác minh',
    rejected: 'Cần bổ sung',
    suspended: 'Tạm khóa',
  };
  return map[status] ?? status;
}

function maskTime(value: number | null) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function maskEmail(email: string | null) {
  if (!email) return '';
  const parts = String(email).split('@');
  if (parts.length !== 2) return '***';
  const local = parts[0];
  const domain = parts[1];
  const tld = domain.split('.').slice(-1)[0] ?? '';
  return `${local[0] ?? '*'}***@***.${tld}`;
}

function ToggleRow({
  icon: Icon,
  title,
  detail,
  checked,
  onChange,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-5' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SellerProfileSettings | null>(null);
  const [preferences, setPreferences] = useState<SellerPreferences | null>(null);
  const [payouts, setPayouts] = useState<PayoutAccount[]>([]);
  const [security, setSecurity] = useState<SecurityState | null>(null);
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [securityBusy, setSecurityBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const [storeForm, setStoreForm] = useState({
    store_name: '',
    store_description: '',
    phone: '',
    address: '',
  });
  const [verificationForm, setVerificationForm] = useState({
    legal_name: '',
    business_type: 'individual' as BusinessType,
    tax_code: '',
    identity_number: '',
  });
  const [verificationEdit, setVerificationEdit] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    bank_name: '',
    account_name: '',
    account_number: '',
    is_default: true,
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<SettingsResponse>('/api/marketplace/seller/settings');
      setProfile(data.profile);
      setPreferences(data.settings);
      setPayouts(data.payout_accounts);
      setSecurity(data.security);
      setStoreForm({
        store_name: data.profile.store_name,
        store_description: data.profile.store_description ?? '',
        phone: data.profile.phone ?? '',
        address: data.profile.address ?? '',
      });
      setVerificationForm({
        legal_name: data.profile.legal_name ?? '',
        business_type: data.profile.business_type,
        tax_code: data.profile.tax_code ?? '',
        // do not populate full identity into the form; keep it empty and show masked value separately
        identity_number: '',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không tải được cài đặt seller');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Load reCAPTCHA script if site key is provided
  useEffect(() => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (!siteKey) return;
    if (typeof window === 'undefined') return;
    // safe-check grecaptcha without using `any`
    type Grecaptcha = { execute: (siteKey: string, opts?: { action?: string }) => Promise<string> };
    if ((window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha) return;
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  async function getRecaptchaToken(action = 'seller_verification') {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (!siteKey) return undefined;
    try {
      type Grecaptcha = { execute: (siteKey: string, opts?: { action?: string }) => Promise<string> };
      const gre = (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
      if (!gre || typeof gre.execute !== 'function') return undefined;
      const token = await gre.execute(siteKey, { action });
      return token;
    } catch (e) {
      console.warn('reCAPTCHA token error', e);
      return undefined;
    }
  }

  const needsOtp = useMemo(() => !security?.otpVerified, [security?.otpVerified]);
  const needsPassword = useMemo(() => !security?.passwordVerified, [security?.passwordVerified]);

  const verifyPassword = async () => {
    if (!password.trim()) return;
    setSecurityBusy(true);
    try {
      const data = await apiJson<{ security: SecurityState }>('/api/marketplace/seller/security/password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setSecurity(data.security);
      setPassword('');
      toast.success('Đã xác thực mật khẩu');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xác thực thất bại');
    } finally {
      setSecurityBusy(false);
    }
  };

  const requestOtp = async () => {
    setSecurityBusy(true);
    try {
      await apiJson('/api/marketplace/seller/security/otp/request', { method: 'POST' });
      toast.success('Đã gửi OTP đến email');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không gửi được OTP');
    } finally {
      setSecurityBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) return;
    setSecurityBusy(true);
    try {
      const data = await apiJson<{ security: SecurityState }>('/api/marketplace/seller/security/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ otp }),
      });
      setSecurity(data.security);
      setOtp('');
      toast.success('Đã xác thực OTP');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'OTP không hợp lệ');
    } finally {
      setSecurityBusy(false);
    }
  };

  const saveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await apiJson<{ profile: SellerProfileSettings }>('/api/marketplace/seller/settings/store', {
        method: 'PUT',
        body: JSON.stringify(storeForm),
      });
      setProfile(data.profile);
      toast.success('Đã lưu thông tin cửa hàng');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsPassword) {
      toast.error('Nhập lại mật khẩu trước khi gửi xác minh');
      return;
    }
    if (verificationEdit && !verificationForm.identity_number.trim()) {
      toast.error('Vui lòng nhập CCCD/Passport trước khi gửi.');
      return;
    }
    setSaving(true);
    try {
      const recaptchaToken = await getRecaptchaToken('seller_verification');
      const body = { ...verificationForm, recaptcha_token: recaptchaToken };
      const data = await apiJson<{ profile: SellerProfileSettings }>('/api/marketplace/seller/settings/verification', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setProfile(data.profile);
      // exit edit mode after submit
      setVerificationEdit(false);
      toast.success('Đã gửi hồ sơ xác minh');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không gửi được hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async (next: SellerPreferences) => {
    setPreferences(next);
    try {
      const data = await apiJson<{ settings: SellerPreferences }>('/api/marketplace/seller/settings/preferences', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      setPreferences(data.settings);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không lưu được cài đặt');
      void loadSettings();
    }
  };

  const addPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsPassword || needsOtp) {
      toast.error('Can xac thuc mat khau va OTP truoc khi sua tai khoan ngan hang');
      return;
    }
    setSaving(true);
    try {
      await apiJson('/api/marketplace/seller/payout-accounts', {
        method: 'POST',
        body: JSON.stringify(payoutForm),
      });
      setPayoutForm({ bank_name: '', account_name: '', account_number: '', is_default: true });
      await loadSettings();
      toast.success('Đã thêm tài khoản ngân hàng');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thêm được tài khoản');
    } finally {
      setSaving(false);
    }
  };

  const deletePayout = async (id: number) => {
    if (needsPassword || needsOtp) {
      toast.error('Can xac thuc mat khau va OTP truoc khi xoa tai khoan ngan hang');
      return;
    }
    try {
      await apiJson(`/api/marketplace/seller/payout-accounts/${id}`, { method: 'DELETE' });
      setPayouts((prev) => prev.filter((item) => item.id !== id));
      toast.success('Đã xóa tài khoản');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xóa được');
    }
  };

  const setDefaultPayout = async (id: number) => {
    if (needsPassword || needsOtp) {
      toast.error('Can xac thuc mat khau va OTP truoc khi doi mac dinh');
      return;
    }
    try {
      await apiJson(`/api/marketplace/seller/payout-accounts/${id}/default`, { method: 'PUT' });
      setPayouts((prev) => prev.map((item) => ({ ...item, is_default: item.id === id })));
      toast.success('Đã đặt mặc định');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không cập nhật được');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-10 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!profile || !preferences) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <Store className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="font-semibold text-slate-900 dark:text-white">Bạn chưa có kênh bán hàng.</p>
          <Link to="/seller" className="mt-4 inline-flex rounded-md bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            Quay lại kênh bán hàng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/seller" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Quay lai dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-bold">Cài đặt nhà bán hàng</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bảo mật thông tin cửa hàng, xác minh và tài khoản thanh toán.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="font-semibold">Trang thai: </span>
            <span className={profile.verification_status === 'verified' ? 'text-emerald-600' : 'text-amber-600'}>
              {statusLabel(profile.verification_status)}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={panelClass}>
              <div className="mb-5 flex items-center gap-3">
                <Store className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold">Thông tin cửa hàng</h2>
              </div>
              <form onSubmit={saveStore} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Tên cửa hàng</label>
                  <input className={inputClass} value={storeForm.store_name} onChange={(e) => setStoreForm((f) => ({ ...f, store_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Số điện thoại</label>
                  <input className={inputClass} value={storeForm.phone} onChange={(e) => setStoreForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Địa chỉ kinh doanh</label>
                  <input className={inputClass} value={storeForm.address} onChange={(e) => setStoreForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Mô tả cửa hàng</label>
                  <textarea className={`${inputClass} min-h-24 resize-none`} value={storeForm.store_description} onChange={(e) => setStoreForm((f) => ({ ...f, store_description: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <button disabled={saving} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950">
                    Lưu thông tin
                  </button>
                </div>
              </form>
            </motion.section>

            <section className={panelClass}>
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-bold">Xác minh người bán</h2>
              </div>
              {verificationEdit ? (
                <form onSubmit={submitVerification} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Tên pháp lý</label>
                    <input className={inputClass} value={verificationForm.legal_name} onChange={(e) => setVerificationForm((f) => ({ ...f, legal_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Loại hình</label>
                    <select className={inputClass} value={verificationForm.business_type} onChange={(e) => setVerificationForm((f) => ({ ...f, business_type: e.target.value as BusinessType }))}>
                      <option value="individual">Cá nhân</option>
                      <option value="household">Hộ kinh doanh</option>
                      <option value="company">Công ty</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Mã số thuế</label>
                    <input className={inputClass} value={verificationForm.tax_code} onChange={(e) => setVerificationForm((f) => ({ ...f, tax_code: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>CCCD / Passport</label>
                    <input className={inputClass} value={verificationForm.identity_number} onChange={(e) => setVerificationForm((f) => ({ ...f, identity_number: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                    <button disabled={saving || needsPassword} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                      Gửi hồ sơ xác minh
                    </button>
                    <button type="button" onClick={() => { setVerificationEdit(false); void loadSettings(); }} className="rounded-md border px-4 py-2 text-sm">
                      Hủy
                    </button>
                    {needsPassword && <span className="text-sm text-amber-600">Cần xác thực mật khẩu trước.</span>}
                  </div>
                </form>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Tên pháp lý</label>
                    <div className={`${inputClass} py-2`}>{profile.legal_name ? 'Đã lưu (ẩn)' : 'Chưa cung cấp'}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Loại hình</label>
                    <div className={`${inputClass} py-2`}>{profile.business_type === 'individual' ? 'Cá nhân' : profile.business_type === 'household' ? 'Hộ kinh doanh' : 'Công ty'}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Mã số thuế</label>
                    <div className={`${inputClass} py-2`}>{profile.tax_code ? `***${String(profile.tax_code).slice(-3)}` : 'Chưa cung cấp'}</div>
                  </div>
                  <div>
                    <label className={labelClass}>CCCD / Passport</label>
                    <div className={`${inputClass} py-2`}>{profile.identity_last4 ? `****${profile.identity_last4}` : 'Chưa cung cấp'}</div>
                  </div>
                  <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setVerificationEdit(true)} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
                      Chỉnh sửa
                    </button>
                    <p className="text-sm text-slate-500">Hồ sơ sẽ được gửi đến đội kiểm duyệt Marketplace.</p>
                  </div>
                </div>
              )}
            </section>

            <section className={panelClass}>
              <div className="mb-5 flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-bold">Tài khoản ngân hàng</h2>
              </div>
              <div className="mb-5 space-y-3">
                {payouts.length === 0 ? (
                  <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Chưa có tài khoản thanh toán.</p>
                ) : (
                  payouts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-4 dark:border-slate-800">
                      <div>
                        <p className="font-bold">{item.bank_name} {item.is_default && <span className="ml-2 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Mặc định</span>}</p>
                        <p className="text-sm text-slate-500">{item.account_name} - **** {item.account_number_last4}</p>
                      </div>
                      <div className="flex gap-2">
                        {!item.is_default && (
                          <button type="button" onClick={() => void setDefaultPayout(item.id)} className="text-sm font-semibold text-amber-600">
                            Mặc định
                          </button>
                        )}
                        <button type="button" onClick={() => void deletePayout(item.id)} className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={addPayout} className="grid gap-4 md:grid-cols-3">
                <input className={inputClass} placeholder="Tên ngân hàng" value={payoutForm.bank_name} onChange={(e) => setPayoutForm((f) => ({ ...f, bank_name: e.target.value }))} />
                <input className={inputClass} placeholder="Tên chủ tài khoản" value={payoutForm.account_name} onChange={(e) => setPayoutForm((f) => ({ ...f, account_name: e.target.value }))} />
                <input className={inputClass} placeholder="Số tài khoản" value={payoutForm.account_number} onChange={(e) => setPayoutForm((f) => ({ ...f, account_number: e.target.value }))} />
                <div className="md:col-span-3">
                  <button disabled={saving || needsPassword || needsOtp} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                    Thêm tài khoản
                  </button>
                  {(needsPassword || needsOtp) && <span className="ml-3 text-sm text-amber-600">Cần xác thực mật khẩu và OTP.</span>}
                </div>
              </form>
            </section>

            <section className={panelClass}>
              <div className="mb-2 flex items-center gap-3">
                <Bell className="h-5 w-5 text-purple-500" />
                <h2 className="text-lg font-bold">Thông báo & Riêng tư</h2>
              </div>
              <ToggleRow icon={MessageCircle} title="Chat với khách hàng" detail="Cho phép người mua mở tin nhắn với cửa hàng" checked={preferences.chat_enabled} onChange={(v) => void savePreferences({ ...preferences, chat_enabled: v })} />
              <ToggleRow icon={Bell} title="Thông báo đơn hàng" detail="Nhận thông báo khi có đơn hàng và cập nhật trạng thái" checked={preferences.order_notifications} onChange={(v) => void savePreferences({ ...preferences, order_notifications: v })} />
              <ToggleRow icon={MailCheck} title="Thông báo tài khoản" detail="Nhận email về bảo mật và hồ sơ người bán" checked={preferences.account_notifications} onChange={(v) => void savePreferences({ ...preferences, account_notifications: v })} />
              <ToggleRow icon={preferences.profile_visible ? Eye : EyeOff} title="Hiển thị hồ sơ cửa hàng" detail="Cho phép người mua xem trang của cửa hàng công khai" checked={preferences.profile_visible} onChange={(v) => void savePreferences({ ...preferences, profile_visible: v })} />
            </section>
          </main>

          <aside className="space-y-6">
            <section className={panelClass}>
              <div className="mb-4 flex items-center gap-3">
                <Lock className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-bold">Xác thực bảo mật</h2>
              </div>
              <div className="space-y-4">
                <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950">
                  <p className="font-semibold">{security?.passwordVerified ? 'Mật khẩu đã xác thực' : 'Cần nhập lại mật khẩu'}</p>
                  {security?.passwordVerifiedUntil && <p className="text-slate-500">Hiệu lực đến {maskTime(security.passwordVerifiedUntil)}</p>}
                </div>
                <input className={inputClass} type="password" placeholder="Mật khẩu hiện tại" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" disabled={securityBusy || !password} onClick={() => void verifyPassword()} className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                  Xác thực mật khẩu
                </button>

                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="mb-3 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950">
                    <p className="font-semibold">{security?.otpVerified ? 'OTP đã xác thực' : 'OTP bảo mật'}</p>
                    {security?.otpVerifiedUntil && <p className="text-slate-500">Hiệu lực đến {maskTime(security.otpVerifiedUntil)}</p>}
                  </div>
                  <button type="button" disabled={securityBusy || needsPassword} onClick={() => void requestOtp()} className="mb-3 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">
                    Gửi OTP qua email
                  </button>
                  <div className="flex gap-2">
                    <input className={inputClass} placeholder="6 chữ số OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    <button type="button" disabled={securityBusy || !otp || needsPassword} onClick={() => void verifyOtp()} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className={panelClass}>
              <div className="mb-4 flex items-center gap-3">
                <Building2 className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold">Tom tat</h2>
              </div>
              <div className="space-y-3 text-sm">
                <p><span className="text-slate-500">Email:</span> {maskEmail(profile.email)}</p>
                <p><span className="text-slate-500">Cửa hàng:</span> {profile.store_name}</p>
                <p><span className="text-slate-500">Tài khoản:</span> {payouts.length} tài khoản</p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${profile.is_verified ? 'text-emerald-500' : 'text-slate-400'}`} />
                  {profile.is_verified ? 'Đủ điều kiện bán hàng' : 'Đang cần xác minh'}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
