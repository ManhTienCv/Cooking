import type React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface VietQrBank {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

export type VerificationStatus = 'draft' | 'pending' | 'verified' | 'rejected' | 'suspended';
export type BusinessType = 'individual' | 'household' | 'company';

export interface SellerProfileSettings {
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

export interface SellerPreferences {
  chat_enabled: boolean;
  order_notifications: boolean;
  account_notifications: boolean;
  marketing_notifications: boolean;
  profile_visible: boolean;
  show_phone: boolean;
  show_address: boolean;
}

export interface PayoutAccount {
  id: number;
  bank_name: string;
  account_name: string;
  account_number_last4: string;
  is_default: boolean;
  verification_status: string;
}

export interface SecurityState {
  passwordVerified: boolean;
  passwordVerifiedUntil: number | null;
  otpVerified: boolean;
  otpVerifiedUntil: number | null;
}

export interface SettingsResponse {
  profile: SellerProfileSettings;
  settings: SellerPreferences;
  payout_accounts: PayoutAccount[];
  security: SecurityState;
}

export const panelClass = 'rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
export const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
export const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200';

// Component accordion để thu gọn/mở rộng từng phần cài đặt
export function AccordionSection({
  id,
  title,
  icon: Icon,
  iconColor,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="border-t border-slate-100 p-5 dark:border-slate-800">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Chuyển đổi trạng thái xét duyệt sang chuỗi hiển thị tiếng Việt tương ứng
export function statusLabel(status: VerificationStatus) {
  const map: Record<VerificationStatus, string> = {
    draft: 'Chưa gửi xác minh',
    pending: 'Đang chờ duyệt',
    verified: 'Đã xác minh',
    rejected: 'Cần bổ sung',
    suspended: 'Tạm khóa',
  };
  return map[status] ?? status;
}

// Định dạng thời gian sang chuỗi giờ:phút
export function maskTime(value: number | null) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// Mã hóa hiển thị email bảo mật dạng: a***@***.com
export function maskEmail(email: string | null) {
  if (!email) return '';
  const parts = String(email).split('@');
  if (parts.length !== 2) return '***';
  const local = parts[0];
  const domain = parts[1];
  const tld = domain.split('.').slice(-1)[0] ?? '';
  return `${local[0] ?? '*'}***@***.${tld}`;
}

// Hàng tùy chọn bật/tắt (Toggle switch)
export function ToggleRow({
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
        aria-checked={checked ? 'true' : 'false'}
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
