import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

export interface OrderNotification {
  id: string;
  type: 'new_order' | 'order_status' | 'product_approved' | 'product_rejected';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  orderId?: number;
}

interface NotificationContextType {
  notifications: OrderNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [], unreadCount: 0,
  markRead: () => {}, markAllRead: () => {}, clearAll: () => {},
});

export function useNotifications() { return useContext(NotificationContext); }

const STORAGE_KEY = 'cook_notifications';
const POLL_INTERVAL = 30_000; // 30 seconds

function loadStored(): OrderNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveStored(ns: OrderNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ns.slice(0, 50)));
}

export function NotificationProvider({ children, role }: { children: ReactNode; role: 'seller' | 'admin' | 'buyer' }) {
  const [notifications, setNotifications] = useState<OrderNotification[]>(loadStored);
  const lastCheckRef = useRef(Date.now());

  const addNotification = useCallback((n: Omit<OrderNotification, 'id' | 'timestamp' | 'read'>) => {
    const notif: OrderNotification = {
      ...n, id: crypto.randomUUID(), timestamp: Date.now(), read: false,
    };
    setNotifications(prev => {
      const next = [notif, ...prev].slice(0, 50);
      saveStored(next);
      return next;
    });
  }, []);

  // Poll for new orders (seller/admin)
  useEffect(() => {
    if (role === 'buyer') return;

    const endpoint = role === 'admin'
      ? '/api/admin/marketplace/orders?limit=5'
      : '/api/marketplace/seller/orders?limit=5';

    let timer: ReturnType<typeof setInterval>;

    const check = async () => {
      try {
        const res = await fetch(endpoint, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const orders = data.orders ?? data.data?.orders ?? [];

        for (const order of orders) {
          const orderTime = new Date(order.created_at).getTime();
          if (orderTime > lastCheckRef.current) {
            addNotification({
              type: 'new_order',
              title: 'Đơn hàng mới!',
              message: `Đơn #${order.id} — ${Number(order.total_amount).toLocaleString('vi-VN')}đ`,
              orderId: order.id,
            });
          }
        }
        lastCheckRef.current = Date.now();
      } catch { /* silent */ }
    };

    // First check after 2s, then every POLL_INTERVAL
    const initialTimer = setTimeout(() => {
      void check();
      timer = setInterval(() => void check(), POLL_INTERVAL);
    }, 2000);

    return () => { clearTimeout(initialTimer); clearInterval(timer); };
  }, [role, addNotification]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveStored(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      saveStored(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveStored([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}
