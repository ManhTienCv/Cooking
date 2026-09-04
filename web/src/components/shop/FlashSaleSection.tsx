import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Sparkles, Timer, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../contexts/CartContext';
import ImageWithFallback from '../../lib/ImageWithFallback';
import type { Product } from '../../types/marketplace';

interface Props {
  products: Product[];
}

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

const SESSIONS = [
  { id: 'morning', startH: 9, endH: 12, label: '09:00', title: 'Chợ Sáng Tươi Ngon' },
  { id: 'afternoon', startH: 14, endH: 17, label: '14:00', title: 'Trà Chiều & Bánh Ngọt' },
  { id: 'evening', startH: 18, endH: 21, label: '18:00', title: 'Tiệc Tối & Đồ Bếp Xịn' },
];

export default function FlashSaleSection({ products }: Props) {
  const { addItem } = useCart();
  const [addingId, setAddingId] = useState<number | null>(null);

  // Xác định khung giờ hiện tại
  const currentHour = new Date().getHours();

  const activeSessionIndex = useMemo(() => {
    const idx = SESSIONS.findIndex((s) => currentHour >= s.startH && currentHour < s.endH);
    return idx !== -1 ? idx : 0;
  }, [currentHour]);

  const [selectedSession, setSelectedSession] = useState(activeSessionIndex);

  // Đếm ngược thời gian kết thúc phiên hiện tại
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 1,
    minutes: 45,
    seconds: 30,
  });

  useEffect(() => {
    const session = SESSIONS[selectedSession];
    const updateCountdown = () => {
      const now = new Date();
      let target = new Date();
      target.setHours(session.endH, 0, 0, 0);

      if (now > target) {
        target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
      }

      const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedSession]);

  // Lọc các sản phẩm có giảm giá hoặc ưu đãi
  const dealProducts = useMemo(() => {
    const discounted = products.filter((p) => p.sale_price != null && p.sale_price < p.price);
    if (discounted.length >= 4) return discounted.slice(0, 6);
    return products.slice(0, 6);
  }, [products]);

  const handleQuickAdd = async (product: Product) => {
    setAddingId(product.id);
    try {
      await addItem(product.id, 1);
      toast.success(`Đã thêm deal "${product.name}" vào giỏ!`);
    } catch {
      toast.error('Lỗi khi thêm vào giỏ');
    } finally {
      setAddingId(null);
    }
  };

  if (dealProducts.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-amber-500/10 dark:from-amber-950/20 dark:via-slate-900/60 dark:to-orange-950/20 p-5 md:p-7 border border-amber-200/80 dark:border-amber-500/20 shadow-xl shadow-amber-500/5 mb-10 backdrop-blur-md">
      {/* Header Giờ Vàng Ẩm Thực */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-amber-200/60 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-300/40 dark:border-amber-500/30 shadow-inner">
            <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-serif italic font-bold text-slate-900 dark:text-white">
                Giờ Vàng Ẩm Thực
              </h2>
              <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-500/30">
                <Timer className="w-3.5 h-3.5" /> Phiên Độc Quyền
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              {SESSIONS[selectedSession].title} · Đặc quyền thực phẩm tươi & đồ bếp tuyển chọn
            </p>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 border border-amber-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-2xl shadow-sm self-start sm:self-auto">
          <Clock className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kết thúc trong:</span>
          <div className="flex items-center gap-1 font-mono font-black text-sm text-amber-600 dark:text-amber-400">
            <span className="bg-amber-50 dark:bg-slate-700 border border-amber-200/60 dark:border-slate-600 px-2 py-0.5 rounded-lg shadow-inner">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span>:</span>
            <span className="bg-amber-50 dark:bg-slate-700 border border-amber-200/60 dark:border-slate-600 px-2 py-0.5 rounded-lg shadow-inner">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span>:</span>
            <span className="bg-amber-50 dark:bg-slate-700 border border-amber-200/60 dark:border-slate-600 px-2 py-0.5 rounded-lg shadow-inner">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Khung giờ tabs */}
      <div className="flex items-center gap-2.5 mt-5 overflow-x-auto pb-2 scrollbar-none">
        {SESSIONS.map((s, idx) => {
          const isCurrent = idx === activeSessionIndex;
          const isSelected = idx === selectedSession;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSession(idx)}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-2xl text-center transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-md'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-amber-100/70 dark:border-slate-750 hover:bg-white'
              }`}
            >
              <div className="text-sm font-black">{s.label}</div>
              <div className="text-[10px] font-bold opacity-80">
                {isCurrent ? '⚡ Đang diễn ra' : idx < activeSessionIndex ? 'Đã kết thúc' : 'Sắp diễn ra'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-5">
        {dealProducts.map((p, idx) => {
          const actualPrice = p.sale_price ?? Math.round(p.price * 0.85);
          const discountPercent = Math.max(10, Math.round(((p.price - actualPrice) / p.price) * 100));
          const soldPercent = Math.min(92, 58 + (idx * 7) % 35);

          return (
            <div
              key={p.id}
              className="group relative flex flex-col justify-between bg-white/95 dark:bg-slate-850/90 border border-amber-100/80 dark:border-slate-750 rounded-2xl p-3 hover:shadow-xl hover:border-amber-300 dark:hover:border-amber-500/40 transition-all duration-300"
            >
              <div>
                {/* Image & Discount Badge */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-750 mb-2.5">
                  <Link to={`/shop/product/${p.slug}`}>
                    <ImageWithFallback
                      src={p.image_url || ''}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                    -{discountPercent}%
                  </div>
                </div>

                {/* Title & Price */}
                <Link
                  to={`/shop/product/${p.slug}`}
                  className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  {p.name}
                </Link>

                <div className="mt-2 flex flex-col">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                    {formatPrice(actualPrice)}
                  </span>
                  <span className="text-[10px] text-slate-400 line-through">
                    {formatPrice(p.price)}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Add to Cart Button */}
              <div className="mt-3">
                <div className="relative w-full h-3 bg-amber-100/70 dark:bg-slate-700/80 rounded-full overflow-hidden mb-2">
                  <div
                    className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                    style={{ width: `${soldPercent}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-extrabold text-amber-950 dark:text-amber-100 uppercase tracking-wider">
                    ĐÃ BÁN {soldPercent}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickAdd(p)}
                  disabled={addingId === p.id}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <ShoppingCart className="w-3 h-3" />
                  {addingId === p.id ? 'Đang thêm...' : 'Mua ngay'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
