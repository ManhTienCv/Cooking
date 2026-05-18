import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageCircle, Send, Store, User, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

import { apiJson } from '../lib/api';
import { AUTH_CHANGE_EVENT, getAuthChangeDetail } from '../lib/authEvents';
import PageBackBar from '../components/ui/PageBackBar';

type MeState =
  | { authenticated: false; user?: never }
  | {
      authenticated: true;
      user: {
        id: number;
        full_name: string;
        avatar_url: string | null;
      };
    };

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

type ConversationSummary = {
  id: number;
  buyer_id: number;
  seller_id: number;
  product_id: number | null;
  order_id: number | null;
  order_status: string | null;
  product_name: string | null;
  product_slug: string | null;
  buyer_name: string;
  buyer_avatar_url: string | null;
  seller_name: string;
  seller_avatar_url: string | null;
  seller_store_name: string | null;
  last_message: string | null;
  last_message_sender_id: number | null;
  last_message_at: string | null;
  unread_count: number;
};

type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: 'buyer' | 'seller';
  message: string;
  created_at: string;
};

const MESSAGE_LIMIT = 200;

export default function Messages() {
  const [searchParams] = useSearchParams();
  const [me, setMe] = useState<MeState | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const activeIdRef = useRef<number | null>(null);
  const loadConversationsRef = useRef<() => void>(() => {});
  const meUser = me?.authenticated ? me.user : null;
  const meUserId = meUser?.id;

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    let active = true;
    apiJson<MeState>('/api/auth/me')
      .then((data) => {
        if (!active) return;
        setMe(data);
      })
      .catch(() => {
        if (!active) return;
        setMe({ authenticated: false });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiJson<{ conversations: ConversationSummary[] }>('/api/messages/conversations');
      const list = data.conversations ?? [];
      setConversations(list);
      setActiveId((prev) => prev ?? list[0]?.id ?? null);
    } catch {
      setConversations([]);
    }
  }, []);

  const markRead = useCallback(async (conversationId: number) => {
    try {
      await apiJson(`/api/messages/conversations/${conversationId}/read`, { method: 'POST' });
    } catch {
      /* ignore */
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
    window.dispatchEvent(new Event('messages:read'));
  }, []);

  useEffect(() => {
    void loadConversations();
    
    const onAuthChange = (event: Event) => {
      const detail = getAuthChangeDetail(event);
      if (detail.authenticated === false) {
        setMe({ authenticated: false });
        setConversations([]);
        setActiveId(null);
        setLoading(false);
        return;
      }
      void loadConversations();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChange);
  }, [loadConversations]);

  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  useEffect(() => {
    if (!me?.authenticated) return;

    const sellerId = Number(searchParams.get('sellerId') || 0);
    const productId = Number(searchParams.get('productId') || 0) || undefined;
    const orderId = Number(searchParams.get('orderId') || 0) || undefined;

    if (sellerId || orderId) {
      apiJson<{ conversation: ConversationSummary }>('/api/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({
          seller_id: sellerId || undefined,
          product_id: productId,
          order_id: orderId,
        }),
      })
        .then((d) => {
          setActiveId(d.conversation.id);
          void loadConversations();
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : 'Không thể mở cuộc trò chuyện';
          toast.error(msg);
        });
      return;
    }

    void loadConversations();
  }, [me, searchParams, loadConversations]);

  useEffect(() => {
    if (!me?.authenticated) return;

    const es = new EventSource('/api/messages/stream', { withCredentials: true });

    const onMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { conversationId: number; message: ChatMessage };
        if (!payload?.message) return;
        const msg = payload.message;

        const isMine = meUserId !== undefined && msg.sender_id === meUserId;
        const isActive = activeIdRef.current === msg.conversation_id;

        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === msg.conversation_id);
          if (idx === -1) {
            loadConversationsRef.current();
            return prev;
          }
          const unreadCount = prev[idx].unread_count ?? 0;
          const nextUnread = !isMine && !isActive ? unreadCount + 1 : unreadCount;
          const updated = {
            ...prev[idx],
            last_message: msg.message,
            last_message_at: msg.created_at,
            last_message_sender_id: msg.sender_id,
            unread_count: isActive ? 0 : nextUnread,
          };
          return [updated, ...prev.filter((_, i) => i !== idx)];
        });

        if (activeIdRef.current === msg.conversation_id) {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (!isMine) {
            void markRead(msg.conversation_id);
          }
        }
      } catch {
        /* ignore parse errors */
      }
    };

    es.addEventListener('message', onMessage);
    return () => {
      es.removeEventListener('message', onMessage);
      es.close();
    };
  }, [me?.authenticated, meUserId, markRead]);

  useEffect(() => {
    if (!me?.authenticated) return;
    if (!activeId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    apiJson<{ messages: ChatMessage[] }>(
      `/api/messages/conversations/${activeId}/messages?limit=${MESSAGE_LIMIT}`
    )
      .then((d) => {
        setMessages(d.messages ?? []);
        void markRead(activeId);
      })
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  }, [activeId, me?.authenticated, markRead]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [activeId, conversations]
  );

  const getConversationName = useCallback((conversation: ConversationSummary) => {
    if (!meUser) return '';
    const isSeller = conversation.seller_id === meUser.id;
    if (isSeller) return conversation.buyer_name;
    return conversation.seller_store_name || conversation.seller_name;
  }, [meUser]);

  const getConversationSubtitle = useCallback((conversation: ConversationSummary) => {
    if (conversation.order_id) {
      const status = conversation.order_status
        ? ORDER_STATUS_LABEL[conversation.order_status] ?? conversation.order_status
        : '';
      return `Đơn #${conversation.order_id}${status ? ` · ${status}` : ''}`;
    }
    return conversation.product_name || 'Trao đổi chung';
  }, []);

  const onSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeConversation || !draft.trim()) return;

    setSending(true);
    try {
      const data = await apiJson<{ message: ChatMessage }>(
        `/api/messages/conversations/${activeConversation.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ message: draft.trim() }),
        }
      );
      const msg = data.message;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversation_id);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          last_message: msg.message,
          last_message_at: msg.created_at,
          last_message_sender_id: msg.sender_id,
          unread_count: 0,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
      setDraft('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi tin nhắn';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-sm text-gray-500 dark:text-slate-400">Đang tải...</div>
      </div>
    );
  }

  if (me && !me.authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl">🔒</div>
          <p className="text-gray-600 dark:text-slate-300">Vui lòng đăng nhập để xem tin nhắn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800">
      <div className="border-b border-white/20 bg-white/70 backdrop-blur-md dark:border-slate-800/30 dark:bg-slate-900/70">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <PageBackBar fallbackTo="/profile?tab=settings" label="Quay lại" className="mb-4" />
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 dark:bg-amber-900/30">
              <MessageCircle className="h-6 w-6 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-950 dark:text-white">Tin nhắn</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Trao đổi giữa khách hàng và cửa hàng</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[18rem_1fr] lg:px-8">
        <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {conversations.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 dark:text-slate-400">Chưa có cuộc trò chuyện.</div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  setActiveId(conversation.id);
                  if (conversation.unread_count > 0) {
                    void markRead(conversation.id);
                  }
                }}
                className={`flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left last:border-b-0 dark:border-slate-800 ${
                  conversation.id === activeId ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/70'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Store className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-gray-900 dark:text-white">
                    {getConversationName(conversation)}
                  </span>
                  <span className="block truncate text-xs text-gray-500 dark:text-slate-400">
                    {getConversationSubtitle(conversation)}
                  </span>
                </span>
                {conversation.unread_count > 0 && (
                  <span className="ml-auto inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </aside>

        <main className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {activeConversation ? (
            <div className="flex min-h-[34rem] flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 p-5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Store className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-bold text-gray-950 dark:text-white">{getConversationName(activeConversation)}</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {getConversationSubtitle(activeConversation)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {activeConversation.order_id && (
                    <Link
                      to={`/orders/${activeConversation.order_id}`}
                      className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Xem đơn hàng
                    </Link>
                  )}
                  {activeConversation.product_id && (
                    <Link
                      to={activeConversation.product_slug ? `/shop/${activeConversation.product_slug}` : '/shop'}
                      className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {activeConversation.product_slug ? 'Xem sản phẩm' : 'Cửa hàng'}
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {messagesLoading ? (
                  <div className="text-sm text-gray-500 dark:text-slate-400">Đang tải tin nhắn...</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-slate-400">Chưa có tin nhắn.</div>
                ) : (
                  messages.map((message) => {
                    const mine = meUserId !== undefined && message.sender_id === meUserId;
                    const isSeller = message.sender_role === 'seller';
                    return (
                      <div key={message.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine && (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            {isSeller ? <Store className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </span>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? 'bg-black text-white dark:bg-white dark:text-slate-950' : 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-100'}`}>
                          {message.message}
                        </div>
                        {mine && (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                            {isSeller ? <Store className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={onSendMessage} className="flex gap-3 border-t border-gray-100 p-4 dark:border-slate-800">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Nhập tin nhắn"
                  className="min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 dark:border-slate-700 dark:bg-slate-950/40 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  aria-label="Gửi"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex min-h-[34rem] flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-slate-400">
              <MessageCircle className="mb-4 h-14 w-14 text-gray-300 dark:text-slate-600" />
              Chọn một cửa hàng để bắt đầu trao đổi.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
