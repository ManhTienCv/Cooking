import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Store, Package, ShoppingBag, Plus, Trash2, Eye, TrendingUp, Pencil, Settings, CheckCircle, MessageCircle, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson, apiFetch } from '../../lib/api';
import CreateProductModal, { type EditingProduct } from './CreateProductModal';
import { NotificationProvider } from '../../contexts/NotificationContext';
import NotificationBell from '../../components/ui/NotificationBell';
import Pagination from '../../components/ui/Pagination';
import { AUTH_CHANGE_EVENT, getAuthChangeDetail } from '../../lib/authEvents';
import { SellerShippingModal, SellerTransitLogModal } from './components/SellerShippingModals';
import CancelOrderModal from '../../components/CancelOrderModal';

interface SellerProduct {
  id: number; name: string; slug: string; price: number; sale_price: number | null;
  status: string; stock: number; total_sold: number; image_url: string | null;
  category_name: string; product_type: string; created_at: string;
  description: string | null; category_id: number; unit: string; specs: Record<string, string>;
}
interface SellerOrder {
  id: number; buyer_id: number; total_amount: number; status: string; shipping_name: string;
  created_at: string; items: { product_name: string; quantity: number }[];
  is_fast_food_only?: boolean;
}
interface SellerProfile {
  id: number;
  user_id: number;
  store_name: string;
  store_description: string | null;
  is_verified: boolean;
  phone: string | null;
  address: string | null;
  full_name: string;
}
interface SellerStats {
  total_products: number;
  total_sold: number;
  total_orders: number;
  total_revenue: number;
}

function formatPrice(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }
function isNotSellerError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('bạn chưa đăng ký bán hàng') ||
    message.includes('ban chua dang ky ban hang')
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt', approved: 'Đang bán', rejected: 'Bị từ chối',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ORDER_STATUS_STEPS = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Xác nhận' },
  { key: 'preparing', label: 'Chuẩn bị' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'completed', label: 'Hoàn thành' },
];

function ConfirmOrderButton({ createdAt, onClick }: { createdAt: string; onClick: () => void }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diffMs = (2 * 60 * 1000) - (Date.now() - new Date(createdAt).getTime());
      return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [createdAt]);

  if (timeLeft > 0) {
    return (
      <button
        disabled
        className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 font-semibold py-1.5 px-3 rounded-lg cursor-not-allowed"
      >
        Chờ xác nhận ({timeLeft}s)
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors"
    >
      Xác nhận đơn
    </button>
  );
}

