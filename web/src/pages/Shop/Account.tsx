import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  User,
  MapPin,
  ShieldCheck,
  Package,
  Camera,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  Building,
  Home,
  CheckCircle2,
  Truck,
  DollarSign,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, apiJson } from '../../lib/api';
import { AUTH_CHANGE_EVENT, getAuthChangeDetail, notifyAuthChanged } from '../../lib/authEvents';
import {
  type SavedAddress,
  loadProfilePreferences,
  saveProfilePreferences,
} from '../../lib/profilePreferences';
import type { Order } from '../../types/marketplace';
import KitchenCookAuthModal from '../../components/shop/KitchenCookAuthModal';
import { MapAddressModal, type SelectedMapAddress } from '../../components/common/MapAddressModal';

const VN_PHONE_REGEX = /^(0[3|5|7|8|9])[0-9]{8}$/;

interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string | null;
  bio?: string | null;
  role?: string;
  created_at?: string;
}

export default function AccountPage() {
  // 0ms Cache restore
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('kc_user_cached');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isLoadingUser, setIsLoadingUser] = useState(!user);
  const [activeTab, setActiveTab] = useState<'info' | 'addresses' | 'security'>('info');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Orders statistics for Mini Dashboard
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Profile Edit State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Multi-Address State
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<{
    name: string;
    phone: string;
    address: string;
    label: 'home' | 'office' | 'other';
    isDefault: boolean;
  }>({
    name: '',
    phone: '',
    address: '',
    label: 'home',
    isDefault: false,
  });

  const handleMapSelectAddress = useCallback((data: SelectedMapAddress) => {
    setAddressForm((prev) => ({
      ...prev,
      address: data.fullAddress,
    }));
    setMapModalOpen(false);
  }, []);

  // Đóng modal địa chỉ khi nhấn ESC
  useEffect(() => {
    if (!addressModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddressModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addressModalOpen]);

  // Security - Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Security - Email OTP
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Load User Info
  const loadUser = useCallback(async () => {
    try {
      const data = await apiJson<{
        authenticated: boolean;
        user?: UserProfile;
      }>('/api/auth/me');

      if (data.authenticated && data.user) {
        setUser(data.user);
        setFullName(data.user.full_name);
        setAvatarPreview(data.user.avatar_url || null);
        try {
          localStorage.setItem('kc_user_cached', JSON.stringify(data.user));
        } catch {
          // ignore
        }
      } else {
        setUser(null);
        localStorage.removeItem('kc_user_cached');
      }
    } catch {
      // Keep cached if offline
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // Load Orders for Mini Dashboard
  const loadOrders = useCallback(async () => {
    if (!user) return;
    setIsLoadingOrders(true);
    try {
      const data = await apiJson<{ orders: Order[]; total: number }>(
        '/api/marketplace/orders?limit=100&offset=0'
      );
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [user]);

  // Load addresses from preferences
  const loadAddresses = useCallback(() => {
    if (!user?.email) return;
    const prefs = loadProfilePreferences(user.email);
    setAddresses(prefs.addresses);
  }, [user]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user) {
      loadAddresses();
      void loadOrders();
    }
  }, [user, loadAddresses, loadOrders]);

  // Auth event listener
  useEffect(() => {
    const onAuth = (e: Event) => {
      const detail = getAuthChangeDetail(e);
      if (detail.authenticated === false) {
        setUser(null);
        localStorage.removeItem('kc_user_cached');
      } else {
        void loadUser();
      }
    };
    window.addEventListener(AUTH_CHANGE_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuth);
  }, [loadUser]);

  // OTP Countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  // Mini Dashboard metrics
  const totalOrders = orders.length;
  const totalSpent = useMemo(() => {
    return orders
      .filter((o) => o.status === 'completed' || o.payment_status === 'paid')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [orders]);
  const shippingOrders = useMemo(() => {
    return orders.filter((o) =>
      ['confirmed', 'preparing', 'shipping'].includes(o.status)
    ).length;
  }, [orders]);

  // --- 1. Personal Information Handlers ---
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng ảnh vượt quá giới hạn 5MB');
      return;
    }

    // Check format
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.error('Định dạng ảnh không hợp lệ (hỗ trợ JPG, PNG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setAvatarFile(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = fullName.trim();
    if (trimmedName.split(/\s+/).length < 2) {
      toast.error('Vui lòng nhập họ và tên đầy đủ (tối thiểu 2 từ)');
      return;
    }

    if (phone && !VN_PHONE_REGEX.test(phone.trim())) {
      toast.error('Số điện thoại không đúng định dạng (10 số, bắt đầu bằng 03, 05, 07, 08, 09)');
      return;
    }

    setIsSavingProfile(true);
    try {
      // 1. Update avatar if changed
      if (avatarFile) {
        await apiFetch('/api/auth/avatar', {
          method: 'POST',
          body: JSON.stringify({ avatar_data: avatarFile }),
        });
      }

      // 2. Update basic info
      const res = await apiFetch('/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify({
          full_name: trimmedName,
          bio: user.bio || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cập nhật thất bại');

      toast.success('Cập nhật thông tin thành công!');
      setAvatarFile(null);
      void loadUser();
      notifyAuthChanged({ authenticated: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật hồ sơ';
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- 2. Multi-Address Handlers ---
  const openNewAddressModal = () => {
    setEditingAddressId(null);
    setAddressForm({
      name: user?.full_name || '',
      phone: phone || '',
      address: '',
      label: 'home',
      isDefault: addresses.length === 0,
    });
    setAddressModalOpen(true);
  };

  const openEditAddressModal = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      label: (addr.label as 'home' | 'office' | 'other') || 'home',
      isDefault: addr.isDefault,
    });
    setAddressModalOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    const trimmedName = addressForm.name.trim();
    if (trimmedName.split(/\s+/).length < 2) {
      toast.error('Họ tên người nhận cần tối thiểu 2 từ');
      return;
    }

    if (!VN_PHONE_REGEX.test(addressForm.phone.trim())) {
      toast.error('Số điện thoại nhận hàng không hợp lệ (10 chữ số VN)');
      return;
    }

    if (addressForm.address.trim().length < 6) {
      toast.error('Vui lòng nhập địa chỉ chi tiết rõ ràng');
      return;
    }

    let updated: SavedAddress[];
    if (editingAddressId) {
      // Editing existing
      updated = addresses.map((a) => {
        if (a.id === editingAddressId) {
          return {
            ...a,
            name: trimmedName,
            phone: addressForm.phone.trim(),
            address: addressForm.address.trim(),
            label: addressForm.label,
            isDefault: addressForm.isDefault,
          };
        }
        return addressForm.isDefault ? { ...a, isDefault: false } : a;
      });
    } else {
      // Adding new
      const newAddr: SavedAddress = {
        id: 'addr_' + Date.now(),
        name: trimmedName,
        phone: addressForm.phone.trim(),
        address: addressForm.address.trim(),
        label: addressForm.label,
        isDefault: addresses.length === 0 ? true : addressForm.isDefault,
      };

      if (newAddr.isDefault) {
        updated = [newAddr, ...addresses.map((a) => ({ ...a, isDefault: false }))];
      } else {
        updated = [...addresses, newAddr];
      }
    }

    // Ensure exactly 1 default if list not empty
    const hasDefault = updated.some((a) => a.isDefault);
    if (!hasDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }

    setAddresses(updated);
    const prefs = loadProfilePreferences(user.email);
    saveProfilePreferences(user.email, { ...prefs, addresses: updated });
    toast.success(editingAddressId ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới');
    setAddressModalOpen(false);
  };

  const handleSetDefaultAddress = (id: string) => {
    if (!user?.email) return;
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    setAddresses(updated);
    const prefs = loadProfilePreferences(user.email);
    saveProfilePreferences(user.email, { ...prefs, addresses: updated });
    toast.success('Đã đặt làm địa chỉ nhận hàng mặc định');
  };

  const handleDeleteAddress = (id: string) => {
    if (!user?.email) return;
    const target = addresses.find((a) => a.id === id);
    if (!target) return;

    if (target.isDefault && addresses.length > 1) {
      toast.error('Không thể xóa địa chỉ mặc định. Vui lòng chọn địa chỉ khác làm mặc định trước!');
      return;
    }

    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }

    setAddresses(updated);
    const prefs = loadProfilePreferences(user.email);
    saveProfilePreferences(user.email, { ...prefs, addresses: updated });
    toast.success('Đã xóa địa chỉ thành công');
  };

  // --- 3. Security Handlers ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới cần tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đổi mật khẩu thất bại');

      toast.success('Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại';
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRequestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Địa chỉ email không hợp lệ');
      return;
    }
    if (cleanEmail === user?.email.toLowerCase()) {
      toast.error('Email mới trùng với email hiện tại');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await apiFetch('/api/auth/email/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể gửi mã OTP');

      toast.success('Mã OTP 6 số đã được gửi tới email mới!');
      setOtpStep(2);
      setOtpCountdown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi gửi mã xác thực';
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.trim().length !== 6) {
      toast.error('Mã OTP phải có đúng 6 chữ số');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await apiFetch('/api/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify({ otp: emailOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Xác thực OTP thất bại');

      toast.success('Đổi địa chỉ email thành công!');
      setOtpStep(1);
      setNewEmail('');
      setEmailOtp('');
      void loadUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xác thực email thất bại';
      toast.error(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // If not logged in & not loading, show prominent login prompt
  if (!isLoadingUser && !user) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 font-vietnam">
        <div className="max-w-md w-full text-center bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-stone-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-slate-700 text-slate-900 dark:text-white mx-auto flex items-center justify-center mb-4 border border-stone-200 dark:border-slate-600">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tài khoản KitchenCook</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
            Đăng nhập để xem thông tin cá nhân, sổ địa chỉ giao hàng và theo dõi đơn mua đồ bếp của bạn.
          </p>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-3 px-6 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Đăng nhập ngay
          </button>
          <KitchenCookAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={() => {
              setIsAuthModalOpen(false);
              void loadUser();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-vietnam pb-24 transition-colors duration-300">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 border-b border-stone-200/80 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium">
            <Link to="/shop" className="hover:text-slate-900 dark:hover:text-white transition-colors">KitchenCook</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200">Tài khoản khách hàng</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* User Overview */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-stone-300 dark:border-slate-600 shadow-md bg-white dark:bg-slate-700">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={user?.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-100 dark:bg-slate-700 text-slate-800 dark:text-white text-2xl font-black">
                      {user?.full_name?.charAt(0) || 'K'}
                    </div>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload-header"
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 text-white rounded-xl shadow-lg cursor-pointer transition-colors"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    id="avatar-upload-header"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {user?.full_name || 'Khách hàng KitchenCook'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-stone-100 text-stone-800 dark:bg-slate-700 dark:text-stone-300 border border-stone-200 dark:border-slate-600">
                    {user?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng thân thiết'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user?.email}
                </p>
                {user?.created_at && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Tham gia: {new Date(user.created_at).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            </div>

            {/* Mini Dashboard Stat Badges */}
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <div className="flex-1 md:flex-none p-3.5 rounded-2xl bg-stone-100/70 dark:bg-slate-700/50 border border-stone-200 dark:border-slate-700 min-w-[120px]">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  <span>Đơn hàng</span>
                  <Package className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {isLoadingOrders ? '...' : totalOrders}
                </div>
              </div>

              <div className="flex-1 md:flex-none p-3.5 rounded-2xl bg-blue-50/60 dark:bg-slate-700/50 border border-blue-900/10 dark:border-slate-700 min-w-[130px]">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  <span>Đang giao</span>
                  <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                  {isLoadingOrders ? '...' : shippingOrders}
                </div>
              </div>

              <div className="flex-1 md:flex-none p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-slate-700/50 border border-emerald-900/10 dark:border-slate-700 min-w-[150px]">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  <span>Tổng chi tiêu</span>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {isLoadingOrders ? '...' : totalSpent.toLocaleString('vi-VN') + 'đ'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border border-stone-200 dark:border-slate-700 shadow-sm space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'info'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-stone-100/70 dark:hover:bg-slate-700/50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Thông tin cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'addresses'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-stone-100/70 dark:hover:bg-slate-700/50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="flex-1">Sổ địa chỉ</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'addresses' ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {addresses.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-stone-100/70 dark:hover:bg-slate-700/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Bảo mật & Đổi mật khẩu</span>
              </button>
            </div>
          </div>

          {/* Main Tab Content */}
          <div className="lg:col-span-3">
            {/* TAB 1: THÔNG TIN CÁ NHÂN */}
            {activeTab === 'info' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-5 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Thông tin cá nhân</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Quản lý tên hiển thị, thông tin liên lạc và ảnh đại diện
                    </p>
                  </div>
                  {avatarFile && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-800 dark:bg-slate-700 dark:text-stone-300 border border-stone-200 dark:border-slate-600 animate-pulse">
                      Ảnh mới chưa lưu
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Avatar Upload Area */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-amber-50/40 dark:bg-slate-700/30 border border-amber-900/10 dark:border-slate-700/60">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white dark:bg-slate-700 shadow-md border border-amber-900/10">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                          <User className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left flex-1">
                      <label
                        htmlFor="avatar-upload-main"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-slate-900 hover:text-slate-900 dark:hover:text-white dark:hover:border-white shadow-xs cursor-pointer transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Tải ảnh mới từ thiết bị
                      </label>
                      <input
                        id="avatar-upload-main"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarSelect}
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Hỗ trợ file JPG, PNG, WEBP. Kích thước tối đa &lt; 5MB.
                      </p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Họ và tên hiển thị <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn An"
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white transition-all"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Yêu cầu tối thiểu 2 từ.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Số điện thoại nhận hàng
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0912345678"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Chuẩn 10 số di động Việt Nam.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Địa chỉ Email tài khoản
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-500 font-medium cursor-not-allowed"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className="text-[11px] text-stone-700 dark:text-stone-300 font-semibold mt-1 hover:underline hover:text-slate-900 dark:hover:text-white inline-block cursor-pointer"
                      >
                        Đổi địa chỉ email qua OTP &rarr;
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Vai trò hệ thống
                      </label>
                      <div className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-300 font-semibold flex items-center justify-between">
                        <span>{user?.role === 'admin' ? 'Quản trị viên (Admin)' : 'Khách hàng (Customer)'}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Tài khoản được xác thực trên toàn hệ thống.</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700/60 pt-5 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingProfile ? 'Đang lưu thay đổi...' : 'Lưu thông tin'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: SỔ ĐỊA CHỈ NHẬN HÀNG */}
            {activeTab === 'addresses' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-5 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sổ địa chỉ nhận hàng</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Quản lý địa chỉ giao hàng để thanh toán nhanh chóng và tự động chọn khi đặt đồ bếp
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openNewAddressModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm địa chỉ mới
                  </button>
                </div>

                {/* Address List */}
                {addresses.length === 0 ? (
                  <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-amber-900/15 dark:border-slate-700">
                    <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Chưa có địa chỉ nhận hàng nào</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                      Thêm địa chỉ nhà riêng hoặc văn phòng để việc giao đồ bếp của bạn diễn ra thuận tiện nhất.
                    </p>
                    <button
                      type="button"
                      onClick={openNewAddressModal}
                      className="px-5 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Thêm ngay
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          addr.isDefault
                            ? 'border-slate-900 bg-stone-50/60 dark:border-white dark:bg-slate-800 shadow-sm'
                            : 'border-stone-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {addr.name}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {addr.phone}
                            </span>

                            {/* Label badge */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-stone-100 text-stone-700 dark:bg-slate-700 dark:text-slate-300 border border-stone-200 dark:border-slate-600">
                              {addr.label === 'office' ? (
                                <>
                                  <Building className="w-3 h-3" /> Văn phòng
                                </>
                              ) : (
                                <>
                                  <Home className="w-3 h-3" /> Nhà riêng
                                </>
                              )}
                            </span>

                            {/* Default badge */}
                            {addr.isDefault && (
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs">
                                Mặc định
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!addr.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                              >
                                Đặt làm mặc định
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditAddressModal(addr)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Chỉnh sửa địa chỉ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Xóa địa chỉ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {addr.address}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BẢO MẬT & ĐỔI MẬT KHẨU / EMAIL */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Đổi Mật Khẩu */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-slate-700 shadow-sm">
                  <div className="border-b border-slate-100 dark:border-slate-700/60 pb-5 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-slate-900 dark:text-white" />
                      Đổi mật khẩu tài khoản
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Để bảo vệ tài khoản, hãy sử dụng mật khẩu mạnh với độ dài tối thiểu 6 ký tự
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mật khẩu hiện tại <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          placeholder="Nhập mật khẩu hiện tại"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white transition-all pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mật khẩu mới <span className="text-red-500">*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isChangingPassword ? 'Đang xác thực...' : 'Cập nhật mật khẩu'}
                    </button>
                  </form>
                </div>

                {/* Đổi Email qua OTP 2 Bước */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-slate-700 shadow-sm">
                  <div className="border-b border-slate-100 dark:border-slate-700/60 pb-5 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      Thay đổi Email đăng nhập & Nhận hóa đơn
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Quy trình 2 bước bảo mật: Gửi mã OTP xác minh tới email mới trước khi kích hoạt
                    </p>
                  </div>

                  {otpStep === 1 ? (
                    <form onSubmit={handleRequestEmailOtp} className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Email mới cần thay đổi <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          required
                          placeholder="vidu@gmail.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white transition-all"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSendingOtp}
                        className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isSendingOtp ? 'Đang gửi mã...' : 'Gửi mã xác thực OTP'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyEmailOtp} className="space-y-4 max-w-md">
                      <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-slate-700/50 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Mã xác nhận 6 số đã được gửi tới <strong>{newEmail}</strong>. Vui lòng kiểm tra hộp thư đến hoặc thư rác.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Nhập mã OTP 6 số <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                          required
                          placeholder="123456"
                          className="w-full text-center tracking-widest text-lg font-black px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white transition-all"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={isVerifyingOtp}
                          className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isVerifyingOtp ? 'Đang xác thực...' : 'Xác thực & Cập nhật Email'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpStep(1)}
                          className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          Quay lại
                        </button>
                      </div>

                      {otpCountdown > 0 ? (
                        <p className="text-[11px] text-slate-400">Gửi lại mã sau {otpCountdown}s</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRequestEmailOtp}
                          className="text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                        >
                          Gửi lại mã OTP
                        </button>
                      )}
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Địa Chỉ */}
      {addressModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setAddressModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-amber-900/10 dark:border-slate-700 shadow-2xl relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAddressModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 pr-8">
              {editingAddressId ? 'Chỉnh sửa địa chỉ nhận hàng' : 'Thêm địa chỉ nhận hàng mới'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Đảm bảo số điện thoại và địa chỉ chính xác để shipper GHN liên lạc
            </p>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên người nhận <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.name}
                  onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại người nhận <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  placeholder="0912345678"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Loại địa chỉ
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAddressForm({ ...addressForm, label: 'home' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      addressForm.label === 'home'
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" /> Nhà riêng
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressForm({ ...addressForm, label: 'office' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      addressForm.label === 'office'
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" /> Văn phòng
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Địa chỉ chi tiết <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMapModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Chọn từ Bản đồ (Maps & GPS)</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành Phố..."
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is-default-addr"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="is-default-addr" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Đặt làm địa chỉ nhận hàng mặc định
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md cursor-pointer"
                >
                  Lưu địa chỉ
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Chọn Địa Chỉ Trên Bản Đồ */}
      <MapAddressModal
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        initialAddress={addressForm.address}
        onSelectAddress={handleMapSelectAddress}
      />
    </div>
  );
}
