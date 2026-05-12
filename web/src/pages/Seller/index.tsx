import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Store, Package, ShoppingBag, Plus, Edit, Trash2, Eye, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiJson, apiFetch } from '../../lib/api';
import CreateProductModal from './CreateProductModal';
import { NotificationProvider } from '../../contexts/NotificationContext';
import NotificationBell from '../../components/ui/NotificationBell';

interface SellerProduct {
  id: number; name: string; slug: string; price: number; sale_price: number | null;
  status: string; stock: number; total_sold: number; image_url: string | null;
  category_name: string; product_type: string; created_at: string;
}
interface SellerOrder {
  id: number; total_amount: number; status: string; shipping_name: string;
  created_at: string; items: { product_name: string; quantity: number }[];
}
interface SellerProfile {
  store_name: string; store_description: string | null; phone: string | null;
  address: string | null; full_name: string;
}

function formatPrice(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt', approved: 'Đang bán', rejected: 'Bị từ chối',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function SellerDashboard() {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notSeller, setNotSeller] = useState(false);
  const [regForm, setRegForm] = useState({ store_name: '', store_description: '', phone: '', address: '' });
  const [registering, setRegistering] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await apiJson<{ profile: SellerProfile | null }>('/api/marketplace/seller/profile');
      if (!p.profile) { setNotSeller(true); setLoading(false); return; }
      setProfile(p.profile);
      const [prods, ords] = await Promise.all([
        apiJson<{ products: SellerProduct[] }>('/api/marketplace/seller/products?limit=50'),
        apiJson<{ orders: SellerOrder[] }>('/api/marketplace/seller/orders?limit=50'),
      ]);
      setProducts(prods.products ?? []);
      setOrders(ords.orders ?? []);
    } catch { setNotSeller(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleRegister = async () => {
    if (!regForm.store_name.trim()) { toast.error('Nhập tên cửa hàng'); return; }
    setRegistering(true);
    try {
      await apiJson('/api/marketplace/seller/register', {
        method: 'POST', body: JSON.stringify(regForm),
      });
      toast.success('Đăng ký thành công!');
      setNotSeller(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi đăng ký');
    } finally { setRegistering(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa sản phẩm này?')) return;
    try {
      await apiFetch(`/api/marketplace/seller/products/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa!');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch { toast.error('Lỗi xóa sản phẩm'); }
  };

  const handleOrderStatus = async (id: number, status: string) => {
    try {
      await apiJson(`/api/marketplace/seller/orders/${id}/status`, {
        method: 'PUT', body: JSON.stringify({ status }),
      });
      toast.success('Đã cập nhật!');
      await loadData();
    } catch { toast.error('Lỗi cập nhật'); }
  };

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
          <button onClick={handleRegister} disabled={registering}
            className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:opacity-80 disabled:opacity-50 transition-all">
            {registering ? 'Đang xử lý...' : 'Đăng ký ngay'}
          </button>
        </div>
      </div>
    </div>
  );

  const totalRevenue = orders.reduce((s, o) => s + (o.status !== 'cancelled' ? o.total_amount : 0), 0);
  const totalSold = products.reduce((s, p) => s + p.total_sold, 0);

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
                <NotificationBell />
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Sản phẩm', value: products.length, icon: Package, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Đã bán', value: totalSold, icon: ShoppingBag, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
                { label: 'Đơn hàng', value: orders.length, icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
                { label: 'Doanh thu', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`${color} rounded-2xl p-4`}>
                  <Icon className="w-5 h-5 mb-1" />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs opacity-70">{label}</p>
                </div>
              ))}
            </div>
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
              <button onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold hover:opacity-80 transition-all shadow-md">
                <Plus className="w-4 h-4" /> Thêm sản phẩm
              </button>
              <CreateProductModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => void loadData()} />
              {products.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-slate-700">
                  <Package className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Bạn chưa có sản phẩm nào</p>
                </div>
              ) : (
                products.map(p => (
                  <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
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
                        {formatPrice(p.sale_price ?? p.price)} · Kho: {p.stock} · Đã bán: {p.total_sold}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/shop/${p.slug}`} className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"><Eye className="w-4 h-4" /></Link>
                      <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
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
                        {!['completed', 'cancelled'].includes(o.status) && (
                          <select value="" onChange={e => { if (e.target.value) void handleOrderStatus(o.id, e.target.value); }}
                            className="text-xs border border-gray-200 dark:border-slate-600 rounded-lg py-1 px-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                            <option value="">Chuyển →</option>
                            <option value="confirmed">Xác nhận</option>
                            <option value="preparing">Chuẩn bị</option>
                            <option value="shipping">Giao hàng</option>
                            <option value="delivered">Đã giao</option>
                          </select>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Giao cho: {o.shipping_name} · Trạng thái: <span className="font-semibold">{o.status}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </NotificationProvider>
  );
}
