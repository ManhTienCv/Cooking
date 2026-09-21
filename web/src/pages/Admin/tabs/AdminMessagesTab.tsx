import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  Send,
  User,
  Search,
  RefreshCw,
  Headphones,
  CheckCheck,
  Clock,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson } from '../../../lib/api';

interface AdminConversation {
  id: number;
  buyer_id: number;
  seller_id: number;
  created_at: string;
  updated_at: string;
  buyer_name: string;
  buyer_avatar_url: string | null;
  buyer_email: string;
  seller_name: string;
  seller_avatar_url: string | null;
  last_message: string | null;
  last_message_sender_id: number | null;
  last_message_at: string | null;
  message_count: number;
}

interface AdminChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: 'buyer' | 'seller';
  message: string;
  created_at: string;
}

export default function AdminMessagesTab() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<number | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Tải danh sách các cuộc trò chuyện
  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiJson<{ conversations: AdminConversation[] }>('/api/admin/chat/conversations');
      const list = data.conversations ?? [];
      setConversations(list);
      if (list.length > 0 && !activeIdRef.current) {
        setActiveId(list[0].id);
      }
    } catch {
      if (!silent) {
        toast.error('Không thể tải danh sách cuộc trò chuyện.', { id: 'admin-load-conversations-error' });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Tải tin nhắn của hội thoại được chọn
  const loadMessages = useCallback(async (conversationId: number, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      const data = await apiJson<{ messages: AdminChatMessage[] }>(
        `/api/admin/chat/conversations/${conversationId}/messages?limit=100`
      );
      setMessages(data.messages ?? []);
      void apiJson(`/api/admin/chat/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {});
    } catch {
      if (!silent) {
        toast.error('Lỗi khi tải nội dung tin nhắn.', { id: 'admin-load-messages-error' });
      }
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) {
      void loadMessages(activeId);
    } else {
      setMessages([]);
    }
  }, [activeId, loadMessages]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // Tự động polling cập nhật nhẹ nhàng mỗi 4 giây
  useEffect(() => {
    const timer = setInterval(() => {
      void loadConversations(true);
      if (activeIdRef.current) {
        void loadMessages(activeIdRef.current, true);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [loadConversations, loadMessages]);

  // Gửi tin nhắn
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !activeId || sending) return;

    setSending(true);
    try {
      const data = await apiJson<{ message: AdminChatMessage }>(
        `/api/admin/chat/conversations/${activeId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ message: text }),
        }
      );
      setInputText('');
      setMessages((prev) => [...prev, data.message]);
      void loadConversations(true);
      setTimeout(() => scrollToBottom(), 50);
    } catch (err: unknown) {
      const errMsg = (err as { message?: string })?.message || 'Không thể gửi tin nhắn.';
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeId);

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.buyer_name?.toLowerCase().includes(q) ||
      c.buyer_email?.toLowerCase().includes(q) ||
      c.last_message?.toLowerCase().includes(q)
    );
  });

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Trung Tâm Trò Chuyện & CSKH</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Trực tuyến
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Hỗ trợ khách hàng mua sắm đồ bếp KitchenCook theo thời gian thực (Shopee-style 2 cột)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadConversations();
            if (activeId) void loadMessages(activeId);
            toast.success('Đã làm mới danh sách tin nhắn');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Main 2-Column Console */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-[340px_1fr] h-[720px]">
        {/* Left Column: Conversation List */}
        <div className="border-r border-slate-200 dark:border-slate-700/80 flex flex-col h-full bg-slate-50/40 dark:bg-slate-800/40">
          {/* Search Box */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên khách, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-700/50">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-amber-500" />
                Đang tải danh sách hội thoại...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Chưa có hội thoại nào</p>
                <p className="text-xs text-slate-400 mt-1">Khách hàng gửi tin nhắn sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setActiveId(conv.id);
                    }}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-l-4 border-l-amber-500'
                        : 'hover:bg-white dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {conv.buyer_avatar_url ? (
                        <img
                          src={conv.buyer_avatar_url}
                          alt={conv.buyer_name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-amber-500 to-orange-400 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                          {conv.buyer_name ? conv.buyer_name.charAt(0).toUpperCase() : 'K'}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {conv.buyer_name || 'Khách hàng'}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                          {formatTime(conv.last_message_at || conv.updated_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conv.last_message || 'Bắt đầu cuộc trò chuyện...'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[140px]">
                          {conv.buyer_email}
                        </span>
                        {conv.message_count > 0 && (
                          <span className="text-[10px] text-slate-400 ml-auto">
                            {conv.message_count} tin
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Box */}
        <div className="flex flex-col h-full bg-white dark:bg-slate-800">
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-linear-to-tr from-amber-500 to-orange-400 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {activeConversation.buyer_name ? activeConversation.buyer_name.charAt(0).toUpperCase() : 'K'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {activeConversation.buyer_name || 'Khách hàng'}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        Khách mua
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{activeConversation.buyer_email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    KitchenCook Store CSKH
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-3.5 bg-slate-50/50 dark:bg-slate-900/30">
                {messagesLoading ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-500 mr-2" />
                    Đang tải tin nhắn...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                    <MessageCircle className="w-10 h-10 mb-2 opacity-30 text-amber-500" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Chưa có tin nhắn trong hội thoại này</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Nhập lời chào hoặc phản hồi thắc mắc từ khách hàng ở khung bên dưới để hỗ trợ họ.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_role === 'seller';
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="max-w-[70%] space-y-1">
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isAdmin
                                ? 'bg-amber-600 text-white rounded-br-xs shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-slate-700 shadow-2xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                          <div
                            className={`flex items-center gap-1 text-[10px] text-slate-400 ${
                              isAdmin ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatTime(msg.created_at)}</span>
                            {isAdmin && <CheckCheck className="w-3 h-3 text-amber-500 ml-0.5" />}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                            <Headphones className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <form onSubmit={handleSend} className="p-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập câu trả lời tư vấn cho khách hàng..."
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    {sending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Gửi</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Headphones className="w-12 h-12 mb-3 text-amber-500/50" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Chọn cuộc trò chuyện để phản hồi</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Bạn có thể chọn bất kỳ khách hàng nào ở danh sách bên trái để xem lịch sử và trả lời thắc mắc.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
