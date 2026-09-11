import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  X,
  Package,
  Truck,
  ExternalLink,
  Star,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  QrCode,
  Banknote,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson, apiFetch } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';
import { Reveal } from '../../components/motion/ScrollReveal';
import Pagination from '../../components/ui/Pagination';
import { scrollWindowToTop } from '../../lib/scroll';
import type { Order, OrderItem } from '../../types/marketplace';

const PAGE_SIZE = 8;

type OrderTab = 'all' | 'pending' | 'shipping' | 'completed' | 'cancelled';

const TABS: { id: OrderTab; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'shipping', label: 'Đang giao' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
];

const CANCEL_REASONS = [
  'Tôi muốn đổi địa chỉ nhận hàng',
  'Tôi muốn đổi phương thức thanh toán',
  'Tôi tìm thấy giá tốt hơn ở nơi khác',
  'Đổi ý không còn nhu cầu mua nữa',
  'Thời gian chuẩn bị hàng lâu hơn dự kiến',
  'Lý do khác...',
];

function formatPrice(n: number) {
  return (n || 0).toLocaleString('vi-VN') + 'đ';
}

function getOrderCode(order: Order) {
  if (order.order_code) return order.order_code;
  return `KC-${String(order.id).padStart(6, '0')}`;
}

export default function Orders() {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Repay State
  const [repayingOrderId, setRepayingOrderId] = useState<number | null>(null);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewImage, setReviewImage] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Repurchase state
  const [isRepurchasing, setIsRepurchasing] = useState(false);

  // Fetch all orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ orders: Order[]; total: number }>(
        `/api/marketplace/orders?limit=100&offset=0`
      );
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  // Đóng modal khi nhấn phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCancelModalOpen(false);
        setReviewModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tab counters
  const tabCounts = useMemo(() => {
    const counts = { all: orders.length, pending: 0, shipping: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => {
      if (o.status === 'pending') counts.pending++;
      else if (['confirmed', 'preparing', 'shipping'].includes(o.status)) counts.shipping++;
      else if (['delivered', 'completed'].includes(o.status)) counts.completed++;
      else if (o.status === 'cancelled') counts.cancelled++;
    });
    return counts;
  }, [orders]);

  // Filtered orders by tab & search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Tab filter
      if (activeTab === 'pending' && order.status !== 'pending') return false;
      if (activeTab === 'shipping' && !['confirmed', 'preparing', 'shipping'].includes(order.status)) return false;
      if (activeTab === 'completed' && !['delivered', 'completed'].includes(order.status)) return false;
      if (activeTab === 'cancelled' && order.status !== 'cancelled') return false;

      // 2. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = getOrderCode(order).toLowerCase();
        const hasItemMatch = order.items?.some((i) => i.product_name.toLowerCase().includes(q));
        const hasTrackingMatch = order.tracking_code?.toLowerCase().includes(q);
        if (!code.includes(q) && !hasItemMatch && !hasTrackingMatch) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const pagedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  // Handle Cancel Order
  const openCancelModal = (order: Order) => {
    setOrderToCancel(order);
    setSelectedReason(CANCEL_REASONS[0]);
    setCustomReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    const finalReason = selectedReason === 'Lý do khác...' ? (customReason.trim() || 'Lý do khác') : selectedReason;

    setIsSubmittingCancel(true);
    try {
      const res = await apiFetch(`/api/marketplace/orders/${orderToCancel.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: finalReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể hủy đơn');

      toast.success('Hủy đơn hàng thành công! Sản phẩm đã được hoàn kho.');
      setCancelModalOpen(false);
      setOrderToCancel(null);
      void fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi hủy đơn';
      toast.error(msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Handle MoMo Repay
  const handleMoMoRepay = async (orderId: number) => {
    setRepayingOrderId(orderId);
    try {
      const res = await apiFetch(`/api/marketplace/orders/${orderId}/momo-repay`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.payUrl) throw new Error(data.message || 'Không thể tạo liên kết thanh toán MoMo');

      toast.loading('Đang chuyển hướng sang Cổng MoMo...', { duration: 1500 });
      window.location.assign(data.payUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tạo cổng thanh toán';
      toast.error(msg);
    } finally {
      setRepayingOrderId(null);
    }
  };

  // Handle 1-Click Repurchase
  const handleRepurchase = async (order: Order) => {
    if (!order.items || order.items.length === 0) return;
    setIsRepurchasing(true);
    try {
      for (const item of order.items) {
        await addItem(item.product_id, item.quantity || 1);
      }
      toast.success('Đã thêm các món vào giỏ hàng!');
      navigate('/cart');
    } catch {
      toast.error('Không thể mua lại một số mặt hàng (có thể đã hết hàng)');
    } finally {
      setIsRepurchasing(false);
    }
  };

  // Handle Review Modal
  const openReviewModal = (order: Order, item: OrderItem) => {
    setReviewOrder(order);
    setReviewItem(item);
    setRating(5);
    setComment('');
    setReviewImage('');
    setReviewModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh không được vượt quá 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder || !reviewItem) return;

    setIsSubmittingReview(true);
    try {
      const res = await apiFetch('/api/marketplace/reviews', {
        method: 'POST',
        body: JSON.stringify({
          order_id: reviewOrder.id,
          product_id: reviewItem.product_id,
          rating,
          comment: comment.trim(),
          images: reviewImage ? [reviewImage] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể gửi đánh giá');

      toast.success('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
      setReviewModalOpen(false);
      setReviewOrder(null);
      setReviewItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi đánh giá';
      toast.error(msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-vietnam pb-24 transition-colors duration-300">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-800 border-b border-stone-200/80 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium">
            <Link to="/shop" className="hover:text-slate-900 dark:hover:text-white transition-colors">KitchenCook</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200">Lịch sử đơn hàng</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-center shadow-xs border border-stone-200 dark:border-slate-600">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Quản lý đơn hàng
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Theo dõi tiến trình vận đơn GHN, thanh toán lại MoMo và đánh giá đồ bếp
              </p>
            </div>

            {/* Search Box */}
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm mã đơn, tên đồ bếp..."
                className="w-full pl-10 pr-9 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Tabs with Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pt-6 pb-1 border-t border-slate-100 dark:border-slate-700/60 mt-6 no-scrollbar">
            {TABS.map((tab) => {
              const count = tabCounts[tab.id];
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'bg-stone-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-stone-200/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Order List */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 bg-white dark:bg-slate-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-3xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 shadow-sm">
            <Package className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Không tìm thấy đơn hàng nào</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
              {searchQuery ? 'Thử tìm với từ khóa khác hoặc xóa bộ lọc tìm kiếm' : 'Bạn chưa có đơn hàng nào trong danh mục này.'}
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md"
            >
              <Package className="w-4 h-4" />
              Khám phá đồ bếp KitchenCook
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {pagedOrders.map((order) => {
              const code = getOrderCode(order);
              const items = order.items || [];
              const isPending = order.status === 'pending';
              const isShipping = ['confirmed', 'preparing', 'shipping'].includes(order.status);
              const isDelivered = ['delivered', 'completed'].includes(order.status);
              const isCancelled = order.status === 'cancelled';
              const canMoMoRepay = isPending && order.payment_method === 'momo' && order.payment_status === 'unpaid';

              return (
                <Reveal key={order.id} y={12}>
                  <div className="bg-white dark:bg-slate-800 rounded-3xl border border-amber-900/10 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    {/* Order Card Header */}
                    <div className="px-6 py-4 bg-amber-50/30 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-black text-slate-900 dark:text-white tracking-wide">
                          MÃ: {code}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(order.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Payment Method Badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase">
                          {order.payment_method === 'momo' ? (
                            <span className="bg-[#A50064] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> MoMo V2
                            </span>
                          ) : order.payment_method === 'bank_transfer' ? (
                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <QrCode className="w-3 h-3" /> VietQR
                            </span>
                          ) : (
                            <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Banknote className="w-3 h-3" /> COD
                            </span>
                          )}
                        </span>

                        {/* Payment Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            order.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : order.payment_status === 'refunded'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {order.payment_status === 'paid'
                            ? 'Đã thanh toán'
                            : order.payment_status === 'refunded'
                            ? 'Đã hoàn tiền'
                            : 'Chưa thanh toán'}
                        </span>

                        {/* Order Lifecycle Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isPending
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300'
                              : isShipping
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : isDelivered
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          }`}
                        >
                          {isPending
                            ? 'Chờ xác nhận'
                            : order.status === 'confirmed'
                            ? 'Đã xác nhận'
                            : order.status === 'preparing'
                            ? 'Đang chuẩn bị'
                            : order.status === 'shipping'
                            ? 'Đang giao hàng'
                            : order.status === 'delivered'
                            ? 'Đã giao hàng'
                            : order.status === 'completed'
                            ? 'Hoàn thành'
                            : 'Đã hủy'}
                        </span>
                      </div>
                    </div>

                    {/* GHN Shipping Live Tracker Link */}
                    {order.tracking_code && (
                      <div className="px-6 py-2.5 bg-stone-100/70 dark:bg-slate-700/40 border-b border-stone-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Truck className="w-4 h-4 text-slate-900 dark:text-white" />
                          <span>Vận chuyển qua Giao Hàng Nhanh (GHN Express):</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {order.tracking_code}
                          </span>
                        </div>
                        <a
                          href={`https://donhang.ghn.vn/?order_code=${encodeURIComponent(order.tracking_code)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-stone-800 dark:text-stone-200 hover:text-slate-900 dark:hover:text-white underline"
                        >
                          Tra cứu vận đơn thực <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Order Items List */}
                    <div className="p-6 space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700 overflow-hidden border border-slate-100 dark:border-slate-600 shrink-0">
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <Package className="w-6 h-6" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {item.product_name}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Giá lúc mua: <span className="font-semibold">{formatPrice(item.unit_price)}</span> × {item.quantity}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-3">
                            <div>
                              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                {formatPrice(item.subtotal || item.unit_price * item.quantity)}
                              </p>
                            </div>

                            {/* Rate button for completed orders */}
                            {isDelivered && (
                              <button
                                type="button"
                                onClick={() => openReviewModal(order, item)}
                                className="px-3 py-1 rounded-full border border-stone-300 dark:border-slate-600 text-stone-700 dark:text-stone-300 text-[11px] font-bold hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                Đánh giá
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Cancelled Reason Note */}
                      {isCancelled && order.cancelled_reason && (
                        <div className="p-3 rounded-2xl bg-red-50/60 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-300 flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Lý do hủy: {order.cancelled_reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Card Footer */}
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Tổng thanh toán: </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          {formatPrice(order.total_amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Link to Detail */}
                        <Link
                          to={`/orders/${order.id}`}
                          onClick={scrollWindowToTop}
                          className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          Chi tiết đơn
                        </Link>

                        {/* Pay Again MoMo button */}
                        {canMoMoRepay && (
                          <button
                            type="button"
                            onClick={() => handleMoMoRepay(order.id)}
                            disabled={repayingOrderId === order.id}
                            className="px-4 py-2 rounded-full bg-[#A50064] hover:bg-[#8e0056] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            {repayingOrderId === order.id ? 'Đang kết nối...' : 'Thanh toán lại MoMo'}
                          </button>
                        )}

                        {/* Cancel order button */}
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(order)}
                            className="px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Hủy đơn hàng
                          </button>
                        )}

                        {/* Repurchase 1-click */}
                        {(isDelivered || isCancelled) && (
                          <button
                            type="button"
                            onClick={() => handleRepurchase(order)}
                            disabled={isRepurchasing}
                            className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Mua lại
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pt-4 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalItems={filteredOrders.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(p) => {
                    setPage(p);
                    scrollWindowToTop();
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL HỦY ĐƠN HÀNG */}
      {cancelModalOpen && orderToCancel && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setCancelModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-amber-900/10 dark:border-slate-700 shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-1">
              Xác nhận hủy đơn hàng
            </h3>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-6">
              Mã đơn: <strong className="text-slate-800 dark:text-slate-200">{getOrderCode(orderToCancel)}</strong>. Khi hủy, toàn bộ sản phẩm sẽ được tự động hoàn lại vào kho.
            </p>

            <div className="space-y-2.5 mb-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Vui lòng chọn lý do hủy đơn:
              </label>
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === reason
                      ? 'border-slate-900 bg-stone-50/60 dark:border-white dark:bg-slate-700/50 font-bold text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="w-4 h-4 text-slate-900 focus:ring-slate-900"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {selectedReason === 'Lý do khác...' && (
                <textarea
                  rows={2}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Ghi rõ lý do hủy của bạn..."
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingCancel ? 'Đang hủy...' : 'Đồng ý hủy đơn'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ĐÁNH GIÁ SẢN PHẨM */}
      {reviewModalOpen && reviewItem && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setReviewModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-stone-200 dark:border-slate-700 shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              Đánh giá sản phẩm
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {reviewItem.product_name}
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star rating */}
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                {rating === 5
                  ? 'Tuyệt vời, rất hài lòng!'
                  : rating === 4
                  ? 'Hài lòng'
                  : rating === 3
                  ? 'Bình thường'
                  : rating === 2
                  ? 'Chưa hài lòng'
                  : 'Rất thất vọng'}
              </p>

              {/* Comment text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nhận xét của bạn
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chất lượng đồ bếp, độ hoàn thiện, tốc độ giao hàng GHN..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:focus:border-white"
                />
              </div>

              {/* Upload image */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hình ảnh thực tế (tùy chọn)
                </label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="review-img"
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Chọn ảnh
                  </label>
                  <input
                    id="review-img"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {reviewImage && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                      <img src={reviewImage} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
