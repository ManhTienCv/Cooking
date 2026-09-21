import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Package,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';
import AdminConfirmModal from '../components/AdminConfirmModal';
import AdminProductModal, { type AdminProductDetail } from '../components/AdminProductModal';
import Pagination from '../../../components/ui/Pagination';

interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  product_type: string;
  status: string;
  stock: number;
  unit?: string;
  image_url: string | null;
  images?: string[] | string;
  specs?: Record<string, unknown> | string;
  description?: string | null;
  is_featured?: boolean;
  is_available?: boolean;
  category_id?: number;
  category_name: string;
  seller_name: string;
  store_name: string;
  created_at: string;
}

interface MarketplaceStats {
  totalProducts: number;
  activeProducts: number;
  outOfStockOrHidden: number;
  estimatedWarehouseValue: number;
}

const STATUS_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'selling', label: 'Đang bán' },
  { value: 'out_of_stock', label: 'Hết hàng / Tạm ẩn' },
];

function formatPrice(n: number) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

export default function MarketProductsTab() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Cache theo từng status để chuyển tab tức thì 0ms, không nháy giật
  const [statusCache, setStatusCache] = useState<Record<string, { products: AdminProduct[]; total: number }>>({});

  // Modal states
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProductDetail | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: React.ReactNode;
    type: 'approve' | 'danger' | 'warning' | 'info';
    confirmText: string;
    onConfirm: () => Promise<void> | void;
  }>({
    open: false,
    title: '',
    description: '',
    type: 'info',
    confirmText: '',
    onConfirm: () => {},
  });

  const loadStats = useCallback(async () => {
    try {
      const data = await apiJson<MarketplaceStats>('/api/admin/marketplace/stats');
      setStats(data);
    } catch {
      // Ignore background stats load error
    }
  }, []);

  const loadProducts = useCallback(async (targetStatus: string = status) => {
    const hasCache = !!statusCache[targetStatus];
    if (!hasCache) {
      setLoading(true);
    }
    try {
      const d = await apiJson<{ products: AdminProduct[]; total: number }>(
        `/api/admin/marketplace/products?status=${targetStatus}&limit=100`
      );
      const list = d.products ?? [];
      const count = d.total ?? 0;
      setProducts(list);
      setTotal(count);
      setStatusCache((prev) => ({
        ...prev,
        [targetStatus]: { products: list, total: count },
      }));
    } catch {
      if (!hasCache) {
        toast.error('Không thể tải danh sách sản phẩm', { id: 'admin-market-products-load-error' });
      }
    } finally {
      setLoading(false);
    }
  }, [status, statusCache]);

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === status) return;
    setStatus(newStatus);
    if (statusCache[newStatus]) {
      setProducts(statusCache[newStatus].products);
      setTotal(statusCache[newStatus].total);
      setLoading(false);
    }
    void loadProducts(newStatus);
  };

  useEffect(() => {
    void loadProducts(status);
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleEditProduct = (p: AdminProduct) => {
    let parsedSpecs: Record<string, unknown> = {};
    if (typeof p.specs === 'string') {
      try {
        parsedSpecs = JSON.parse(p.specs);
      } catch {
        parsedSpecs = {};
      }
    } else if (p.specs && typeof p.specs === 'object') {
      parsedSpecs = p.specs as Record<string, unknown>;
    }

    let parsedImages: string[] = [];
    if (typeof p.images === 'string') {
      try {
        parsedImages = JSON.parse(p.images);
      } catch {
        parsedImages = [];
      }
    } else if (Array.isArray(p.images)) {
      parsedImages = p.images;
    }

    setEditingProduct({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category_id: p.category_id ?? '',
      product_type: p.product_type || 'equipment',
      price: p.price,
      sale_price: p.sale_price,
      stock: p.stock,
      unit: p.unit || 'cái',
      image_url: p.image_url || '',
      images: parsedImages,
      specs: parsedSpecs,
      description: p.description || '',
      is_featured: Boolean(p.is_featured),
      is_available: p.is_available !== undefined ? Boolean(p.is_available) : true,
      status: p.status,
    });
    setProductModalOpen(true);
  };

  const handleDeleteProduct = (p: AdminProduct) => {
    setConfirmModal({
      open: true,
      title: 'Xóa sản phẩm',
      type: 'danger',
      confirmText: 'Xác nhận xóa',
      description: (
        <span>
          Bạn có chắc chắn muốn xóa sản phẩm <strong>"{p.name}"</strong> không? Sản phẩm sẽ được chuyển vào thùng rác và ngừng kinh doanh.
        </span>
      ),
      onConfirm: async () => {
        try {
          await apiJson(`/api/admin/marketplace/products/${p.id}`, { method: 'DELETE' });
          toast.success('Đã xóa sản phẩm thành công!');
          void loadProducts();
          void loadStats();
        } catch {
          toast.error('Không thể xóa sản phẩm, vui lòng thử lại.');
        }
      },
    });
  };

  const filteredProducts = useMemo(() => {
    const result = [...products].filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.category_name || '').toLowerCase().includes(q)
        )
          return false;
      }
      if (categoryFilter && p.category_name !== categoryFilter) return false;
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
  }, [products, search, categoryFilter, sortBy]);

  // Reset về trang 1 khi thay đổi điều kiện lọc / tìm kiếm / tab trạng thái
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, sortBy, status]);

  // Điều chỉnh trang nếu số lượng sản phẩm giảm
  useEffect(() => {
    if (currentPage > 1 && (currentPage - 1) * PAGE_SIZE >= filteredProducts.length) {
      setCurrentPage(Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE)));
    }
  }, [filteredProducts.length, currentPage]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Cửa hàng KitchenCook
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Quản lý sản phẩm, thêm mới, cấu hình giá và theo dõi tồn kho chuyên nghiệp.
          </p>
        </div>

        <button
          onClick={handleCreateProduct}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-sm font-bold shadow-lg shadow-blue-500/25 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Đăng sản phẩm mới
        </button>
      </div>

      {/* KPI Stats Cards (CameraHub reference style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng sản phẩm */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng sản phẩm
            </p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {stats?.totalProducts ?? '...'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Toàn bộ kho hàng</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Đang kinh doanh */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Đang kinh doanh
            </p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats?.activeProducts ?? '...'}
            </h3>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Sẵn sàng bán ra</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Hết hàng / Tạm ẩn */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hết hàng / Tạm ẩn
            </p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats?.outOfStockOrHidden ?? '...'}
            </h3>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">Cần nhập thêm kho</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Tổng giá trị kho */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng giá trị kho
            </p>
            <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate max-w-[170px]" title={formatPrice(stats?.estimatedWarehouseValue ?? 0)}>
              {stats ? formatPrice(stats.estimatedWarehouseValue) : '...'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Ước tính theo tồn kho</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl gap-1 border border-slate-200/60 dark:border-slate-700/80 shadow-2xs relative">
          {STATUS_TABS.map((t) => {
            const isActive = status === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => handleStatusChange(t.value)}
                className={`relative isolate px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-200 border border-transparent cursor-pointer ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-product-status-pill"
                    className="absolute inset-0 rounded-xl bg-white dark:bg-slate-700 shadow-xs border border-slate-200/60 dark:border-slate-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Hiển thị: <strong>{filteredProducts.length}</strong> / {total} sản phẩm
        </span>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên sản phẩm, danh mục..."
            className="w-full pl-10 pr-8 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
        >
          <option value="">Tất cả danh mục đồ bếp</option>
          {Array.from(new Set(products.map((p) => p.category_name).filter(Boolean))).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
        >
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
          <option value="stock_low">Tồn kho thấp nhất</option>
        </select>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Đang tải dữ liệu sản phẩm...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400">
            <div className="text-4xl mb-2">📦</div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">Không tìm thấy sản phẩm nào</p>
            <p className="text-xs text-slate-400 mt-1">Thử đổi bộ lọc hoặc thêm mới sản phẩm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="text-left py-4 px-5 font-bold text-slate-600 dark:text-slate-300">Sản phẩm</th>
                  <th className="text-left py-4 px-4 font-bold text-slate-600 dark:text-slate-300">Danh mục</th>
                  <th className="text-left py-4 px-4 font-bold text-slate-600 dark:text-slate-300">Giá bán</th>
                  <th className="text-left py-4 px-4 font-bold text-slate-600 dark:text-slate-300 min-w-[140px]">Tồn kho</th>
                  <th className="text-left py-4 px-4 font-bold text-slate-600 dark:text-slate-300">Trạng thái</th>
                  <th className="text-right py-4 px-5 font-bold text-slate-600 dark:text-slate-300">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedProducts.map((p) => {
                  const isDiscount = p.sale_price !== null && p.sale_price < p.price;
                  const discountPct = isDiscount
                    ? Math.round(((p.price - (p.sale_price || 0)) / p.price) * 100)
                    : 0;

                  // Stock indicator logic
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock > 0 && p.stock <= 5;

                  // Status badge logic
                  const isSelling =
                    p.status === 'approved' && p.is_available && p.stock > 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Product Name & Thumbnail */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 border border-slate-200/60 dark:border-slate-600">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🍳</div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-white line-clamp-1">
                                {p.name}
                              </span>
                              {p.is_featured && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                                  <Sparkles className="w-2.5 h-2.5" /> HOT
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              <span>#{p.id}</span>
                              <span>•</span>
                              <span>{p.category_name || 'Đồ bếp'}</span>
                              <span>•</span>
                              <span className="text-[#E8590C] font-semibold">KitchenCook</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                          🍳 {p.category_name || 'Đồ bếp'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-black text-red-600 dark:text-red-400 text-base">
                            {formatPrice(p.sale_price ?? p.price)}
                          </span>
                          {isDiscount && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-slate-400 line-through">
                                {formatPrice(p.price)}
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                -{discountPct}%
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Stock with visual progress bar */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {p.stock} {p.unit || 'cái'}
                            </span>
                            {isOutOfStock ? (
                              <span className="text-[11px] font-bold text-red-500 dark:text-red-400">Hết hàng</span>
                            ) : isLowStock ? (
                              <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400">Sắp hết</span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Còn hàng</span>
                            )}
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOutOfStock
                                  ? 'w-full bg-red-500'
                                  : isLowStock
                                  ? 'w-1/3 bg-amber-500'
                                  : 'w-4/5 bg-emerald-500'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isSelling ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đang bán
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {p.stock <= 0 ? 'Hết hàng' : 'Tạm ẩn'}
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">

                          {/* View in Shop */}
                          <Link
                            to={`/shop/${p.slug}`}
                            target="_blank"
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                            title="Xem trang sản phẩm"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Edit Product */}
                          <button
                            onClick={() => handleEditProduct(p)}
                            className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete Product */}
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredProducts.length > PAGE_SIZE && (
          <div className="p-5 border-t border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hiển thị <strong className="text-slate-700 dark:text-slate-200">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredProducts.length)}</strong> -{' '}
              <strong className="text-slate-700 dark:text-slate-200">{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)}</strong> trên tổng số{' '}
              <strong className="text-slate-700 dark:text-slate-200">{filteredProducts.length}</strong> sản phẩm
            </p>
            <div className="scale-90 sm:scale-95 origin-center sm:origin-right">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredProducts.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                autoScrollTop={false}
                activeClassName="bg-blue-600 text-white shadow-md border-blue-600 dark:bg-blue-600 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Admin Product Create / Edit Modal */}
      <AdminProductModal
        open={productModalOpen}
        product={editingProduct}
        onClose={() => setProductModalOpen(false)}
        onSuccess={() => {
          void loadProducts();
          void loadStats();
        }}
      />

      {/* Confirm Action Modal */}
      <AdminConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
