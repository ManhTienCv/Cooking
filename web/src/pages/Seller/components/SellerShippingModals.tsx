import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Navigation, Calendar, Edit3, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson } from '../../../lib/api';

interface SellerShippingModalProps {
  open: boolean;
  orderId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SellerShippingModal({ open, orderId, onClose, onSuccess }: SellerShippingModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    carrier_name: 'Giao Hàng Nhanh (GHN)',
    tracking_number: '',
    estimated_days: 3,
  });

  useEffect(() => {
    if (open) {
      // Auto-generate a mock tracking number for ease of demo
      const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
      setForm({
        carrier_name: 'Giao Hàng Nhanh (GHN)',
        tracking_number: `COOK-${randomId}`,
        estimated_days: 3,
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    if (!form.carrier_name.trim()) {
      toast.error('Vui lòng chọn đơn vị vận chuyển.');
      return;
    }
    if (!form.tracking_number.trim()) {
      toast.error('Vui lòng nhập mã vận đơn.');
      return;
    }

    setLoading(true);
    try {
      await apiJson(`/api/marketplace/seller/orders/${orderId}/shipping`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Bắt đầu giao hàng thành công!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" /> Bắt đầu giao đơn #{orderId}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Đơn vị vận chuyển</label>
                <select
                  value={form.carrier_name}
                  onChange={(e) => setForm((f) => ({ ...f, carrier_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                >
                  <option value="Giao Hàng Nhanh (GHN)">Giao Hàng Nhanh (GHN)</option>
                  <option value="Giao Hàng Tiết Kiệm (GHTK)">Giao Hàng Tiết Kiệm (GHTK)</option>
                  <option value="Viettel Post">Viettel Post</option>
                  <option value="Self Shipping / Xe tải Shop">Self Shipping / Xe tải Shop</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mã vận đơn</label>
                <input
                  type="text"
                  value={form.tracking_number}
                  onChange={(e) => setForm((f) => ({ ...f, tracking_number: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  placeholder="Nhập mã vận đơn bưu cục"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" /> Số ngày giao dự kiến
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={form.estimated_days}
                  onChange={(e) => setForm((f) => ({ ...f, estimated_days: parseInt(e.target.value) || 3 }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Đang cập nhật...' : 'Giao hàng ngay'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

interface SellerTransitLogModalProps {
  open: boolean;
  orderId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SellerTransitLogModal({ open, orderId, onClose, onSuccess }: SellerTransitLogModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    status: 'in_transit' as 'in_transit' | 'arrived_hub' | 'out_for_delivery' | 'delayed' | 'delivered',
    current_location: '',
    description: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        status: 'in_transit',
        current_location: 'Kho trung chuyển HN-01',
        description: 'Đơn hàng đã đến kho phân loại trung tâm.',
      });
    }
  }, [open]);

  // Adjust description automatically depending on selected status for smoother demo gesticulation
  const handleStatusChange = (newStatus: typeof form.status) => {
    let loc = form.current_location;
    let desc = form.description;

    if (newStatus === 'arrived_hub') {
      loc = 'Kho Phân Loại Cầu Giấy';
      desc = 'Đơn hàng đã nhập kho và chuẩn bị phân tuyến chuyển tiếp.';
    } else if (newStatus === 'out_for_delivery') {
      loc = 'Bưu cục Giao Hàng';
      desc = 'Shipper đang trên đường giao hàng đến địa chỉ người nhận.';
    } else if (newStatus === 'delayed') {
      loc = 'Tuyến Vận Chuyển Liên Tỉnh';
      desc = 'Thời tiết xấu khiến tiến độ vận chuyển chậm hơn dự kiến.';
    } else if (newStatus === 'delivered') {
      loc = 'Địa chỉ khách hàng';
      desc = 'Giao hàng thành công. Người nhận đã ký tên xác nhận.';
    } else if (newStatus === 'in_transit') {
      loc = 'Kho trung chuyển HN-01';
      desc = 'Đơn hàng đang di chuyển trung chuyển qua các bưu cục.';
    }

    setForm((f) => ({ ...f, status: newStatus, current_location: loc, description: desc }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    if (!form.current_location.trim()) {
      toast.error('Vui lòng điền địa điểm bưu cục hiện tại.');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Vui lòng điền chi tiết trạng thái.');
      return;
    }

    setLoading(true);
    try {
      await apiJson(`/api/marketplace/seller/orders/${orderId}/transit-logs`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Cập nhật lộ trình bưu cục thành công!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Navigation className="w-5 h-5 text-amber-500 animate-pulse" /> Lộ trình bưu cục đơn #{orderId}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mốc sự kiện vận chuyển</label>
                <select
                  value={form.status}
                  onChange={(e) => handleStatusChange(e.target.value as 'in_transit' | 'arrived_hub' | 'out_for_delivery' | 'delayed' | 'delivered')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                >
                  <option value="in_transit">Đang trung chuyển (In transit)</option>
                  <option value="arrived_hub">Đã đến Kho phân loại (Arrived hub)</option>
                  <option value="out_for_delivery">Shipper đang giao hàng (Out for delivery)</option>
                  <option value="delayed">⚠️ Trễ hạn giao hàng (Delayed)</option>
                  <option value="delivered">✅ Giao thành công (Delivered)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <Edit3 className="w-4 h-4 text-gray-400" /> Bưu cục / Vị trí hiện tại
                </label>
                <input
                  type="text"
                  value={form.current_location}
                  onChange={(e) => setForm((f) => ({ ...f, current_location: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  placeholder="Ví dụ: Kho trung chuyển Hà Nội 01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mô tả hành trình</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
                  placeholder="Ví dụ: Đơn hàng đã rời bưu cục Cầu Giấy..."
                />
              </div>

              {form.status === 'delayed' && (
                <div className="p-3.5 bg-orange-50 dark:bg-amber-950/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800 dark:text-orange-300 font-medium">
                    Hệ thống sẽ kích hoạt bồi thường tự động (chính sách voucher đền bù trễ hạn) cho khách hàng khi bạn cập nhật trạng thái này.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Đang cập nhật...' : 'Cập nhật lộ trình'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
