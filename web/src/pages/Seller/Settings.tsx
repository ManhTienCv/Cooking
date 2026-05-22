import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Lock,
  MessageCircle,
  ShieldCheck,
  Store,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson } from '../../lib/api';
import PageBackBar from '../../components/ui/PageBackBar';
import { loadProfilePreferences, saveProfilePreferences, type LinkedBankAccount } from '../../lib/profilePreferences';
import {
  type VietQrBank,
  type BusinessType,
  type SellerProfileSettings,
  type SellerPreferences,
  type PayoutAccount,
  type SecurityState,
  type SettingsResponse,
  panelClass,
  inputClass,
  labelClass,
  AccordionSection,
  statusLabel,
  maskTime,
  maskEmail,
  ToggleRow,
} from './components/SettingsHelpers';

export default function SellerSettings() {
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SellerProfileSettings | null>(null);
  const [preferences, setPreferences] = useState<SellerPreferences | null>(null);
  const [payouts, setPayouts] = useState<PayoutAccount[]>([]);
  const [security, setSecurity] = useState<SecurityState | null>(null);
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [securityBusy, setSecurityBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('store');
  const [showVerificationSecurity, setShowVerificationSecurity] = useState(false);
  const [showPayoutSecurity, setShowPayoutSecurity] = useState(false);

  const toggleSection = (id: string) => setOpenSection(openSection === id ? null : id);

  useEffect(() => {
    const validSections = new Set(['store', 'verification', 'payout', 'notifications']);
    if (sectionParam && validSections.has(sectionParam)) {
      setOpenSection(sectionParam);
    }
  }, [sectionParam]);

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

  const [banksList, setBanksList] = useState<VietQrBank[]>([]);
  const [bankQuery, setBankQuery] = useState('');
  const [showBankList, setShowBankList] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);

  useEffect(() => {
    if (openSection !== 'payout' || banksList.length > 0) return;
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
  }, [openSection, banksList.length]);

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q) return banksList;
    return banksList.filter((b) => {
      const name = `${b.name} ${b.shortName} ${b.bin}`.toLowerCase();
      return name.includes(q);
    });
  }, [bankQuery, banksList]);

  const [localBanksToSync, setLocalBanksToSync] = useState<LinkedBankAccount[]>([]);

  useEffect(() => {
    if (!profile?.email) {
      setLocalBanksToSync([]);
      return;
    }
    try {
      const prefs = loadProfilePreferences(profile.email);
      const filtered = prefs.banks.filter((lb) => {
        return !payouts.some(
          (db) =>
            db.bank_name.toLowerCase() === lb.bankName.toLowerCase() &&
            (lb.accountNumber.endsWith(db.account_number_last4) || db.account_number_last4.endsWith(lb.accountNumber.slice(-4)))
        );
      });
      setLocalBanksToSync(filtered);
    } catch {
      setLocalBanksToSync([]);
    }
  }, [profile, payouts]);

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

      // Synchronize address with localStorage
      try {
        const prefs = loadProfilePreferences(data.profile.email);
        const dbAddress = data.profile.address;
        const defaultAddr = prefs.addresses.find((a) => a.isDefault);

        if (dbAddress && (!defaultAddr || defaultAddr.address !== dbAddress)) {
          const newAddress = {
            id: defaultAddr?.id ?? String(Date.now()),
            name: defaultAddr?.name ?? data.profile.full_name ?? 'Cửa hàng',
            phone: defaultAddr?.phone ?? data.profile.phone ?? '',
            address: dbAddress,
            isDefault: true,
          };
          const otherAddresses = prefs.addresses.filter((a) => a.id !== newAddress.id).map((a) => ({ ...a, isDefault: false }));
          prefs.addresses = [newAddress, ...otherAddresses];
          saveProfilePreferences(data.profile.email, prefs);
        } else if (!dbAddress && defaultAddr) {
          // Sync default address from localStorage to database
          apiJson<{ profile: SellerProfileSettings }>('/api/marketplace/seller/settings/store', {
            method: 'PUT',
            body: JSON.stringify({
              store_name: data.profile.store_name,
              store_description: data.profile.store_description ?? '',
              phone: data.profile.phone ?? defaultAddr.phone,
              address: defaultAddr.address,
            }),
          }).then((res) => {
            if (res && res.profile) {
              setProfile(res.profile);
              setStoreForm((f) => ({ ...f, address: res.profile.address ?? '' }));
            }
          }).catch((err) => console.warn('Sync address to DB failed:', err));
        }
      } catch (err) {
        console.warn('Sync address error:', err);
      }

      // Synchronize bank accounts with localStorage
      try {
        const prefs = loadProfilePreferences(data.profile.email);
        let updatedPrefs = false;
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
            updatedPrefs = true;
          } else {
            if (match.isDefault !== payout.is_default) {
              match.isDefault = payout.is_default;
              updatedPrefs = true;
            }
          }
        });
        if (updatedPrefs) {
          saveProfilePreferences(data.profile.email, prefs);
        }
      } catch (err) {
        console.warn('Sync bank error:', err);
      }
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

  // Nhận mã reCAPTCHA v3 từ dịch vụ của Google để xác thực hành động bảo mật
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

  useEffect(() => {
    if (!needsPassword && !needsOtp) {
      setShowPayoutSecurity(false);
    }
    if (!needsPassword) {
      setShowVerificationSecurity(false);
    }
  }, [needsPassword, needsOtp]);

  // Gửi yêu cầu xác thực mật khẩu hiện tại của người dùng lên server
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

  // Gửi yêu cầu mã OTP mới qua email đăng ký của cửa hàng
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

  // Gửi mã OTP do người dùng nhập để xác thực hành động bảo mật
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

  // Lưu các thông tin cơ bản của cửa hàng (tên, số điện thoại, địa chỉ, mô tả)
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

      // Sync store address to localStorage default address
      if (data.profile.email && data.profile.address) {
        try {
          const prefs = loadProfilePreferences(data.profile.email);
          const defaultAddr = prefs.addresses.find((a) => a.isDefault);
          const newAddress = {
            id: defaultAddr?.id ?? String(Date.now()),
            name: defaultAddr?.name ?? data.profile.full_name ?? 'Cửa hàng',
            phone: defaultAddr?.phone ?? data.profile.phone ?? '',
            address: data.profile.address,
            isDefault: true,
          };
          const otherAddresses = prefs.addresses.filter((a) => a.id !== newAddress.id).map((a) => ({ ...a, isDefault: false }));
          prefs.addresses = [newAddress, ...otherAddresses];
          saveProfilePreferences(data.profile.email, prefs);
        } catch (e) {
          console.warn('Sync address to localStorage failed:', e);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  // Gửi hồ sơ và thông tin pháp lý yêu cầu xác minh tài khoản người bán
  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsPassword) {
      setShowVerificationSecurity(true);
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

  // Cập nhật cấu hình tùy chọn thông báo và quyền riêng tư của nhà bán hàng
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

  // Thêm một tài khoản ngân hàng nhận tiền mới (yêu cầu mật khẩu và OTP hợp lệ)
  const addPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsPassword || needsOtp) {
      setShowPayoutSecurity(true);
      toast.error('Vui lòng xác thực mật khẩu và OTP trước khi thêm tài khoản ngân hàng.');
      return;
    }
    setSaving(true);
    try {
      await apiJson('/api/marketplace/seller/payout-accounts', {
        method: 'POST',
        body: JSON.stringify(payoutForm),
      });
      // Add to localStorage bank accounts list
      if (profile?.email) {
        try {
          const prefs = loadProfilePreferences(profile.email);
          const exists = prefs.banks.some((b) => b.accountNumber === payoutForm.account_number);
          if (!exists) {
            prefs.banks.push({
              id: String(Date.now()),
              bankName: payoutForm.bank_name,
              accountName: payoutForm.account_name,
              accountNumber: payoutForm.account_number,
              isDefault: payoutForm.is_default,
            });
            saveProfilePreferences(profile.email, prefs);
          }
        } catch (e) {
          console.warn('Sync added bank error:', e);
        }
      }
      setPayoutForm({ bank_name: '', account_name: '', account_number: '', is_default: true });
      setBankQuery('');
      await loadSettings();
      toast.success('Đã thêm tài khoản ngân hàng');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thêm được tài khoản');
    } finally {
      setSaving(false);
    }
  };

  // Xóa một tài khoản ngân hàng khỏi danh sách nhận tiền (yêu cầu xác thực mật khẩu/OTP)
  const deletePayout = async (id: number) => {
    if (needsPassword || needsOtp) {
      setOpenSection('payout');
      setShowPayoutSecurity(true);
      toast.error('Vui lòng xác thực mật khẩu và OTP trước khi xóa tài khoản ngân hàng.');
      return;
    }
    try {
      // Delete from localStorage bank accounts list
      if (profile?.email) {
        try {
          const prefs = loadProfilePreferences(profile.email);
          const match = payouts.find((p) => p.id === id);
          if (match) {
            prefs.banks = prefs.banks.filter(
              (b) =>
                !(
                  b.bankName.toLowerCase() === match.bank_name.toLowerCase() &&
                  b.accountNumber.endsWith(match.account_number_last4)
                )
            );
            saveProfilePreferences(profile.email, prefs);
          }
        } catch (e) {
          console.warn('Sync deleted bank error:', e);
        }
      }
      await apiJson(`/api/marketplace/seller/payout-accounts/${id}`, { method: 'DELETE' });
      setPayouts((prev) => prev.filter((item) => item.id !== id));
      toast.success('Đã xóa tài khoản');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xóa được');
    }
  };

  // Thiết lập tài khoản ngân hàng được chọn làm tài khoản nhận tiền mặc định
  const setDefaultPayout = async (id: number) => {
    if (needsPassword || needsOtp) {
      setOpenSection('payout');
      setShowPayoutSecurity(true);
      toast.error('Vui lòng xác thực mật khẩu và OTP trước khi đổi tài khoản mặc định.');
      return;
    }
    try {
      await apiJson(`/api/marketplace/seller/payout-accounts/${id}/default`, { method: 'PUT' });
      // Update in localStorage
      if (profile?.email) {
        try {
          const prefs = loadProfilePreferences(profile.email);
          const match = payouts.find((p) => p.id === id);
          if (match) {
            prefs.banks = prefs.banks.map((b) => ({
              ...b,
              isDefault:
                b.bankName.toLowerCase() === match.bank_name.toLowerCase() &&
                b.accountNumber.endsWith(match.account_number_last4),
            }));
            saveProfilePreferences(profile.email, prefs);
          }
        } catch (e) {
          console.warn('Sync default bank error:', e);
        }
      }
      setPayouts((prev) => prev.map((item) => ({ ...item, is_default: item.id === id })));
      toast.success('Đã đặt mặc định');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không cập nhật được');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 px-4 py-10 transition-colors duration-300">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-10 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!profile || !preferences) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 px-4 py-10 transition-colors duration-300">
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 px-4 py-8 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <PageBackBar fallbackTo="/seller" label="Quay lại" />
            <h1 className="mt-3 text-2xl font-bold">Cài đặt nhà bán hàng</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bảo mật thông tin cửa hàng, xác minh và tài khoản thanh toán.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="font-semibold">Trạng thái: </span>
            <span className={profile.verification_status === 'verified' ? 'text-emerald-600' : 'text-amber-600'}>
              {statusLabel(profile.verification_status)}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <main className="space-y-4">
            <AccordionSection
              id="store"
              title="Thông tin cửa hàng"
              icon={Store}
              iconColor="text-amber-500"
              isOpen={openSection === 'store'}
              onToggle={toggleSection}
            >
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
            </AccordionSection>

            <AccordionSection
              id="verification"
              title="Xác minh người bán"
              icon={ShieldCheck}
              iconColor="text-emerald-500"
              isOpen={openSection === 'verification'}
              onToggle={toggleSection}
            >
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
                    <button disabled={saving} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                      Gửi hồ sơ xác minh
                    </button>
                    <button type="button" onClick={() => { setVerificationEdit(false); void loadSettings(); }} className="rounded-md border px-4 py-2 text-sm dark:border-slate-700">
                      Hủy
                    </button>
                    {needsPassword && <span className="text-sm text-amber-600">Cần xác thực mật khẩu trước.</span>}
                  </div>
                  {showVerificationSecurity && needsPassword && (
                    <div className="md:col-span-2 rounded-lg border border-amber-300 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                      <div className="mb-3 flex items-start gap-3">
                        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div>
                          <h3 className="font-bold text-slate-950 dark:text-white">Xác thực trước khi gửi hồ sơ</h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Nhập lại mật khẩu để bảo vệ thông tin pháp lý của cửa hàng.</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input className={inputClass} type="password" placeholder="Mật khẩu hiện tại" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <button type="button" disabled={securityBusy || !password} onClick={() => void verifyPassword()} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                          Xác thực
                        </button>
                      </div>
                    </div>
                  )}
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
                    <p className="text-sm text-slate-500">Hồ sơ sẽ được kiểm duyệt.</p>
                  </div>
                </div>
              )}
            </AccordionSection>

            <AccordionSection
              id="payout"
              title="Tài khoản ngân hàng"
              icon={CreditCard}
              iconColor="text-blue-500"
              isOpen={openSection === 'payout'}
              onToggle={toggleSection}
            >
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

              {localBanksToSync.length > 0 && (
                <div className="mb-5 rounded-xl border border-dashed border-amber-300 bg-amber-50/30 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2">Nhập nhanh từ ngân hàng liên kết cá nhân</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {localBanksToSync.map((bank) => (
                      <div key={bank.id} className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{bank.bankName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{bank.accountName} - {bank.accountNumber}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPayoutForm((f) => ({
                              ...f,
                              bank_name: bank.bankName,
                              account_name: bank.accountName,
                              account_number: bank.accountNumber.replace(/[* ]/g, ''),
                            }));
                            setBankQuery(bank.bankName);
                            if (bank.accountNumber.includes('*')) {
                              toast.error('Vui lòng điền nốt số tài khoản đầy đủ.');
                            } else {
                              toast.success('Đã điền thông tin ngân hàng.');
                            }
                          }}
                          className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-2.5 py-1 rounded transition-colors"
                        >
                          Nhập nhanh
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={addPayout} className="grid gap-4 md:grid-cols-3">
                <div className="relative">
                  <input
                    className={inputClass}
                    placeholder="Tên ngân hàng"
                    value={bankQuery}
                    onChange={(e) => {
                      setBankQuery(e.target.value);
                      setPayoutForm((f) => ({ ...f, bank_name: e.target.value }));
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
                              setPayoutForm((f) => ({ ...f, bank_name: bank.shortName || bank.name }));
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
                <input className={inputClass} placeholder="Tên chủ tài khoản" value={payoutForm.account_name} onChange={(e) => setPayoutForm((f) => ({ ...f, account_name: e.target.value }))} />
                <input className={inputClass} placeholder="Số tài khoản" value={payoutForm.account_number} onChange={(e) => setPayoutForm((f) => ({ ...f, account_number: e.target.value }))} />
                <div className="md:col-span-3">
                  <button disabled={saving} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                    Thêm tài khoản
                  </button>
                  {(needsPassword || needsOtp) && <span className="ml-3 text-sm text-amber-600">Sẽ yêu cầu xác thực trước khi thêm.</span>}
                </div>
              </form>
              {showPayoutSecurity && (needsPassword || needsOtp) && (
                <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <div className="mb-4 flex items-start gap-3">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-slate-950 dark:text-white">Xác thực trước khi thêm tài khoản</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Tài khoản ngân hàng là thông tin nhận tiền, nên cần nhập đúng mật khẩu và OTP email trước khi lưu.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="rounded-md bg-white p-3 text-sm dark:bg-slate-950">
                        <p className="font-semibold">{security?.passwordVerified ? 'Mật khẩu đã xác thực' : 'Bước 1: nhập lại mật khẩu'}</p>
                        {security?.passwordVerifiedUntil && <p className="text-slate-500">Hiệu lực đến {maskTime(security.passwordVerifiedUntil)}</p>}
                      </div>
                      <input className={inputClass} type="password" placeholder="Mật khẩu hiện tại" value={password} onChange={(e) => setPassword(e.target.value)} />
                      <button type="button" disabled={securityBusy || !password} onClick={() => void verifyPassword()} className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                        Xác thực mật khẩu
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-md bg-white p-3 text-sm dark:bg-slate-950">
                        <p className="font-semibold">{security?.otpVerified ? 'OTP đã xác thực' : 'Bước 2: xác thực OTP'}</p>
                        {security?.otpVerifiedUntil && <p className="text-slate-500">Hiệu lực đến {maskTime(security.otpVerifiedUntil)}</p>}
                      </div>
                      <button type="button" disabled={securityBusy || needsPassword} onClick={() => void requestOtp()} className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950">
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
                </div>
              )}
            </AccordionSection>

            <AccordionSection
              id="notifications"
              title="Cài đặt thông báo"
              icon={Bell}
              iconColor="text-purple-500"
              isOpen={openSection === 'notifications'}
              onToggle={toggleSection}
            >
              <div className="mb-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                Chọn những kênh mà cửa hàng muốn nhận cảnh báo. Các cảnh báo bảo mật quan trọng vẫn được gửi để bảo vệ tài khoản.
              </div>
              <div className="space-y-1">
                <ToggleRow icon={MessageCircle} title="Chat với khách hàng" detail="Cho phép người mua mở tin nhắn với cửa hàng" checked={preferences.chat_enabled} onChange={(v) => void savePreferences({ ...(preferences as SellerPreferences), chat_enabled: v })} />
                <ToggleRow icon={Bell} title="Thông báo đơn hàng" detail="Nhận thông báo trong kênh bán hàng khi có đơn mới" checked={preferences.order_notifications} onChange={(v) => void savePreferences({ ...(preferences as SellerPreferences), order_notifications: v })} />
              </div>
            </AccordionSection>
          </main>

          <aside className="space-y-6">
            <section className={panelClass}>
              <div className="mb-4 flex items-center gap-3">
                <Store className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold">Tóm tắt kênh bán hàng</h2>
              </div>
              <p className="mb-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Kiểm tra nhanh trạng thái xác minh và tài khoản nhận tiền của cửa hàng.
              </p>
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
