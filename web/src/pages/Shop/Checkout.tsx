import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Building2, CreditCard, MapPin, Phone, User, FileText, ArrowLeft, CheckCircle, Wallet, Clock, Truck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCart } from '../../contexts/CartContext';
import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import { scrollWindowToTop } from '../../lib/scroll';
import { loadProfilePreferences, saveProfilePreferences, type LinkedBankAccount, type SavedAddress } from '../../lib/profilePreferences';
import { AUTH_CHANGE_EVENT, getAuthChangeDetail } from '../../lib/authEvents';
import { useCheckoutTimer } from '../../hooks/useCheckoutTimer';
import { MapAddressModal, type SelectedMapAddress } from '../../components/common/MapAddressModal';

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function Checkout() {
  const { items: allCartItems, refresh } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Bộ đếm 20 phút giữ chỗ đơn hàng (tự reset khi về giỏ hàng, giữ nguyên khi chuyển bước)
  const {
    formatted: timerFormatted,
    percentage: timerPercentage,
    isUrgent: timerIsUrgent,
    isExpired: timerIsExpired,
  } = useCheckoutTimer(() => {
    toast.error('⏰ Đã hết thời gian giữ đơn hàng (20 phút). Đang đưa về giỏ hàng...');
    setTimeout(() => {
      navigate('/cart', { replace: true });
    }, 2000);
  });

  const state = location.state as { cartItemIds?: number[] } | null;
  const cartItemIds = useMemo(() => state?.cartItemIds || [], [state]);

  const items = useMemo(() => {
    if (cartItemIds.length > 0) {
      return allCartItems.filter((item) => cartItemIds.includes(item.id));
    }
    return allCartItems;
  }, [allCartItems, cartItemIds]);

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = item.product_sale_price ?? item.product_price;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const [submitting, setSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [linkedBanks, setLinkedBanks] = useState<LinkedBankAccount[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // GHN & Map states
  const [shippingFee, setShippingFee] = useState(0);
  const [toDistrictId, setToDistrictId] = useState<number | null>(null);
  const [toWardCode, setToWardCode] = useState<string | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'standard' | 'instant_1h'>('standard');
  const instantShippingFee = total >= 300000 ? 0 : 35000;
  const effectiveShippingFee = deliveryType === 'instant_1h' ? instantShippingFee : (shippingFee || 29000);

  const [form, setForm] = useState({
    shipping_name: '',
    shipping_phone: '',
    shipping_address: '',
    payment_method: 'momo',
    note: '',
  });

  const isCheckoutPhoneInvalid = form.shipping_phone.trim() !== '' && !/^[0-9]{10}$/.test(form.shipping_phone.trim());

  const set = useCallback((key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value })), []);

  const loadMe = useCallback(async () => {
    try {
      const me = await apiJson<{ authenticated: boolean; user?: { email: string; full_name?: string } }>('/api/auth/me');
      let prefs = loadProfilePreferences(me.user?.email);

      // Đồng bộ ví Cook
      try {
        const walletBanks = await apiJson<{ accounts?: { id: string; bank_name: string; account_number: string; account_name: string; is_default: boolean }[] }>('/api/ewallet/banks');
        if (walletBanks && Array.isArray(walletBanks.accounts)) {
          let updated = false;
          walletBanks.accounts.forEach((acc) => {
            const match = prefs.banks.find(
              (b) =>
                b.bankName.toLowerCase() === acc.bank_name.toLowerCase() &&
                (b.accountNumber.replace(/\s+/g, '') === acc.account_number.replace(/\s+/g, '') ||
                 b.accountNumber.replace(/\s+/g, '').endsWith(acc.account_number.replace(/\s+/g, '').slice(-4)) ||
                 acc.account_number.replace(/\s+/g, '').endsWith(b.accountNumber.replace(/\s+/g, '').slice(-4)))
            );
            if (!match) {
              prefs.banks.push({
                id: String(acc.id),
                bankName: acc.bank_name,
                accountName: acc.account_name,
                accountNumber: acc.account_number,
                isDefault: acc.is_default,
              });
              updated = true;
            } else {
              if (match.isDefault !== acc.is_default) {
                match.isDefault = acc.is_default;
                updated = true;
              }
            }
          });
          if (updated) {
            saveProfilePreferences(me.user?.email, prefs);
            prefs = loadProfilePreferences(me.user?.email);
          }
        }
      } catch {
        // ignore
      }

      setSavedAddresses(prefs.addresses);
      setLinkedBanks(prefs.banks);

      const defaultAddress = prefs.addresses.find((item) => item.isDefault) ?? prefs.addresses[0];
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setForm((f) => ({
          ...f,
          shipping_name: defaultAddress.name,
          shipping_phone: defaultAddress.phone,
          shipping_address: defaultAddress.address,
        }));
      } else if (me.user?.full_name) {
        setForm((f) => ({ ...f, shipping_name: f.shipping_name || me.user?.full_name || '' }));
      }

      const defaultBank = prefs.banks.find((item) => item.isDefault) ?? prefs.banks[0];
      if (defaultBank) setSelectedBankId(defaultBank.id);
    } catch {
      // ignore
    }
    // Fetch CookPay balance
    try {
      const wal = await apiJson<{ wallet: { balance: string } }>('/api/ewallet/me');
      setWalletBalance(Number(wal.wallet.balance));
    } catch {
      setWalletBalance(null);
    }
  }, []);

  useEffect(() => {
    void loadMe();
    
    const onAuthChange = (event: Event) => {
      const detail = getAuthChangeDetail(event);
      if (detail.authenticated === false) {
        setSavedAddresses([]);
        setLinkedBanks([]);
        setSelectedAddressId('');
        setSelectedBankId('');
        return;
      }
      void loadMe();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChange);
  }, [loadMe]);

  const calculateGhnShippingFee = useCallback(async (districtId: number, wardCode: string) => {
    try {
      const feeRes = await apiJson<{ success: boolean; data: { total: number } }>('/api/marketplace/shipping/ghn/fee', {
        method: 'POST',
        body: JSON.stringify({
          to_district_id: districtId,
          to_ward_code: wardCode,
          weight: 500,
          insurance_value: total,
        }),
      });
      if (feeRes.data?.total) {
        setShippingFee(feeRes.data.total);
        toast.success(`Cập nhật cước vận chuyển GHN: ${feeRes.data.total.toLocaleString('vi-VN')}đ`);
      }
    } catch {
      setShippingFee(29000);
    }
  }, [total]);

  const selectAddress = useCallback((address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setForm((f) => ({
      ...f,
      shipping_name: address.name,
      shipping_phone: address.phone,
      shipping_address: address.address,
    }));
    // Mặc định cước GHN cơ bản khi chọn địa chỉ lưu
    setShippingFee(29000);
  }, []);

  const handleMapSelectAddress = useCallback(async (data: SelectedMapAddress) => {
    setForm((f) => ({ ...f, shipping_address: data.fullAddress }));
    setSelectedAddressId('');

    if (data.ghnDistrictId) {
      setToDistrictId(data.ghnDistrictId);
      const wardCode = data.ghnWardCode || '20101';
      setToWardCode(wardCode);
      void calculateGhnShippingFee(data.ghnDistrictId, wardCode);
    } else {
      setShippingFee(29000);
    }
  }, [calculateGhnShippingFee]);

  const onSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }
    if (!form.shipping_name.trim() || !form.shipping_phone.trim() || !form.shipping_address.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin giao hàng');
      return;
    }
    const phoneVal = form.shipping_phone.trim();
    if (!/^[0-9]{10}$/.test(phoneVal)) {
      toast.error('Số điện thoại phải bao gồm đúng 10 chữ số và không chứa ký tự khác.');
      return;
    }
    if (form.payment_method === 'bank_transfer' && linkedBanks.length > 0 && !selectedBankId) {
      toast.error('Vui lòng chọn tài khoản ngân hàng liên kết');
      return;
    }

    const refRecipeId = Number(sessionStorage.getItem('cook_ref_recipe_id')) || undefined;

    setSubmitting(true);
    try {
      const result = await apiJson<{ success: boolean; order_id: number; total_amount: number }>(
        '/api/marketplace/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            shipping_fee: effectiveShippingFee,
            to_district_id: toDistrictId,
            to_ward_code: toWardCode,
            delivery_type: deliveryType,
            ref_recipe_id: refRecipeId,
            cart_item_ids: cartItemIds.length > 0 ? cartItemIds : undefined,
          }),
        }
      );

      // Nếu thanh toán bằng MoMo Sandbox
      if (form.payment_method === 'momo') {
        try {
          const momoRes = await apiJson<{ success: boolean; payUrl?: string; message?: string }>(
            `/api/marketplace/orders/${result.order_id}/momo`,
            { method: 'POST' }
          );
          if (momoRes.payUrl) {
            await refresh();
            toast.success('Đang chuyển sang cổng thanh toán MoMo...');
            window.location.href = momoRes.payUrl;
            return;
          }
        } catch (momoErr) {
          toast.error(momoErr instanceof Error ? momoErr.message : 'Lỗi khởi tạo thanh toán MoMo');
          navigate('/orders/' + result.order_id, { replace: true });
          return;
        }
      }

      // If paying with CookPay, call pay-order API
      if (form.payment_method === 'cookpay') {
        try {
          await apiJson('/api/ewallet/pay-order', {
            method: 'POST',
            body: JSON.stringify({ orderId: result.order_id }),
          });
          toast.success('Thanh toán thành công bằng Ví Cook!');
        } catch (payErr) {
          toast.error(payErr instanceof Error ? payErr.message : 'Lỗi thanh toán Ví Cook. Đơn hàng đã tạo, vui lòng thanh toán lại.');
        }
      }

      await refresh();
      sessionStorage.removeItem('cook_ref_recipe_id');
      toast.success('Đặt hàng thành công!');
      navigate('/orders/' + result.order_id, { replace: true });
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
        {/* 20-Minute Order Holding Countdown */}
        <Reveal y={12}>
          <div
            className={`mb-8 rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${
              timerIsUrgent
                ? 'border-red-300 bg-red-50/90 dark:border-red-900/60 dark:bg-red-950/30 text-red-900 dark:text-red-200'
                : 'border-amber-200/90 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  timerIsUrgent
                    ? 'bg-red-200 dark:bg-red-900/60 text-red-700 dark:text-red-300 animate-pulse'
                    : 'bg-amber-200/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Thời gian giữ đơn hàng:</span>
                  <span className="font-mono text-base sm:text-lg font-extrabold tracking-tight">{timerFormatted}</span>
                </div>
                <p className="text-xs opacity-80 mt-0.5">
                  {timerIsUrgent
                    ? '⚠️ Sắp hết 20 phút giữ chỗ các sản phẩm trong giỏ. Vui lòng hoàn tất đặt hàng!'
                    : 'Giỏ hàng & đơn thanh toán được bảo lưu tự động trong 20 phút.'}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-44 space-y-1">
              <div className="w-full h-2.5 bg-gray-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 rounded-full ${
                    timerIsUrgent ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${timerPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </Reveal>

        {/* Timeout modal if 20 mins expire */}
        {timerIsExpired && (
          <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 border border-red-200 dark:border-red-900/50 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center text-3xl">
                ⏰
              </div>
              <h3 className="text-xl font-bold text-gray-950 dark:text-white">Hết thời gian giữ đơn hàng!</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Đã hết hạn 20 phút giữ chỗ các sản phẩm. Hệ thống sẽ chuyển bạn về giỏ hàng để cập nhật trạng thái mới nhất.
              </p>
              <Link
                to="/cart"
                onClick={scrollWindowToTop}
                className="inline-block w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-85 transition"
              >
                Quay lại Giỏ hàng
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={onSubmitOrder} className="grid lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3 space-y-6">
            <Reveal y={12}>
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" /> Thông tin giao hàng
                </h3>

                <div className="space-y-4">
                  {savedAddresses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Địa chỉ đã lưu</p>
                      {savedAddresses.map((address) => (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => selectAddress(address)}
                          className={`w-full rounded-xl border p-4 text-left transition-all ${
                            selectedAddressId === address.id
                              ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/10'
                              : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'
                          }`}
                        >
                          <span className="block text-sm font-bold text-gray-900 dark:text-white">
                            {address.name} <span className="font-normal text-gray-400">| {address.phone}</span>
                          </span>
                          <span className="mt-1 block text-sm text-gray-500 dark:text-slate-400">{address.address}</span>
                          {address.isDefault && <span className="mt-2 inline-flex rounded border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-500">Mặc định</span>}
                        </button>
                      ))}
                    </div>
                  )}

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
                      onChange={(e) => setForm((f) => ({ ...f, shipping_phone: e.target.value }))}
                      placeholder="0912345678"
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all ${
                        isCheckoutPhoneInvalid
                          ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-white dark:bg-slate-800 text-black dark:text-white'
                          : 'border-gray-200 dark:border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 bg-white dark:bg-slate-800 text-black dark:text-white'
                      }`}
                    />
                    {isCheckoutPhoneInvalid && (
                      <p className="mt-1 text-xs text-red-500 font-semibold">
                        Số điện thoại phải có đúng 10 số và không chứa ký tự.
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <MapPin className="w-3.5 h-3.5 inline mr-1" /> Địa chỉ giao hàng *
                      </label>
                      <button
                        type="button"
                        onClick={() => setMapModalOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Chọn từ Bản đồ (Maps & GPS)
                      </button>
                    </div>
                    <textarea
                      required
                      value={form.shipping_address}
                      onChange={set('shipping_address')}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 bg-white dark:bg-slate-800 text-black dark:text-white transition-all resize-none"
                    />
                  </div>

                  {/* Phương thức vận chuyển */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                      Phương thức vận chuyển
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Tiêu chuẩn */}
                      <button
                        type="button"
                        onClick={() => setDeliveryType('standard')}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          deliveryType === 'standard'
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-500 shadow-sm'
                            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-bold text-gray-900 dark:text-white">Tiêu chuẩn (GHN)</span>
                          </div>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {shippingFee > 0 ? formatPrice(shippingFee) : '29.000đ'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Giao toàn quốc 2 - 3 ngày bởi GHN Express
                        </p>
                      </button>

                      {/* Hỏa tốc trong 1-2 giờ */}
                      <button
                        type="button"
                        onClick={() => setDeliveryType('instant_1h')}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          deliveryType === 'instant_1h'
                            ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-500 shadow-sm'
                            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-bold text-gray-900 dark:text-white">Hỏa tốc 1 - 2 Giờ</span>
                          </div>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                            {total >= 300000 ? 'MIỄN PHÍ' : '35.000đ'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Giao siêu tốc 60-90p cho thực phẩm tươi sống
                        </p>
                      </button>
                    </div>
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
                    { value: 'momo', label: 'Ví MoMo (Cổng MoMo Sandbox)', emoji: '👛', badge: 'Khuyên dùng' },
                    { value: 'cookpay', label: 'Ví Cook', emoji: '🪙' },
                    { value: 'cod', label: 'Thanh toán khi nhận hàng (COD)', emoji: '💰' },
                    { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng', emoji: '🏦' },
                  ].map((pm) => (
                    <label
                      key={pm.value}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        form.payment_method === pm.value
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-500'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
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
                      </div>
                      {pm.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                          {pm.badge}
                        </span>
                      )}
                    </label>
                  ))}

                  {form.payment_method === 'momo' && (
                    <div className="rounded-xl border border-pink-200 bg-pink-50/70 p-4 dark:border-pink-900/40 dark:bg-pink-900/10">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          MoMo
                        </div>
                        <div>
                          <p className="text-sm font-bold text-pink-900 dark:text-pink-200">Cổng thanh toán MoMo Sandbox</p>
                          <p className="text-xs text-pink-800 dark:text-pink-300 mt-1 leading-relaxed">
                            Sau khi bấm "Xác nhận đặt hàng", hệ thống sẽ chuyển hướng bạn sang cổng MoMo an toàn để quét mã QR hoặc đăng nhập tài khoản MoMo.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {form.payment_method === 'cookpay' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          <Wallet className="h-4 w-4" /> Số dư Ví Cook
                        </div>
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                          {walletBalance !== null ? walletBalance.toLocaleString('vi-VN') + 'đ' : '---'}
                        </span>
                      </div>
                      {walletBalance !== null && walletBalance < total && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">Số dư không đủ. Vui lòng <a href="/wallet" className="font-bold underline">nạp thêm</a>.</p>
                      )}
                      {walletBalance !== null && walletBalance >= total && (
                        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">✓ Đủ số dư. Đơn hàng sẽ được xác nhận tự động sau thanh toán.</p>
                      )}
                    </div>
                  )}
                  {form.payment_method === 'bank_transfer' && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300">
                        <Building2 className="h-4 w-4" /> Ngân hàng liên kết
                      </div>
                      {linkedBanks.length === 0 ? (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-gray-600 dark:text-slate-300">Bạn chưa liên kết tài khoản ngân hàng.</p>
                          <Link to="/profile?tab=settings&settings=banks" className="shrink-0 text-sm font-semibold text-blue-600 hover:underline">
                            Thêm trong hồ sơ
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {linkedBanks.map((bank) => (
                            <label
                              key={bank.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                                selectedBankId === bank.id
                                    ? 'border-blue-400 bg-white dark:border-blue-500 dark:bg-slate-800'
                                    : 'border-transparent bg-white/70 dark:bg-slate-800/60'
                              }`}
                            >
                              <input
                                type="radio"
                                name="linked_bank"
                                checked={selectedBankId === bank.id}
                                onChange={() => setSelectedBankId(bank.id)}
                                className="accent-blue-500"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{bank.bankName}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                  {bank.accountName} · **** {bank.accountNumber.replace(/\s+/g, '').slice(-4)}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
                  <span className="text-gray-500">
                    Phí vận chuyển ({deliveryType === 'instant_1h' ? 'Hỏa tốc' : 'GHN'})
                  </span>
                  <span className={effectiveShippingFee > 0 ? "font-medium text-gray-900 dark:text-white" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                    {effectiveShippingFee > 0 ? formatPrice(effectiveShippingFee) : 'Miễn phí'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Dự kiến nhận hàng</span>
                  <span className="text-gray-900 dark:text-gray-300 font-medium">
                    {deliveryType === 'instant_1h' ? '⚡ 60 - 90 phút hôm nay' : '2 - 3 ngày (GHN Express)'}
                  </span>
                </div>
                <div className="border-t border-gray-100 dark:border-slate-700 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Tổng thanh toán</span>
                  <span className="text-xl font-extrabold text-red-600 dark:text-red-400">{formatPrice(total + effectiveShippingFee)}</span>
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

      <MapAddressModal
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        initialAddress={form.shipping_address}
        onSelectAddress={handleMapSelectAddress}
      />
    </div>
  );
}
