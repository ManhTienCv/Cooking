import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, SlidersHorizontal, Store, ChevronDown } from 'lucide-react';
import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import ProductCard from '../../components/shop/ProductCard';
import FlashSaleSection from '../../components/shop/FlashSaleSection';
import AiRecommendations from '../../components/shop/AiRecommendations';
import FeaturedBundles from '../../components/shop/FeaturedBundles';
import Pagination from '../../components/ui/Pagination';
import { Reveal } from '../../components/motion/ScrollReveal';
import { apiJson } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';
import type { Product, ProductCategory } from '../../types/marketplace';

const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'popular', label: 'Bán chạy' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'rating', label: 'Đánh giá cao' },
];

export default function Shop() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!(params.get('q') || params.get('category') || params.get('type'));
  });

  const filterRef = useRef<HTMLDivElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  /* Filters */
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [productType, setProductType] = useState(searchParams.get('type') || '');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = searchParams.get('q');
    const c = searchParams.get('category');
    const t = searchParams.get('type');
    if (q !== null) setSearch(q);
    if (c !== null) setCategory(c);
    if (t !== null) setProductType(t);

    if (q || c || t) {
      setShowFilters(true);
      setTimeout(() => {
        filterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [searchParams]);

  /* Load categories */
  useEffect(() => {
    apiJson<{ categories: ProductCategory[] }>('/api/marketplace/categories')
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  const handleProductType = useCallback((typeVal: string) => {
    setProductType(typeVal);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (typeVal) params.set('type', typeVal); else params.delete('type');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const handleCategory = useCallback((catVal: string) => {
    setCategory(catVal);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (catVal) params.set('category', catVal); else params.delete('category');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  /* Fetch products */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set('q', search.trim());
      if (category) q.set('category', category);
      if (productType) q.set('type', productType);
      q.set('sort', sort);
      q.set('limit', String(PAGE_SIZE));
      q.set('offset', String((page - 1) * PAGE_SIZE));

      const data = await apiJson<{ products: Product[]; total: number }>(
        `/api/marketplace/products?${q.toString()}`
      );
      setProducts(data.products ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, category, productType, sort, page]);

  useEffect(() => {
    const t = setTimeout(() => void fetchProducts(), 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const handleAddToCart = useCallback(async (productId: number) => {
    try {
      await addItem(productId);
      toast.success('Đã thêm vào giỏ hàng!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể thêm vào giỏ');
    }
  }, [addItem]);

  const onClearFilters = useCallback(() => {
    setSearchParams({});
    setSearch('');
    setCategory('');
    setProductType('');
    setSort('newest');
    setPage(1);
  }, [setSearchParams]);

  const hasActiveFilters = useMemo(() => 
    !!(search || category || productType || sort !== 'newest'),
    [search, category, productType, sort]
  );

  const foodCategories = useMemo(() => categories.filter((c) => c.type === 'food'), [categories]);
  const equipCategories = useMemo(() => categories.filter((c) => c.type === 'equipment'), [categories]);
  const activeCategories = useMemo(() => {
    if (productType === 'equipment') return equipCategories;
    if (productType === 'food') return foodCategories;
    return categories;
  }, [productType, categories, foodCategories, equipCategories]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Hero Header */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Reveal y={16}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Store className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-4xl font-serif italic font-bold text-black dark:text-white">
                Smart Shop
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Khám phá <strong className="text-black dark:text-white">{total}</strong> sản phẩm từ đồ ăn tươi ngon đến thiết bị nhà bếp cao cấp
            </p>
          </Reveal>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" ref={filterRef}>
        {/* Flash Sale Section */}
        <FlashSaleSection products={products} />

        {/* Search + Filter Bar */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          {/* Search */}
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm sản phẩm, nguyên liệu, thiết bị…"
              className="w-full pl-11 pr-10 py-3 border border-gray-200 dark:border-slate-700 rounded-full focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all bg-white dark:bg-slate-800 text-black dark:text-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="appearance-none pl-4 pr-10 py-3 border border-gray-200 dark:border-slate-700 rounded-full bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all border ${
              showFilters
                ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700 hover:border-gray-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Bộ lọc
          </button>

          {hasActiveFilters && (
            <button onClick={onClearFilters} className="text-sm text-amber-600 dark:text-amber-400 hover:underline font-medium">
              Xóa lọc
            </button>
          )}
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mb-8"
            >
              <div className="p-6 bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm">
                {/* Product Type */}
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Loại sản phẩm</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: '', label: 'Tất cả' },
                      { value: 'food', label: '🍜 Đồ ăn' },
                      { value: 'ingredient', label: '🥬 Nguyên liệu' },
                      { value: 'equipment', label: '🍳 Đồ bếp' },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => handleProductType(t.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                          productType === t.value
                            ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                            : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-gray-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Danh mục</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCategory('')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        !category
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-gray-300'
                      }`}
                    >
                      Tất cả
                    </button>
                    {activeCategories.map((c) => (
                      <button
                        key={c.slug}
                        onClick={() => handleCategory(c.slug)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          category === c.slug
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-gray-300'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white dark:bg-slate-800/80 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 dark:bg-slate-700" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                  <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Không tìm thấy sản phẩm
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Thử thay đổi từ khóa hoặc bộ lọc
            </p>
            {hasActiveFilters && (
              <button onClick={onClearFilters} className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold hover:opacity-80 transition-opacity">
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && (
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}

        {/* AI Recommendations — only on first page without active search */}
        {page === 1 && !search && (
          <div className="mt-14">
            <AiRecommendations context="shop" limit={4} />
          </div>
        )}

        {/* Featured Bundles */}
        {page === 1 && !search && (
          <div className="mt-14">
            <FeaturedBundles />
          </div>
        )}
      </div>
    </div>
  );
}
