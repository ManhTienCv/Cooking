import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, MapPin, Phone, User, FileText, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCart } from '../../contexts/CartContext';
import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import { scrollWindowToTop } from '../../lib/scroll';

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function Checkout() {
  const { items, total, refresh } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    shipping_name: '',
    shipping_phone: '',
    shipping_address: '',
    payment_method: 'cod',
    note: '',
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }
    if (!form.shipping_name.trim() || !form.shipping_phone.trim() || !form.shipping_address.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin giao hàng');
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiJson<{ success: boolean; order_id: number; total_amount: number }>(
        '/api/marketplace/orders',
        { method: 'POST', body: JSON.stringify(form) }
      );
      await refresh();
      toast.success('Đặt hàng thành công!');
      navigate(`/orders/${result.order_id}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi đặt hàng');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Giỏ hàng trống</h2>
          <Link to="/shop" onClick={scrollWindowToTop} className="text-amber-600 dark:text-amber-400 hover:underline font-medium">← Về cửa hàng</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 transition-colors">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Reveal y={16}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-serif italic font-bold text-black dark:text-white">Thanh toán</h1>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="grid lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3 space-y-6">
            <Reveal y={12}>
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" /> Thông tin giao hàng
                </h3>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      <User className="w-3.5 h-3.5 inline mr-1" /> Họ tên người nhận *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.shipping_name}
                      onChange={set('shipping_name')}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 bg-white dark:bg-slate-800 text-black dark:text-white transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      <Phone className="w-3.5 h-3.5 inline mr-1" /> Số điện thoại *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.shipping_phone}
                      onChange={set('shipping_phone')}
                      placeholder="0912 345 678"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 bg-white dark:bg-slate-800 text-black dark:text-white transition-all"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 inline mr-1" /> Địa chỉ giao hàng *
                    </label>
                    <textarea
                      required
                      value={form.shipping_address}
                      onChange={set('shipping_address')}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 bg-white dark:bg-slate-800 text-black dark:text-white transition-all resize-none"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      <FileText className="w-3.5 h-3.5 inline mr-1" /> Ghi chú
                    </label>
                    <textarea
                      value={form.note}
                      onChange={set('note')}
                      placeholder="Ghi chú cho người bán (tùy chọn)"
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 bg-white dark:bg-slate-800 text-black dark:text-white transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal y={12} delay={0.06}>
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" /> Phương thức thanh toán
                </h3>
                <div className="space-y-3">
                  {[
                    { value: 'cod', label: 'Thanh toán khi nhận hàng (COD)', emoji: '💰' },
                    { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng', emoji: '🏦' },
                  ].map((pm) => (
                    <label
                      key={pm.value}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        form.payment_method === pm.value
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-500'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={pm.value}
                        checked={form.payment_method === pm.value}
                        onChange={set('payment_method')}
                        className="accent-amber-500"
                      />
                      <span className="text-xl">{pm.emoji}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{pm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Đơn hàng ({items.length} sp)</h3>

              <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4 pr-1">
                {items.map((item) => {
                  const price = item.product_sale_price ?? item.product_price;
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
                        {item.product_image ? (
                          <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 dark:text-white font-medium line-clamp-1">{item.product_name}</p>
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatPrice(price * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 dark:border-slate-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tạm tính</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vận chuyển</span>
                  <span className="text-green-600 font-medium">Miễn phí</span>
                </div>
                <div className="border-t border-gray-100 dark:border-slate-700 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Tổng</span>
                  <span className="text-xl font-extrabold text-red-600 dark:text-red-400">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-base hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-all shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting ? 'Đang đặt hàng...' : 'Xác nhận đặt hàng'}
              </button>

              <Link to="/cart" onClick={scrollWindowToTop} className="block text-center mt-3 text-sm text-gray-500 hover:text-amber-600 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Quay lại giỏ hàng
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
