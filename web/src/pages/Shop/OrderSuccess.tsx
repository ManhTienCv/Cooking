import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, Package, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Reveal } from '../../components/motion/ScrollReveal';
import { scrollWindowToTop } from '../../lib/scroll';

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get('orderId');
  const resultCode = searchParams.get('resultCode');
  const message = searchParams.get('message') || '';
  const amount = searchParams.get('amount');
  const transId = searchParams.get('transId');

  // resultCode === '0' hoặc không có param (chuyển trực tiếp từ order success thông thường)
  const isSuccess = !resultCode || resultCode === '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Reveal y={20}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-10 max-w-lg w-full text-center border border-gray-100 dark:border-slate-700/60 shadow-2xl space-y-6"
        >
          {isSuccess ? (
            <>
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full mx-auto flex items-center justify-center text-4xl shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> Thanh toán MoMo thành công
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 dark:text-white">
                  Đặt hàng thành công!
                </h1>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Cảm ơn bạn đã tin tưởng mua sắm tại Cooking Web. Đơn hàng đang được người bán chuẩn bị và giao nhanh qua GHN Express.
                </p>
              </div>

              {orderId && (
                <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Mã đơn hàng:</span>
                    <span className="font-bold text-gray-900 dark:text-white">#{orderId}</span>
                  </div>
                  {amount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Số tiền thanh toán:</span>
                      <span className="font-extrabold text-red-600 dark:text-red-400">
                        {formatPrice(Number(amount))}
                      </span>
                    </div>
                  )}
                  {transId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Mã giao dịch MoMo:</span>
                      <span className="font-mono text-xs text-gray-700 dark:text-slate-300">{transId}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 pt-2">
                {orderId && (
                  <Link
                    to={`/orders/${orderId}`}
                    onClick={scrollWindowToTop}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-85 transition shadow-lg"
                  >
                    <Package className="w-4 h-4" />
                    Xem chi tiết đơn hàng
                  </Link>
                )}

                <Link
                  to="/shop"
                  onClick={scrollWindowToTop}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Tiếp tục mua sắm
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full mx-auto flex items-center justify-center text-4xl shadow-inner">
                <XCircle className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 dark:text-white">
                  Thanh toán MoMo chưa hoàn tất
                </h1>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  {message || 'Giao dịch thanh toán đã bị hủy hoặc gặp sự cố từ cổng MoMo.'}
                </p>
              </div>

              {orderId && (
                <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Mã đơn hàng:</span>
                    <span className="font-bold text-gray-900 dark:text-white">#{orderId}</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Đơn hàng của bạn vẫn được lưu lại trong danh sách đơn hàng. Bạn có thể thanh toán lại bất cứ lúc nào.
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                {orderId && (
                  <Link
                    to={`/orders/${orderId}`}
                    onClick={scrollWindowToTop}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-85 transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Vào đơn hàng để thanh toán lại
                  </Link>
                )}

                <Link
                  to="/cart"
                  onClick={scrollWindowToTop}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                >
                  Quay lại Giỏ hàng
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </Reveal>
    </div>
  );
}
