import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, User, CreditCard, Package, CheckCircle, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import { apiFetch, apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import { scrollWindowToTop } from '../../lib/scroll';
import type { Order, OrderItem } from '../../types/marketplace';

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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiJson<{ order: Order & { items: OrderItem[] } }>(`/api/marketplace/orders/${id}`)
      .then((d) => setOrder(d.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

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

  const isCancelled = order.status === 'cancelled';
  const stepIndex = isCancelled ? -1 : STATUS_STEPS.findIndex((s) => s.key === order.status);
  const canReview = ['delivered', 'completed'].includes(order.status);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 transition-colors">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/orders" onClick={scrollWindowToTop} className="text-sm text-gray-500 hover:text-black dark:hover:text-white inline-flex items-center gap-1 mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Đơn hàng
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Đơn hàng #{order.id}
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {new Date(order.created_at).toLocaleString('vi-VN')}
          </p>
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
          </div>
        </Reveal>

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
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 flex justify-between">
              <span className="font-bold text-gray-900 dark:text-white">Tổng cộng</span>
              <span className="text-xl font-extrabold text-red-600 dark:text-red-400">{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </Reveal>

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
                <CreditCard className="w-3.5 h-3.5" /> {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng'}
              </p>
              {order.note && (
                <p className="text-gray-500 dark:text-gray-500 italic mt-2">📝 {order.note}</p>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
