import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Eye } from 'lucide-react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';

interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  product_type: string;
  status: string;
  stock: number;
  image_url: string | null;
  category_name: string;
  seller_name: string;
  store_name: string;
  created_at: string;
}

const STATUS_TABS = [
  { value: 'pending', label: 'Chờ duyệt', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'approved', label: 'Đã duyệt', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'rejected', label: 'Bị từ chối', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'all', label: 'Tất cả', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
];

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function MarketProductsTab() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiJson<{ products: AdminProduct[]; total: number }>(
        `/api/admin/marketplace/products?status=${status}&limit=100`
      );
      setProducts(d.products ?? []);
      setTotal(d.total ?? 0);
    } catch {
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const onMarketProductAction = useCallback(async (id: number, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'Duyệt' : 'Từ chối';
    if (!window.confirm(`Bạn có chắc chắn muốn ${label} sản phẩm này?`)) return;
    try {
      await apiJson(`/api/admin/marketplace/products/${id}/${action}`, { method: 'POST' });
      toast.success(`Đã ${label.toLowerCase()} thành công!`);
      void loadProducts();
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    let result = [...products].filter(p => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.store_name || '').toLowerCase().includes(q) && !(p.seller_name || '').toLowerCase().includes(q)) return false;
      }
      if (typeFilter && p.product_type !== typeFilter) return false;
      return true;
    });

    if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));
    } else if (sortBy === 'stock_low') {
      result.sort((a, b) => a.stock - b.stock);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [products, search, typeFilter, sortBy]);

  const getStatusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[s] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  };

  const getTypeLabel = (t: string) => {
    const map: Record<string, string> = { food: '🍜 Đồ ăn', ingredient: '🥬 Nguyên liệu', equipment: '🍳 Đồ bếp' };
    return map[t] ?? t;
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Quản lý sản phẩm</h2>
        <p className="text-slate-500 dark:text-slate-400">Duyệt và quản lý sản phẩm marketplace.</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              status === t.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto self-center text-sm text-slate-500 dark:text-slate-400">{total} sản phẩm</span>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm tên sản phẩm, shop..."
            className="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200">
          <option value="">Tất cả loại</option>
          <option value="food">🍜 Đồ ăn</option>
          <option value="ingredient">🥬 Nguyên liệu</option>
          <option value="equipment">🍳 Đồ bếp</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200">
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá tăng</option>
          <option value="price_desc">Giá giảm</option>
          <option value="stock_low">Kho thấp</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">Đang tải...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">Không có sản phẩm nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Sản phẩm</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Loại</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Giá</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Kho</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Người bán</th>
                  <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">Trạng thái</th>
                  <th className="text-right p-4 font-semibold text-slate-600 dark:text-slate-300">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white line-clamp-1">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.category_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs">{getTypeLabel(p.product_type)}</td>
                    <td className="p-4">
                      <span className="font-bold text-red-600 dark:text-red-400">{formatPrice(p.sale_price ?? p.price)}</span>
                      {p.sale_price && p.sale_price < p.price && (
                        <span className="text-xs text-slate-400 line-through ml-1">{formatPrice(p.price)}</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{p.stock}</td>
                    <td className="p-4">
                      <span className="text-slate-700 dark:text-slate-200 text-xs">{p.store_name || p.seller_name}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${getStatusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {p.status === 'pending' && (
                          <>
                            <button
                              onClick={() => void onMarketProductAction(p.id, 'approve')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => void onMarketProductAction(p.id, 'reject')}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                        <Link
                          to={`/shop/${p.slug}`}
                          target="_blank"
                          className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                          title="Xem trang sản phẩm"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
