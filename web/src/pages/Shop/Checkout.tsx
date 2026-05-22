import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, CreditCard, MapPin, Phone, User, FileText, ArrowLeft, CheckCircle, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCart } from '../../contexts/CartContext';
import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import { scrollWindowToTop } from '../../lib/scroll';
import { loadProfilePreferences, saveProfilePreferences, type LinkedBankAccount, type SavedAddress } from '../../lib/profilePreferences';
import { AUTH_CHANGE_EVENT, getAuthChangeDetail } from '../../lib/authEvents';

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function Checkout() {
  const { items, total, refresh } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [linkedBanks, setLinkedBanks] = useState<LinkedBankAccount[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [form, setForm] = useState({
    shipping_name: '',
    shipping_phone: '',
    shipping_address: '',
    payment_method: 'cod',
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

  const selectAddress = useCallback((address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setForm((f) => ({
      ...f,
      shipping_name: address.name,
      shipping_phone: address.phone,
      shipping_address: address.address,
    }));
  }, []);

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

    setSubmitting(true);
    try {
      const result = await apiJson<{ success: boolean; order_id: number; total_amount: number }>(
        '/api/marketplace/orders',
        { method: 'POST', body: JSON.stringify(form) }
      );

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
                    { value: 'cookpay', label: 'Ví Cook', emoji: '🪙' },
                    { value: 'cod', label: 'Thanh toán khi nhận hàng (COD)', emoji: '💰' },
                    { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng', emoji: '🏦' },
                    { value: 'qr', label: 'Thanh toán qua mã QR', emoji: '📱' },
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
                  {form.payment_method === 'qr' && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-6 text-center dark:border-amber-900/40 dark:bg-amber-900/10">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-3">Quét mã QR để thanh toán trực tiếp</p>
                      <div className="bg-white p-2 rounded-xl inline-block shadow-sm">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PAYMENT_${total}`} alt="QR Code" className="w-32 h-32" />
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">Mã QR chứa sẵn số tiền cần thanh toán. Hệ thống sẽ tự động xác nhận sau khi chuyển khoản thành công.</p>
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
                  <span className="text-gray-500">Vận chuyển</span>
                  <span className="text-green-600 font-medium">Miễn phí</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Dự kiến nhận hàng</span>
                  <span className="text-gray-900 dark:text-gray-300 font-medium">2 - 3 ngày</span>
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
