import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, User, CreditCard, Package, CheckCircle, Star, MessageCircle, Truck, Calendar, AlertTriangle, Clock, Camera, X, Video } from 'lucide-react';
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
  images?: string[];
  video_url?: string | null;
};

type ReviewFormState = {
  rating: number;
  comment: string;
  images: string[];
  video_url: string;
  submitting: boolean;
  submitted: boolean;
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Xác nhận' },
  { key: 'preparing', label: 'Chuẩn bị' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'completed', label: 'Hoàn tất' },
];

const DEFAULT_REVIEW_FORM: ReviewFormState = {
  rating: 5,
  comment: '',
  images: [],
  video_url: '',
  submitting: false,
  submitted: false,
};

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<(Order & { items: OrderItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewForms, setReviewForms] = useState<Record<number, ReviewFormState>>({});
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
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
  const isRefundPending = order?.status === 'refund_pending';
  const canCancel = useMemo(() => {
    if (!order || isCancelled || isRefundPending || order.status === 'completed') return false;
    return ['pending', 'confirmed', 'preparing'].includes(order.status);
  }, [order, isCancelled, isRefundPending]);
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

  const updateReviewForm = (productId: number, patch: Partial<ReviewFormState>) => {
    setReviewForms((prev) => {
      const existing = prev[productId] ?? DEFAULT_REVIEW_FORM;
      return {
        ...prev,
        [productId]: {
          ...existing,
          ...patch,
        },
      };
    });
  };

  const handleReviewImagesChange = (productId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const cur = reviewForms[productId]?.images || [];
    if (cur.length + files.length > 5) {
      toast.error('Tối đa 5 hình ảnh thực tế cho mỗi đánh giá');
      return;
    }
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Ảnh ${file.name} vượt quá 5MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        setReviewForms((prev) => {
          const existing = prev[productId] ?? DEFAULT_REVIEW_FORM;
          if (existing.images.length >= 5) return prev;
          return {
            ...prev,
            [productId]: {
              ...existing,
              images: [...existing.images, b64],
              submitted: false,
            },
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveReviewImage = (productId: number, idx: number) => {
    setReviewForms((prev) => {
      const existing = prev[productId] ?? DEFAULT_REVIEW_FORM;
      return {
        ...prev,
        [productId]: {
          ...existing,
          images: existing.images.filter((_, i) => i !== idx),
          submitted: false,
        },
      };
    });
  };

  const [momoLoading, setMomoLoading] = useState(false);

  const handlePayMoMo = async () => {
    if (!order) return;
    setMomoLoading(true);
    try {
      const res = await apiJson<{ success: boolean; payUrl?: string }>(`/api/marketplace/orders/${order.id}/momo`, {
        method: 'POST',
      });
      if (res.payUrl) {
        toast.success('Đang mở cổng thanh toán MoMo...');
        window.location.href = res.payUrl;
      } else {
        toast.error('Không tạo được liên kết thanh toán MoMo');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi thanh toán MoMo');
    } finally {
      setMomoLoading(false);
    }
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
              images: review.images ?? [],
              video_url: review.video_url ?? '',
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
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 font-vietnam">
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
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 flex items-center justify-center font-vietnam">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Không tìm thấy đơn hàng</h2>
          <Link to="/orders" onClick={scrollWindowToTop} className="text-slate-900 dark:text-white hover:underline font-bold">← Danh sách đơn hàng</Link>
        </div>
      </div>
    );
  }

  const stepIndex = isCancelled ? -1 : STATUS_STEPS.findIndex((s) => s.key === order.status);

  const submitReview = async (item: OrderItem) => {
    const form = reviewForms[item.product_id] ?? { rating: 5, comment: '', images: [], video_url: '', submitting: false, submitted: false };
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
          images: form.images || [],
          video_url: form.video_url || undefined,
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
    if (!order || isCompleting) return;
    setIsCompleting(true);
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
      setShowCompleteModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setIsCompleting(false);
    }
  };

  const completeOrder = () => {
    setShowCompleteModal(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 transition-colors font-vietnam">
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
            <span className="inline-flex items-center gap-1 font-mono font-bold bg-stone-100 text-stone-800 dark:bg-slate-800 dark:text-stone-300 px-2.5 py-1 rounded-md border border-stone-200 dark:border-slate-700">
              Mã đơn: {order.order_code || `KC-${String(order.id).padStart(6, '0')}`}
            </span>
            <span>·</span>
            <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
            {(order.shipping_partner || order.tracking_code) && (
              <>
                <span>·</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{order.shipping_partner || 'GHN Express'}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Instant 1-2H Delivery Alert */}
        {order.delivery_type === 'instant_1h' && (
          <Reveal y={12}>
            <div className="rounded-2xl border border-stone-200 bg-white dark:bg-slate-800/80 p-4 md:p-5 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm md:text-base text-slate-900 dark:text-white uppercase tracking-wider">
                      Đơn Hàng Giao Hỏa Tốc 1 - 2 Giờ
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white shadow-sm shadow-amber-500/30">
                      Thực phẩm tươi sống
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Đơn hàng được ưu tiên đóng gói và bàn giao ngay cho shipper công nghệ. Thời gian giao hàng dự kiến trong <strong>60 - 90 phút</strong>.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* Status Tracker */}
        <Reveal y={12}>
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6">
            {isRefundPending ? (
              <div className="text-center py-6 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl p-6 border border-amber-200 dark:border-amber-800/50">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">Đơn hàng đang chờ xử lý hoàn tiền (refund_pending)</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-lg mx-auto leading-relaxed">
                  Đơn hàng đã thanh toán trực tuyến và ghi nhận yêu cầu hủy. Ban quản trị KitchenCook đang đối soát giao dịch để xử lý hoàn tiền cho bạn.
                </p>
                {(order.refund_reason || order.cancel_reason || order.cancelled_reason) && (
                  <div className="mt-3 inline-block px-3.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-xs text-gray-600 dark:text-gray-300 border border-amber-200/60 dark:border-slate-700 font-medium">
                    Lý do hủy: {order.refund_reason || order.cancel_reason || order.cancelled_reason}
                  </div>
                )}
              </div>
            ) : isCancelled ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">{order.payment_status === 'refunded' ? '💸' : '❌'}</div>
                <p className={`text-lg font-bold ${order.payment_status === 'refunded' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {order.payment_status === 'refunded' ? 'Đơn hàng đã hủy & Hoàn tiền thành công' : 'Đơn hàng đã bị hủy'}
                </p>
                {(order.cancel_reason || order.cancelled_reason || order.refund_reason) && (
                  <p className="text-sm text-gray-500 mt-1">
                    Lý do: {order.refund_reason || order.cancel_reason || order.cancelled_reason}
                  </p>
                )}

                {/* Thẻ Đối Soát Hoàn Tiền Minh Bạch */}
                {order.payment_status === 'refunded' && (
                  <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-left max-w-lg mx-auto shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/60">
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Biên nhận hoàn tiền
                      </span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>

                    {order.refund_transaction_code && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <span className="text-stone-500 dark:text-stone-400">Mã giao dịch đối soát:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700/50">
                          {order.refund_transaction_code}
                        </span>
                      </div>
                    )}

                    {order.refunded_at && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <span className="text-stone-500 dark:text-stone-400">Thời gian hoàn tất:</span>
                        <span className="text-stone-700 dark:text-stone-300 font-medium">
                          {new Date(order.refunded_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    )}

                    {order.refund_note && (
                      <div className="pt-1 text-xs text-stone-600 dark:text-stone-300 bg-white/70 dark:bg-slate-800/70 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                        <span className="font-semibold text-stone-700 dark:text-stone-200">Ghi chú từ KitchenCook: </span>
                        {order.refund_note}
                      </div>
                    )}

                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 text-center pt-1 italic">
                      Nếu cần hỗ trợ thêm về giao dịch hoàn tiền, vui lòng liên hệ trực tiếp với hỗ trợ viên.
                    </p>
                  </div>
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
            
            {!isCancelled && !isRefundPending && order.status === 'delivered' && (
              <div className="mt-8 text-center border-t border-gray-100 dark:border-slate-700/50 pt-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Vui lòng xác nhận khi bạn đã nhận được hàng.</p>
                <button
                  type="button"
                  onClick={completeOrder}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-full font-bold transition-all transform hover:scale-105 shadow-md hover:shadow-lg shadow-amber-500/30 cursor-pointer"
                >
                  Xác nhận đã nhận hàng
                </button>
              </div>
            )}

            {canCancel ? (
              <div className="mt-6 text-center border-t border-gray-100 dark:border-slate-700/50 pt-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  {order.status === 'preparing'
                    ? 'Đơn hàng đang chuẩn bị / đóng gói. Bạn vẫn có thể yêu cầu hủy đơn trước khi đơn được bàn giao vận chuyển.'
                    : 'Bạn có thể yêu cầu hủy đơn hàng này nếu không muốn tiếp tục mua nữa.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full font-bold transition-all transform hover:scale-105 shadow-md hover:shadow-lg shadow-red-500/30 cursor-pointer"
                >
                  Hủy đơn hàng
                </button>
              </div>
            ) : ['shipping', 'delivering'].includes(order.status) ? (
              <div className="mt-6 text-center border-t border-gray-100 dark:border-slate-700/50 pt-6">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 px-6 py-2.5 rounded-full font-bold text-sm cursor-not-allowed border border-gray-200 dark:border-slate-700"
                >
                  <span>🔒</span> Đơn hàng đang vận chuyển (Không thể hủy)
                </button>
                <p className="text-xs text-gray-400 mt-2">Kiện hàng đã được bàn giao cho đối tác vận chuyển GHN Express.</p>
              </div>
            ) : null}
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>Đơn vị: <span className="font-semibold text-gray-700 dark:text-gray-300">{transitData.carrier_name || 'GHN Express'}</span></span>
                    <span>·</span>
                    <span>Mã: <span className="font-semibold font-mono text-gray-700 dark:text-gray-300">{transitData.tracking_number}</span></span>
                    {transitData.tracking_number && (
                      <a
                        href={`https://donhang.ghn.vn/?order_code=${transitData.tracking_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold underline text-xs ml-1"
                      >
                        Tra cứu GHN ↗
                      </a>
                    )}
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
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Đơn hàng bị trễ hẹn giao hàng</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Chúng tôi vô cùng xin lỗi vì sự chậm trễ này do quá trình vận chuyển. Đơn hàng đang được thúc đẩy giao hàng sớm nhất có thể. KitchenCook đã tự động gửi voucher đền bù đến tài khoản của bạn để xin lỗi.
                    </p>
                  </div>
                </div>
              )}

              {transitData.logs && transitData.logs.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-stone-200 dark:border-slate-700 space-y-8 ml-2">
                  {transitData.logs.map((log, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={log.id} className="relative">
                        {/* Milestone dot */}
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 ${
                          isLatest 
                            ? 'bg-slate-900 dark:bg-white border-white dark:border-slate-800 ring-4 ring-stone-200 dark:ring-slate-700 animate-pulse' 
                            : 'bg-stone-300 dark:bg-slate-600 border-white dark:border-slate-800'
                        }`} />
                        <div>
                          <div className="flex items-center justify-between gap-4">
                            <h4 className={`text-sm font-bold ${isLatest ? 'text-slate-900 dark:text-white' : 'text-gray-800 dark:text-gray-300'}`}>
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

                      {/* Upload ảnh & video đánh giá */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 cursor-pointer transition-colors shadow-sm">
                            <Camera className="w-3.5 h-3.5" />
                            <span>Thêm ảnh ({reviewForm.images?.length || 0}/5)</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                handleReviewImagesChange(item.product_id, e.target.files);
                                e.target.value = '';
                              }}
                            />
                          </label>

                          <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                            <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              type="url"
                              value={reviewForm.video_url || ''}
                              onChange={(e) => updateReviewForm(item.product_id, { video_url: e.target.value, submitted: false })}
                              placeholder="Link video unboxing (Youtube/Tiktok)..."
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        </div>

                        {/* Danh sách ảnh đã chọn */}
                        {reviewForm.images && reviewForm.images.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {reviewForm.images.map((imgUrl, imgIdx) => (
                              <div key={imgIdx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-amber-300 dark:border-amber-600 group">
                                <img src={imgUrl} alt={`Review ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReviewImage(item.product_id, imgIdx)}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                                  title="Xóa ảnh này"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

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
                    <span>
                      {order.payment_method === 'cod'
                        ? 'Thanh toán khi nhận hàng (COD)'
                        : order.payment_method === 'momo'
                        ? 'Ví điện tử MoMo'
                        : order.payment_method === 'cookpay'
                        ? 'Ví Cook'
                        : 'Chuyển khoản ngân hàng (VietQR)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-50 dark:border-slate-800/50 pt-2">
                    <span className="font-bold text-gray-900 dark:text-white">Tổng cộng</span>
                    <span className="text-xl font-extrabold text-red-600 dark:text-red-400">{formatPrice(order.total_amount)}</span>
                  </div>

                  {!isPaid && !isCancelled && order.payment_method === 'momo' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700/50">
                      <button
                        type="button"
                        disabled={momoLoading}
                        onClick={handlePayMoMo}
                        className="w-full py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition"
                      >
                        {momoLoading ? 'Đang kết nối MoMo...' : '💳 Thanh toán ngay bằng Ví MoMo'}
                      </button>
                    </div>
                  )}


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
                  <span>
                    Hình thức thanh toán:{' '}
                    {order.payment_method === 'cod'
                      ? 'Thanh toán khi nhận hàng'
                      : order.payment_method === 'momo'
                      ? 'Ví điện tử MoMo'
                      : order.payment_method === 'cookpay'
                      ? 'Ví Cook'
                      : 'Chuyển khoản ngân hàng'}
                  </span>
                )}
              </p>
              {order.note && (
                <p className="text-gray-500 dark:text-gray-500 italic mt-2">📝 {order.note}</p>
              )}
              {order.ref_recipe_id && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/60 flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span className="text-base">🎁</span>
                  <span>Đơn hàng liên kết từ bài viết công thức nấu ăn. Tác giả công thức được nhận 5% hoa hồng thưởng khi đơn hoàn tất!</span>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Complete Confirmation Modal */}
      <AnimatePresence>
        {showCompleteModal && createPortal(
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
                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    disabled={isCompleting}
                    onClick={async () => {
                      await handleConfirmComplete();
                    }}
                    className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isCompleting ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>,
          document.body
        )}
      </AnimatePresence>

      <CancelOrderModal
        open={showCancelModal}
        orderId={order ? order.id : null}
        onClose={() => setShowCancelModal(false)}
        onSuccess={(refundPending) => {
          setOrder(prev => prev ? {
            ...prev,
            status: refundPending ? 'refund_pending' : 'cancelled'
          } : null);
        }}
        role="buyer"
      />
    </div>
  );
}
