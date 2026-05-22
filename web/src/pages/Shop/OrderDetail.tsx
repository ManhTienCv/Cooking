import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, User, CreditCard, Package, CheckCircle, Star, MessageCircle, Truck, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { apiFetch, apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import PageBackBar from '../../components/ui/PageBackBar';
import { scrollWindowToTop } from '../../lib/scroll';
import type { Order, OrderItem } from '../../types/marketplace';
import CancelOrderModal from '../../components/CancelOrderModal';

type OrderReview = {
  product_id: number;
  rating: number;
  comment: string | null;
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Xác nhận' },
  { key: 'preparing', label: 'Chuẩn bị' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'completed', label: 'Hoàn thành' },
];

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<(Order & { items: OrderItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewForms, setReviewForms] = useState<Record<number, { rating: number; comment: string; submitting: boolean; submitted: boolean }>>({});
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [transitData, setTransitData] = useState<{
    status: string;
    estimated_delivery_at: string | null;
    actual_delivery_at: string | null;
    carrier_name: string | null;
    tracking_number: string | null;
    delay_resolution: string;
    is_delayed: boolean;
    eligible?: boolean;
    logs: { id: string; status: string; current_location: string; description: string; created_at: string }[];
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiJson<{ order: Order & { items: OrderItem[] } }>(`/api/marketplace/orders/${id}`)
      .then((d) => {
        setOrder(d.order);
        if (d.order && !['pending', 'confirmed', 'cancelled'].includes(d.order.status)) {
          interface TransitLog {
            id: string;
            status: string;
            current_location: string;
            description: string;
            created_at: string;
          }
          interface TransitDataResponse {
            status: string;
            estimated_delivery_at: string | null;
            actual_delivery_at: string | null;
            carrier_name: string | null;
            tracking_number: string | null;
            delay_resolution: string;
            is_delayed: boolean;
            eligible?: boolean;
            logs: TransitLog[];
          }
          return apiJson<TransitDataResponse>(`/api/marketplace/orders/${id}/transit-logs`);
        }
        return null;
      })
      .then((t) => {
        if (t) setTransitData(t);
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  const canReview = order ? ['delivered', 'completed'].includes(order.status) : false;
  const isPaid = order?.payment_status === 'paid';
  const isCancelled = order?.status === 'cancelled';
  const canCancel = useMemo(() => {
    if (!order || isCancelled || order.status === 'completed') return false;
    if (order.is_fast_food_only) {
      return order.status === 'pending';
    } else {
      return ['pending', 'confirmed', 'preparing'].includes(order.status);
    }
  }, [order, isCancelled]);
  const getPaidViaLabel = (via: string | null | undefined) => {
    if (!via) return 'Ví Cook';
    if (via === 'cookpay') return 'Ví Cook';
    if (via === 'momo') return 'Ví MoMo';
    if (via === 'cod') return 'Thanh toán khi nhận hàng';
    return via;
  };

  const orderSellers = useMemo(() => {
    if (!order) return [];
    const map = new Map<number, string[]>();
    for (const item of order.items) {
      const list = map.get(item.seller_id) ?? [];
      list.push(item.product_name);
      map.set(item.seller_id, list);
    }
    return [...map.entries()].map(([sellerId, productNames]) => ({
      sellerId,
      productNames,
    }));
  }, [order]);

  const updateReviewForm = (productId: number, patch: Partial<{ rating: number; comment: string; submitting: boolean; submitted: boolean }>) => {
    setReviewForms((prev) => ({
      ...prev,
      [productId]: {
        ...{ rating: 5, comment: '', submitting: false, submitted: false },
        ...prev[productId],
        ...patch,
      },
    }));
  };

  useEffect(() => {
    if (!order || !canReview) return;
    let active = true;
    apiJson<{ reviews: OrderReview[] }>(`/api/marketplace/orders/${order.id}/reviews`)
      .then((d) => {
        if (!active) return;
        const reviews = d.reviews ?? [];
        if (reviews.length === 0) return;
        setReviewForms((prev) => {
          const next = { ...prev };
          for (const review of reviews) {
            next[review.product_id] = {
              rating: review.rating,
              comment: review.comment ?? '',
              submitting: false,
              submitted: true,
            };
          }
          return next;
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [order, canReview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-white dark:bg-slate-800/80 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Không tìm thấy đơn hàng</h2>
          <Link to="/orders" onClick={scrollWindowToTop} className="text-amber-600 dark:text-amber-400 hover:underline font-medium">← Danh sách đơn hàng</Link>
        </div>
      </div>
    );
  }

  const stepIndex = isCancelled ? -1 : STATUS_STEPS.findIndex((s) => s.key === order.status);

  const submitReview = async (item: OrderItem) => {
    const form = reviewForms[item.product_id] ?? { rating: 5, comment: '', submitting: false, submitted: false };
    updateReviewForm(item.product_id, { submitting: true });
    try {
      const response = await apiFetch('/api/marketplace/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: item.product_id,
          order_id: order.id,
          rating: form.rating,
          comment: form.comment,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message || 'Không thể gửi đánh giá');
      }
      updateReviewForm(item.product_id, { submitting: false, submitted: true });
      toast.success('Đã gửi đánh giá');
    } catch (err) {
      updateReviewForm(item.product_id, { submitting: false });
      toast.error(err instanceof Error ? err.message : 'Không thể gửi đánh giá');
    }
  };

  const handleConfirmComplete = async () => {
    try {
      const response = await apiFetch(`/api/marketplace/orders/${order.id}/complete`, {
        method: 'PUT',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message || 'Không thể xác nhận');
      }
      toast.success('Đã xác nhận hoàn thành đơn hàng');
      setOrder(prev => prev ? { ...prev, status: 'completed' } : null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    }
  };

  const completeOrder = () => {
    setShowCompleteModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 transition-colors">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4">
            <PageBackBar fallbackTo="/orders" label="Quay lại danh sách" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {order.items && order.items.length > 0 ? (
              <>
                {order.items[0].product_name}
                {order.items[0].quantity > 1 && ` (x${order.items[0].quantity})`}
                {order.items.length > 1 && ` và ${order.items.length - 1} sản phẩm khác`}
              </>
            ) : (
              'Đơn hàng'
            )}
          </h1>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
            <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Status Tracker */}
        <Reveal y={12}>
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6">
            {isCancelled ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">❌</div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">Đơn hàng đã bị hủy</p>
                {order.cancelled_reason && (
                  <p className="text-sm text-gray-500 mt-1">Lý do: {order.cancelled_reason}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, i) => {
                  const done = i <= stepIndex;
                  const current = i === stepIndex;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center relative">
                      {i > 0 && (
                        <div className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                          i <= stepIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
                        }`} />
                      )}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        done
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
                      } ${current ? 'ring-4 ring-green-200 dark:ring-green-900' : ''}`}>
                        {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`text-[10px] mt-2 text-center ${done ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {!isCancelled && order.status === 'delivered' && (
              <div className="mt-8 text-center border-t border-gray-100 dark:border-slate-700/50 pt-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Vui lòng xác nhận khi bạn đã nhận được hàng.</p>
                <button
                  type="button"
                  onClick={completeOrder}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-full font-bold transition-all transform hover:scale-105 shadow-md hover:shadow-lg shadow-amber-500/30"
                >
                  Xác nhận đã nhận hàng
                </button>
              </div>
            )}

            {canCancel && (
              <div className="mt-6 text-center border-t border-gray-100 dark:border-slate-700/50 pt-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Bạn có thể yêu cầu hủy đơn hàng này nếu không muốn tiếp tục mua nữa.</p>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full font-bold transition-all transform hover:scale-105 shadow-md hover:shadow-lg shadow-red-500/30"
                >
                  Hủy đơn hàng
                </button>
              </div>
            )}
          </div>
        </Reveal>

        {/* Lộ trình Vận chuyển & Định vị */}
        {transitData && transitData.eligible !== false && (
          <Reveal y={12} delay={0.03}>
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-700">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-amber-500" /> Thông tin vận đơn
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Đơn vị: <span className="font-semibold text-gray-700 dark:text-gray-300">{transitData.carrier_name}</span> · Mã: <span className="font-semibold text-gray-700 dark:text-gray-300">{transitData.tracking_number}</span>
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <span className="text-xs text-gray-400">Thời gian giao dự kiến:</span>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 md:justify-end mt-0.5">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    {transitData.estimated_delivery_at ? new Date(transitData.estimated_delivery_at).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {transitData.is_delayed && (
                <div className="p-4 bg-orange-50 dark:bg-amber-950/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-orange-800 dark:text-orange-300">Đơn hàng bị trễ hẹn giao hàng</h4>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Chúng tôi vô cùng xin lỗi vì sự chậm trễ này do quá trình vận chuyển. Đơn hàng đang được thúc đẩy giao hàng sớm nhất có thể. CookingWeb đã tự động gửi voucher đền bù đến tài khoản của bạn để xin lỗi.
                    </p>
                  </div>
                </div>
              )}

              {transitData.logs && transitData.logs.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-amber-100 dark:border-slate-700 space-y-8 ml-2">
                  {transitData.logs.map((log, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={log.id} className="relative">
                        {/* Milestone dot */}
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 ${
                          isLatest 
                            ? 'bg-amber-500 border-white dark:border-slate-800 ring-4 ring-amber-100 dark:ring-amber-950 animate-pulse' 
                            : 'bg-gray-300 dark:bg-slate-600 border-white dark:border-slate-800'
                        }`} />
                        <div>
                          <div className="flex items-center justify-between gap-4">
                            <h4 className={`text-sm font-bold ${isLatest ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-300'}`}>
                              {log.current_location}
                            </h4>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                              {new Date(log.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {log.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-400">
                  <Clock className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                  Đang lập lộ trình chi tiết...
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* Order Items */}
        <Reveal y={12} delay={0.06}>
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" /> Sản phẩm ({order.items.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-700/30">
              {order.items.map((item) => {
                const reviewForm = reviewForms[item.product_id] ?? { rating: 5, comment: '', submitting: false, submitted: false };
                return (
                <div key={item.id} className="p-5">
                  <div className="flex gap-4">
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700">
                    {item.product_image ? (
                      <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg text-gray-300">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{item.product_name}</p>
                    <p className="text-xs text-gray-400 mt-1">x{item.quantity} · {formatPrice(item.unit_price)}/{'\u200b'}sp</p>
                  </div>
                  <span className="font-bold text-sm text-gray-900 dark:text-white">{formatPrice(item.subtotal)}</span>
                  </div>
                  {canReview && (
                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Đánh giá món này</span>
                        {reviewForm.submitted && <span className="text-xs font-semibold text-green-600 dark:text-green-400">Đã lưu</span>}
                      </div>
                      <div className="mb-3 flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const value = i + 1;
                          const active = value <= reviewForm.rating;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => updateReviewForm(item.product_id, { rating: value, submitted: false })}
                              className="rounded p-0.5 transition-transform hover:scale-110"
                              aria-label={`${value} sao`}
                            >
                              <Star className={`h-5 w-5 ${active ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-slate-600'}`} />
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => updateReviewForm(item.product_id, { comment: e.target.value, submitted: false })}
                        rows={3}
                        maxLength={500}
                        placeholder="Nhận xét của bạn"
                        className="w-full resize-none rounded-lg border border-amber-100 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-slate-700 dark:bg-slate-950/40 dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={reviewForm.submitting}
                        onClick={() => void submitReview(item)}
                        className="mt-3 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                      >
                        {reviewForm.submitting ? 'Đang gửi...' : reviewForm.submitted ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                      </button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 space-y-2">
              {isPaid ? (
                <>
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <span>Trạng thái thanh toán</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Đã thanh toán qua {getPaidViaLabel(order.paid_via)} vào hồi {new Date(order.updated_at || order.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white">Cần thanh toán</span>
                    <span className="text-xl font-extrabold text-green-600 dark:text-green-400">0đ</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <span>Trạng thái</span>
                    <span>Đã đặt đơn vào hồi {new Date(order.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <span>Hình thức thanh toán</span>
                    <span>{order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng'}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-50 dark:border-slate-800/50 pt-2">
                    <span className="font-bold text-gray-900 dark:text-white">Tổng cộng</span>
                    <span className="text-xl font-extrabold text-red-600 dark:text-red-400">{formatPrice(order.total_amount)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Reveal>

        {/* Chat with sellers */}
        {orderSellers.length > 0 && (
          <Reveal y={12} delay={0.1}>
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-amber-500" /> Trao đổi với cửa hàng
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Có vấn đề với đơn hàng? Nhắn tin trực tiếp.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {orderSellers.map(({ sellerId, productNames }) => (
                  <Link
                    key={sellerId}
                    to={`/messages?orderId=${order.id}&sellerId=${sellerId}`}
                    className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/35"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {orderSellers.length > 1 ? `Chat cửa hàng (${productNames[0]}…)` : 'Nhắn tin cửa hàng'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Shipping Info */}
        <Reveal y={12} delay={0.12}>
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" /> Thông tin giao hàng
            </h3>
            <div className="space-y-2 text-sm">
              {order.shipping_name && (
                <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <User className="w-3.5 h-3.5" /> {order.shipping_name}
                </p>
              )}
              {order.shipping_phone && (
                <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone className="w-3.5 h-3.5" /> {order.shipping_phone}
                </p>
              )}
              {order.shipping_address && (
                <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-3.5 h-3.5" /> {order.shipping_address}
                </p>
              )}
              <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CreditCard className="w-3.5 h-3.5" />
                {isPaid ? (
                  <span>Đã thanh toán qua {getPaidViaLabel(order.paid_via)}</span>
                ) : (
                  <span>Hình thức thanh toán: {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng'}</span>
                )}
              </p>
              {order.note && (
                <p className="text-gray-500 dark:text-gray-500 italic mt-2">📝 {order.note}</p>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Complete Confirmation Modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompleteModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-gray-100 dark:border-slate-800/80 shadow-2xl pointer-events-auto text-center"
              >
                <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hoàn thành đơn hàng</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Xác nhận bạn đã nhận được đầy đủ sản phẩm và hài lòng với đơn hàng này? Thao tác này không thể hoàn tác.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCompleteModal(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      setShowCompleteModal(false);
                      await handleConfirmComplete();
                    }}
                    className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                  >
                    Xác nhận
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <CancelOrderModal
        open={showCancelModal}
        orderId={order ? order.id : null}
        onClose={() => setShowCancelModal(false)}
        onSuccess={() => {
          setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
        }}
        role="buyer"
      />
    </div>
  );
}
