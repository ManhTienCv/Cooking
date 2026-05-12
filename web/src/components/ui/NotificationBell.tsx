import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, ShoppingBag, Package, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, type OrderNotification } from '../../contexts/NotificationContext';

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

const ICON_MAP: Record<string, typeof ShoppingBag> = {
  new_order: ShoppingBag, order_status: Package,
  product_approved: Check, product_rejected: X,
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Thông báo</h3>
              <div className="flex gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} title="Đánh dấu tất cả đã đọc"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} title="Xóa tất cả"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Không có thông báo
                </div>
              ) : (
                notifications.slice(0, 20).map(n => {
                  const Icon = ICON_MAP[n.type] ?? Bell;
                  return (
                    <button key={n.id} onClick={() => markRead(n.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-50 dark:border-slate-700/30 ${
                        !n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}>
                      <div className={`mt-0.5 p-1.5 rounded-lg ${!n.read ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'font-semibold text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">{timeAgo(n.timestamp)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
