import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Maximize2, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiJson, apiFetch } from '../../lib/api';
import { AUTH_CHANGE_EVENT } from '../../lib/authEvents';

type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: 'buyer' | 'seller';
  message: string;
  created_at: string;
};

type ConversationSummary = {
  id: number;
  buyer_id: number;
  seller_id: number;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
};

export default function FloatingChatWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [me, setMe] = useState<{ id: number; full_name: string } | null>(null);
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeConvIdRef = useRef<number | null>(null);

  // Không hiển thị widget nổi khi đang ở trang tin nhắn hoặc admin
  const isExcludedPage = location.pathname.startsWith('/messages') || location.pathname.startsWith('/admin');

  // Kiểm tra đăng nhập
  const checkAuth = useCallback(async () => {
    try {
      const res = await apiJson<{ authenticated: boolean; user?: { id: number; full_name: string } }>('/api/auth/me');
      if (res.authenticated && res.user) {
        setMe(res.user);
      } else {
        setMe(null);
      }
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
    const handleAuth = () => {
      void checkAuth();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuth);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleAuth);
  }, [checkAuth]);

  // Khởi tạo cuộc trò chuyện hỗ trợ CSKH
  const initSupportChat = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const res = await apiJson<{ conversation: ConversationSummary }>('/api/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({ support: true }),
      });
      if (res.conversation) {
        setConversation(res.conversation);
        activeConvIdRef.current = res.conversation.id;

        // Tải tin nhắn
        const msgRes = await apiJson<{ messages: ChatMessage[] }>(
          `/api/messages/conversations/${res.conversation.id}/messages?limit=50`
        );
        setMessages(msgRes.messages || []);
        void apiFetch(`/api/messages/conversations/${res.conversation.id}/read`, { method: 'POST' });
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[FloatingChat] Lỗi kết nối hỗ trợ:', err);
    } finally {
      setLoading(false);
    }
  }, [me]);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Mở chat
  const handleToggle = () => {
    if (!me) {
      toast('Vui lòng đăng nhập để bắt đầu trò chuyện trực tuyến.', { icon: '🔐' });
      return;
    }
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && !conversation) {
      void initSupportChat();
    } else if (nextState && conversation) {
      void apiFetch(`/api/messages/conversations/${conversation.id}/read`, { method: 'POST' });
      setUnreadCount(0);
    }
  };

  // Lắng nghe SSE thời gian thực
  useEffect(() => {
    if (!me) return;

    const es = new EventSource('/api/messages/stream', { withCredentials: true });

    es.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as { conversationId: number; message: ChatMessage };
        if (!payload?.message) return;
        const newMsg = payload.message;

        if (activeConvIdRef.current === newMsg.conversation_id) {
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          if (isOpen) {
            void apiFetch(`/api/messages/conversations/${newMsg.conversation_id}/read`, { method: 'POST' });
          } else {
            setUnreadCount((c) => c + 1);
          }
        } else if (newMsg.sender_id !== me.id) {
          setUnreadCount((c) => c + 1);
        }
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    });

    return () => {
      es.close();
    };
  }, [me, isOpen]);

  // Gửi tin nhắn
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || draft).trim();
    if (!textToSend || !conversation || sending) return;

    setSending(true);
    try {
      const res = await apiJson<{ message: ChatMessage }>(
        `/api/messages/conversations/${conversation.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ message: textToSend }),
        }
      );
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        if (!customText) setDraft('');
      }
    } catch {
      toast.error('Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  if (isExcludedPage) return null;

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center">
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleToggle}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#E8590C] to-[#FA5252] text-white shadow-xl shadow-orange-500/30 flex items-center justify-center cursor-pointer focus:outline-none ring-4 ring-white dark:ring-slate-800 transition-shadow"
          aria-label="Hỗ trợ trực tuyến"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6 fill-white/20" />
          )}

          {/* Unread badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-600 border-2 border-white dark:border-slate-800 text-white text-[11px] font-black rounded-full flex items-center justify-center px-1 animate-bounce">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Floating Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-[92vw] sm:w-[380px] h-[520px] max-h-[82vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden font-vietnam"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#E8590C] to-[#FA5252] text-white p-4 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg font-black border border-white/30">
                  🍳
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-1.5 leading-tight">
                    KitchenCook CSKH
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  </h4>
                  <p className="text-[11px] text-white/80 mt-0.5">Trực tuyến hỗ trợ 24/7</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  to="/messages"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  title="Mở toàn màn hình"
                >
                  <Maximize2 className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Thu nhỏ"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Chips suggestions */}
            <div className="px-3 py-2 bg-stone-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
              <span className="text-gray-400 text-[10px] font-bold shrink-0 uppercase tracking-wider">Gợi ý:</span>
              <button
                type="button"
                onClick={() => void handleSendMessage('Tôi cần tư vấn chọn kích thước nồi chảo phù hợp')}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:border-amber-500 hover:text-amber-600 shrink-0 transition-colors cursor-pointer"
              >
                🍳 Chọn nồi chảo
              </button>
              <button
                type="button"
                onClick={() => void handleSendMessage('Tôi muốn kiểm tra tình trạng đơn hàng')}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:border-amber-500 hover:text-amber-600 shrink-0 transition-colors cursor-pointer"
              >
                🚚 Tra cứu đơn
              </button>
              <button
                type="button"
                onClick={() => void handleSendMessage('Chính sách hoàn tiền và đổi trả như thế nào?')}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:border-amber-500 hover:text-amber-600 shrink-0 transition-colors cursor-pointer"
              >
                🛡️ Hoàn tiền
              </button>
            </div>

            {/* Message Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF7F2] dark:bg-slate-900/50">
              {loading ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#E8590C] border-t-transparent mr-2" />
                  Đang kết nối trung tâm hỗ trợ...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="text-3xl">👋</div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">Xin chào {me?.full_name}!</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px] mx-auto leading-relaxed">
                    Bạn cần hỗ trợ về sản phẩm, đơn hàng hay công thức nấu ăn nào hôm nay?
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = me && m.sender_id === me.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          isMine
                            ? 'bg-[#E8590C] text-white rounded-br-xs'
                            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700/60 rounded-bl-xs shadow-xs'
                        }`}
                      >
                        {m.message}
                      </div>
                      <span className="text-[9px] text-gray-400 mt-1 px-1">
                        {new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-[#E8590C] transition-colors"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="w-9 h-9 rounded-xl bg-[#E8590C] hover:bg-[#d04e0a] text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
