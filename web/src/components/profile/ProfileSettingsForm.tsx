import { useState, useEffect } from 'react';
import { User, Lock, Moon, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import type { ProfileUser } from './types';
import { apiFetch, apiJson } from '../../lib/api';
import { notifyAuthChanged } from '../../lib/authEvents';
import { useTheme } from '../../hooks/useTheme';
import toast from 'react-hot-toast';

interface ProfileSettingsFormProps {
  isLoading: boolean;
  user: ProfileUser | null;
  onSuccessSubmit: () => void;
}

type TabKey = 'info' | 'security' | 'preferences';

export default function ProfileSettingsForm({
  isLoading,
  user,
  onSuccessSubmit,
}: ProfileSettingsFormProps) {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  // Form State: Thông tin cá nhân
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Đồng bộ lại khi user prop được load hoặc cập nhật
  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? '');
      setBio(user.bio ?? '');
    }
  }, [user]);

  // Form State: Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Preferences: Thông báo cộng đồng
  const [notifyInteractions, setNotifyInteractions] = useState(() => {
    return localStorage.getItem('cookingboy_notify_interactions') !== 'false';
  });

  const handleToggleNotify = () => {
    const next = !notifyInteractions;
    setNotifyInteractions(next);
    localStorage.setItem('cookingboy_notify_interactions', String(next));
    toast.success(next ? 'Đã bật thông báo tương tác!' : 'Đã tắt thông báo tương tác.');
  };

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-6 py-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    );
  }

  // 1. Cập nhật thông tin cá nhân (Họ tên, Bio)
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          bio: bio.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? 'Lỗi cập nhật hồ sơ');
      }

      toast.success('Cập nhật hồ sơ thành công!');
      notifyAuthChanged({ authenticated: true });
      onSuccessSubmit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ');
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Đổi mật khẩu
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSavingPassword(true);
    try {
      await apiJson('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      toast.success('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccessSubmit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể đổi mật khẩu');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 font-vietnam">
      {/* Tab Segment Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === 'info'
              ? 'bg-black text-white shadow-sm dark:bg-white dark:text-slate-950'
              : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Thông tin cá nhân</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === 'security'
              ? 'bg-black text-white shadow-sm dark:bg-white dark:text-slate-950'
              : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Bảo mật & Mật khẩu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === 'preferences'
              ? 'bg-black text-white shadow-sm dark:bg-white dark:text-slate-950'
              : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          <Moon className="h-4 w-4" />
          <span>Tùy chọn giao diện</span>
        </button>
      </div>

      {/* ─── TAB 1: THÔNG TIN CÁ NHÂN ─── */}
      {activeTab === 'info' && (
        <form onSubmit={handleProfileSubmit} className="max-w-xl space-y-6 pt-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              Họ và tên
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-2xs outline-none transition-all focus:border-black focus:ring-2 focus:ring-black/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              Email tài khoản
            </label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500 shadow-2xs disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
              Email dùng để đăng nhập và bảo mật tài khoản CookingBoy.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              Tiểu sử ẩm thực (Bio)
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Chia sẻ niềm yêu thích ẩm thực, chuyên môn nấu nướng hoặc phong cách ẩm thực yêu thích của bạn..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-2xs outline-none transition-all focus:border-black focus:ring-2 focus:ring-black/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
              Tiểu sử sẽ được hiển thị công khai trên trang hồ sơ và dưới các công thức đóng góp của bạn.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB 2: BẢO MẬT & MẬT KHẨU ─── */}
      {activeTab === 'security' && (
        <form onSubmit={handlePasswordSubmit} className="max-w-xl space-y-6 pt-2">
          <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Bảo mật tài khoản CookingBoy</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                  Mật khẩu mới cần tối thiểu 8 ký tự để đảm bảo độ an toàn cao nhất cho tài khoản và công thức của bạn.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-2xs outline-none transition-all focus:border-black focus:ring-2 focus:ring-black/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-2xs outline-none transition-all focus:border-black focus:ring-2 focus:ring-black/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-2xs outline-none transition-all focus:border-black focus:ring-2 focus:ring-black/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Cập nhật mật khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB 3: TÙY CHỌN GIAO DIỆN & TRẢI NGHIỆM ─── */}
      {activeTab === 'preferences' && (
        <div className="max-w-xl space-y-5 pt-2">
          {/* Dark Mode Switch */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-800 dark:bg-slate-800 dark:text-stone-300">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Giao diện tối (Dark Mode)</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Chuyển đổi giao diện ban đêm giúp dịu mắt khi nấu ăn buổi tối.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isDark ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <span className="sr-only">Bật giao diện tối</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out dark:bg-slate-950 ${
                  isDark ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Interaction Notifications */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-800 dark:bg-slate-800 dark:text-stone-300">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Thông báo tương tác công thức</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Nhận thông báo khi có đầu bếp hoặc thành viên yêu thích và bình luận món ăn của bạn.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notifyInteractions}
              onClick={handleToggleNotify}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                notifyInteractions ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <span className="sr-only">Bật thông báo tương tác</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out dark:bg-slate-950 ${
                  notifyInteractions ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
