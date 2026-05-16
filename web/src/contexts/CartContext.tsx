/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { apiJson, apiFetch } from '../lib/api';
import { AUTH_CHANGE_EVENT, getAuthChangeDetail } from '../lib/authEvents';
import type { CartItem } from '../types/marketplace';

interface CartCtx {
  items: CartItem[];
  count: number;
  total: number;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: number, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearAll: () => Promise<void>;
}

const CartContext = createContext<CartCtx | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await apiJson<{ success: boolean; items: CartItem[]; count: number; total: number }>(
        '/api/marketplace/cart'
      );
      setItems(data.items ?? []);
      setCount(data.count ?? 0);
      setTotal(data.total ?? 0);
    } catch {
      /* user not logged in — no cart */
      setItems([]);
      setCount(0);
      setTotal(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* Re-fetch khi auth thay đổi */
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = getAuthChangeDetail(event);
      if (detail.authenticated === false) {
        setItems([]);
        setCount(0);
        setTotal(0);
        return;
      }
      void refresh();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, handler);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handler);
  }, [refresh]);

  const addItem = useCallback(async (productId: number, quantity = 1) => {
    setLoading(true);
    try {
      await apiJson('/api/marketplace/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity }),
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const updateItem = useCallback(async (itemId: number, quantity: number) => {
    setLoading(true);
    try {
      await apiJson(`/api/marketplace/cart/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const removeItem = useCallback(async (itemId: number) => {
    setLoading(true);
    try {
      await apiFetch(`/api/marketplace/cart/${itemId}`, { method: 'DELETE' });
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const clearAll = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch('/api/marketplace/cart', { method: 'DELETE' });
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const value = useMemo(() => ({
    items,
    count,
    total,
    loading,
    refresh,
    addItem,
    updateItem,
    removeItem,
    clearAll,
  }), [items, count, total, loading, refresh, addItem, updateItem, removeItem, clearAll]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