export default function SellerDashboard() {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notSeller, setNotSeller] = useState(false);
  const [regForm, setRegForm] = useState({ store_name: '', store_description: '', phone: '', address: '' });
  const [registering, setRegistering] = useState(false);

  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [shippingOrderId, setShippingOrderId] = useState<number | null>(null);
  const [transitOrderId, setTransitOrderId] = useState<number | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);

  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const PRODUCT_PAGE_SIZE = 10;
  const ORDER_PAGE_SIZE = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await apiJson<{ profile: SellerProfile | null, stats?: SellerStats | null }>('/api/marketplace/seller/profile');
      if (!p.profile) {
        setNotSeller(true);
        setProfile(null);
        setProducts([]);
        setOrders([]);
        setProductTotal(0);
        setOrderTotal(0);
        return;
      }
      setNotSeller(false);
      setProfile(p.profile);
      if (p.stats) setStats(p.stats);
      
      const [prodsResult, ordsResult] = await Promise.allSettled([
        apiJson<{ products: SellerProduct[], total: number }>(`/api/marketplace/seller/products?limit=${PRODUCT_PAGE_SIZE}&offset=${(productPage - 1) * PRODUCT_PAGE_SIZE}`),
        apiJson<{ orders: SellerOrder[], total: number }>(`/api/marketplace/seller/orders?limit=${ORDER_PAGE_SIZE}&offset=${(orderPage - 1) * ORDER_PAGE_SIZE}`),
      ]);

      if (prodsResult.status === 'fulfilled') {
        setProducts(prodsResult.value.products ?? []);
        setProductTotal(prodsResult.value.total ?? 0);
      } else if (isNotSellerError(prodsResult.reason)) {
        setNotSeller(true);
        setProfile(null);
      } else {
        setProducts([]);
        setProductTotal(0);
      }

      if (ordsResult.status === 'fulfilled') {
        setOrders(ordsResult.value.orders ?? []);
        setOrderTotal(ordsResult.value.total ?? 0);
      } else if (isNotSellerError(ordsResult.reason)) {
        setNotSeller(true);
        setProfile(null);
      } else {
        setOrders([]);
        setOrderTotal(0);
      }
    } catch (error) {
      if (isNotSellerError(error)) {
        setNotSeller(true);
        setProfile(null);
        setProducts([]);
        setOrders([]);
        setProductTotal(0);
        setOrderTotal(0);
      } else {
        setNotSeller(true);
      }
    }
    finally { setLoading(false); }
  }, [productPage, orderPage]);

  useEffect(() => { 
    void loadData(); 
    
    const onAuthChange = (event: Event) => {
      const detail = getAuthChangeDetail(event);
      if (detail.authenticated === false) {
        setNotSeller(true);
        setProfile(null);
        setProducts([]);
        setOrders([]);
        setProductTotal(0);
        setOrderTotal(0);
        setStats(null);
        setLoading(false);
        return;
      }
      void loadData();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChange);
  }, [loadData]);

  const onRegisterSeller = useCallback(async () => {
    if (!regForm.store_name.trim()) { toast.error('Nhập tên cửa hàng'); return; }
    setRegistering(true);
    try {
      await apiJson('/api/marketplace/seller/register', {
        method: 'POST', body: JSON.stringify(regForm),
      });
      toast.success('Đăng ký thành công!');
      setNotSeller(false);
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi đăng ký');
    } finally { setRegistering(false); }
  }, [regForm, loadData]);

  const onDeleteProduct = useCallback(async (id: number) => {
    if (!window.confirm('Xóa sản phẩm này?')) return;
    try {
      await apiFetch(`/api/marketplace/seller/products/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa!');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch { toast.error('Lỗi xóa sản phẩm'); }
  }, []);

  const onUpdateOrderStatus = useCallback(async (id: number, status: string) => {
    try {
      await apiJson(`/api/marketplace/seller/orders/${id}/status`, {
        method: 'PUT', body: JSON.stringify({ status }),
      });
      toast.success('Đã cập nhật!');
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật');
    }
  }, [loadData]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800">
      <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
    </div>
  );

  // Registration form
  if (notSeller) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 max-w-md w-full border border-gray-100 dark:border-slate-700">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Store className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">Đăng ký bán hàng</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">Bắt đầu bán sản phẩm trên CookingBoy</p>
        <div className="space-y-4">
          <input value={regForm.store_name} onChange={e => setRegForm(f => ({ ...f, store_name: e.target.value }))}
            placeholder="Tên cửa hàng *" className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
          <textarea value={regForm.store_description} onChange={e => setRegForm(f => ({ ...f, store_description: e.target.value }))}
            placeholder="Mô tả cửa hàng" rows={3} className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
          <input value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="Số điện thoại" className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
          <input value={regForm.address} onChange={e => setRegForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Địa chỉ" className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" />
          <button onClick={onRegisterSeller} disabled={registering}
            className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:opacity-80 disabled:opacity-50 transition-all">
            {registering ? 'Đang xử lý...' : 'Đăng ký ngay'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <NotificationProvider role="seller">
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 transition-colors">
        {/* Header */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
                <Store className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.store_name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Xin chào, {profile?.full_name}</p>
              </div>
              <div className="ml-auto">
                <div className="flex items-center gap-2">
                  <Link
                    to="/seller/wallet"
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                  >
                    Ví của tôi
                  </Link>
                  <Link
                    to="/seller/settings"
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Settings className="h-4 w-4" /> Cài đặt
                  </Link>
                  <NotificationBell />
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Sản phẩm', value: stats?.total_products ?? 0, icon: Package, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Đã bán', value: stats?.total_sold ?? 0, icon: ShoppingBag, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
                { label: 'Đơn hàng', value: stats?.total_orders ?? 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
                { label: 'Doanh thu', value: formatPrice(stats?.total_revenue ?? 0), icon: TrendingUp, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`${color} rounded-2xl p-4`}>
                  <Icon className="w-5 h-5 mb-1" />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs opacity-70">{label}</p>
                </div>
              ))}
            </div>

            {!profile?.is_verified && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full shrink-0">
                  <Store className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Tài khoản chưa được xác duyệt</h3>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">Cửa hàng của bạn đang chờ quản trị viên xác duyệt. Bạn tạm thời không thể đăng sản phẩm mới. Quá trình này thường mất từ 1-2 ngày làm việc.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab switcher */}
          <div className="flex gap-2 mb-6">
            {(['products', 'orders'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${tab === t ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700'
                  }`}>
                {t === 'products' ? ' Sản phẩm' : ' Đơn hàng'}
              </button>
            ))}
          </div>

          {/* Products Tab */}
          {tab === 'products' && (
            <div className="space-y-4">
              {/* Create button */}
              <button onClick={() => {
                  if (!profile?.is_verified) {
                    toast.error('Tài khoản của bạn chưa được xác duyệt.');
                    return;
                  }
                  setShowCreate(true);
                }}
                disabled={!profile?.is_verified}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold hover:opacity-80 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" /> Thêm sản phẩm
              </button>
              <CreateProductModal 
                open={showCreate || !!editingProduct} 
                product={editingProduct}
                onClose={() => { setShowCreate(false); setEditingProduct(null); }} 
                onCreated={() => void loadData()} 
              />
              {products.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-slate-700">
                  <Package className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Bạn chưa có sản phẩm nào</p>
                </div>
              ) : (
                products.map(p => (
                  <div key={p.id} className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 flex items-center gap-4 hover:shadow-md transition-shadow ${p.stock === 0 ? 'opacity-60 grayscale' : ''}`}>
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatPrice(p.sale_price ?? p.price)} · {p.stock === 0 ? <span className="text-red-500 font-medium">Hết hàng</span> : `Kho: ${p.stock}`} · Đã bán: {p.total_sold}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/shop/${p.slug}`} className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all" title="Xem chi tiết">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => {
                        if (!profile?.is_verified) {
                          toast.error('Tài khoản của bạn chưa được xác duyệt.');
                          return;
                        }
                        setEditingProduct(p);
                      }} className="p-2 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all" title="Sửa sản phẩm">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => void onDeleteProduct(p.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" title="Xóa sản phẩm">
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>
                  </div>
                ))
              )}
              {productTotal > PRODUCT_PAGE_SIZE && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    currentPage={productPage}
                    totalItems={productTotal}
                    pageSize={PRODUCT_PAGE_SIZE}
                    onPageChange={setProductPage}
                  />
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {tab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-slate-700">
                  <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Chưa có đơn hàng nào</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white">Đơn #{o.id}</span>
                        <span className="text-xs text-gray-400 ml-2">{new Date(o.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-red-600 dark:text-red-400">{formatPrice(o.total_amount)}</span>
                        {(() => {
                          if (['completed', 'cancelled'].includes(o.status)) return null;
                          if (o.status === 'shipping' || o.status === 'delayed') {
                            if (o.is_fast_food_only) {
                              return (
                                <button
                                  onClick={() => void onUpdateOrderStatus(o.id, 'delivered')}
                                  className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors"
                                >
                                  Đánh dấu đã giao
                                </button>
                              );
                            }
                            return (
                              <button
                                onClick={() => setTransitOrderId(o.id)}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Navigation className="w-3.5 h-3.5" /> Lộ trình
                              </button>
                            );
                          }
                          const nextStatusMap: Record<string, { val: string; label: string }> = {
                            pending: { val: 'confirmed', label: 'Xác nhận đơn' },
                            confirmed: { val: 'preparing', label: 'Bắt đầu chuẩn bị' },
                            preparing: { val: 'shipping', label: 'Bắt đầu giao hàng' },
                          };
                          const next = nextStatusMap[o.status];
                          const canSellerCancel = o.is_fast_food_only
                            ? o.status === 'pending'
                            : ['pending', 'confirmed', 'preparing'].includes(o.status);

                          if (!next && !canSellerCancel) return null;
                          return (
                            <div className="flex gap-2">
                              {next && (
                                next.val === 'confirmed' ? (
                                  <ConfirmOrderButton
                                    createdAt={o.created_at}
                                    onClick={() => void onUpdateOrderStatus(o.id, next.val)}
                                  />
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (next.val === 'shipping' && !o.is_fast_food_only) {
                                        setShippingOrderId(o.id);
                                      } else {
                                        void onUpdateOrderStatus(o.id, next.val);
                                      }
                                    }}
                                    className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors"
                                  >
                                    {next.label}
                                  </button>
                                )
                              )}
                              {canSellerCancel && (
                                <button
                                  onClick={() => setCancelOrderId(o.id)}
                                  className="text-xs bg-red-500 hover:bg-red-655 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors"
                                >
                                  Hủy đơn
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Status Tracker */}
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-slate-700">
                      <div className="flex items-center justify-between px-1 sm:px-6">
                        {ORDER_STATUS_STEPS.map((step, i) => {
                          const stepIndex = ORDER_STATUS_STEPS.findIndex((s) => s.key === o.status);
                          const done = stepIndex >= 0 && i <= stepIndex;
                          const current = i === stepIndex;

                          return (
                            <div key={step.key} className="relative flex min-w-0 flex-1 flex-col items-center">
                              {i > 0 && (
                                <div className={`absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2 ${
                                  i <= stepIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
                                }`} />
                              )}
                              <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                done
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-400 dark:bg-slate-700 dark:text-gray-500'
                              } ${current ? 'ring-4 ring-green-200 dark:ring-green-900' : ''}`}>
                                {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                              </div>
                              <span className={`mt-2 max-w-full truncate text-center text-[10px] ${
                                done
                                  ? 'font-semibold text-green-600 dark:text-green-400'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Giao cho: <span className="font-semibold text-gray-800 dark:text-gray-200">{o.shipping_name}</span>
                    </p>
                    <Link
                      to={`/messages?orderId=${o.id}&sellerId=${profile?.user_id ?? ''}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat với khách (đơn #{o.id})
                    </Link>
                  </div>
                ))
              )}
              {orderTotal > ORDER_PAGE_SIZE && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    currentPage={orderPage}
                    totalItems={orderTotal}
                    pageSize={ORDER_PAGE_SIZE}
                    onPageChange={setOrderPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <SellerShippingModal
        open={shippingOrderId !== null}
        orderId={shippingOrderId}
        onClose={() => setShippingOrderId(null)}
        onSuccess={() => void loadData()}
      />

      <SellerTransitLogModal
        open={transitOrderId !== null}
        orderId={transitOrderId}
        onClose={() => setTransitOrderId(null)}
        onSuccess={() => void loadData()}
      />

      <CancelOrderModal
        open={cancelOrderId !== null}
        orderId={cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        onSuccess={() => void loadData()}
        role="seller"
      />
    </NotificationProvider>
  );
}
