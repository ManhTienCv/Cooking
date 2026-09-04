import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Tag, Plus, Trash2, Search, ExternalLink, Star, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson, getCsrfToken } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';
import ImageWithFallback from '../../lib/ImageWithFallback';
import type { RecipeTaggedProduct, Product } from '../../types/marketplace';

interface Props {
  recipeId: number;
  isAuthor: boolean;
}

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function RecipeTaggedProductsSection({ recipeId, isAuthor }: Props) {
  const { addItem } = useCart();
  const [taggedProducts, setTaggedProducts] = useState<RecipeTaggedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCartId, setAddingToCartId] = useState<number | null>(null);

  // Modal gắn sản phẩm mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [usageNote, setUsageNote] = useState('');
  const [isSavingTag, setIsSavingTag] = useState(false);

  const fetchTaggedProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiJson<{ success: boolean; products: RecipeTaggedProduct[] }>(
        `/api/recipes/${recipeId}/tagged-products`
      );
      setTaggedProducts(res.products ?? []);
    } catch {
      setTaggedProducts([]);
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    void fetchTaggedProducts();
  }, [fetchTaggedProducts]);

  // Tìm kiếm sản phẩm để gắn tag
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiJson<{ products: Product[] }>(
          `/api/marketplace/products?q=${encodeURIComponent(searchQuery)}&limit=8`
        );
        setSearchResults(res.products ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddTag = async () => {
    if (!selectedProduct) {
      toast.error('Vui lòng chọn 1 sản phẩm để gắn');
      return;
    }
    setIsSavingTag(true);
    try {
      const csrfToken = await getCsrfToken();
      await apiJson(`/api/recipes/${recipeId}/tagged-products`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          usage_note: usageNote.trim() || undefined,
        }),
      });
      toast.success('Đã gắn sản phẩm vào công thức!');
      setIsModalOpen(false);
      setSelectedProduct(null);
      setUsageNote('');
      setSearchQuery('');
      void fetchTaggedProducts();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Không thể gắn sản phẩm';
      toast.error(msg);
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleRemoveTag = async (productId: number) => {
    if (!window.confirm('Bạn có chắc muốn gỡ sản phẩm này khỏi công thức?')) return;
    try {
      const csrfToken = await getCsrfToken();
      await apiJson(`/api/recipes/${recipeId}/tagged-products/${productId}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      });
      toast.success('Đã gỡ sản phẩm khỏi công thức');
      void fetchTaggedProducts();
    } catch {
      toast.error('Lỗi khi gỡ sản phẩm');
    }
  };

  const handleAddToCart = async (product: RecipeTaggedProduct) => {
    setAddingToCartId(product.product_id);
    try {
      sessionStorage.setItem('cook_ref_recipe_id', String(recipeId));
      await addItem(product.product_id, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Không thể thêm vào giỏ';
      toast.error(msg);
    } finally {
      setAddingToCartId(null);
    }
  };

  if (!loading && taggedProducts.length === 0 && !isAuthor) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-xl border border-amber-100/60 dark:border-slate-700/60 transition-all">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Dụng Cụ & Nguyên Liệu Chuẩn Bếp
              </h3>
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {taggedProducts.length} món
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Các sản phẩm thực tế được chính đầu bếp khuyên dùng cho công thức này
            </p>
          </div>
        </div>

        {isAuthor && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Gắn đồ bếp / nguyên liệu
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse bg-slate-100 dark:bg-slate-700/50 rounded-2xl h-36" />
          ))}
        </div>
      ) : taggedProducts.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Tag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Chưa có đồ bếp hoặc nguyên liệu nào được gắn tag cho món này.
          </p>
          {isAuthor && (
            <p className="text-xs text-slate-400 mt-1">
              Bạn là tác giả? Hãy bấm nút <b>"Gắn đồ bếp / nguyên liệu"</b> ở trên để gợi ý nguyên liệu chuẩn cho độc giả!
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {taggedProducts.map((item) => {
            const price = item.sale_price ?? item.price;
            const hasSale = item.sale_price != null && item.sale_price < item.price;
            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between bg-slate-50/70 dark:bg-slate-750 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 hover:shadow-lg hover:border-amber-400/50 transition-all duration-300"
              >
                <div>
                  {/* Top: Image & Info */}
                  <div className="flex gap-3">
                    <Link
                      to={`/shop/product/${item.slug}`}
                      className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 relative group-hover:scale-105 transition-transform"
                    >
                      {item.main_image ? (
                        <ImageWithFallback
                          src={item.main_image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Tag className="w-6 h-6" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/shop/product/${item.slug}`}
                        className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      >
                        {item.name}
                      </Link>

                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium truncate max-w-[120px] text-amber-700 dark:text-amber-300">
                          🏪 {item.store_name}
                        </span>
                        {item.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-500 font-bold ml-auto">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {item.rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-extrabold text-amber-600 dark:text-amber-400 text-base">
                          {formatPrice(price)}
                        </span>
                        {hasSale && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(item.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Usage note if any */}
                  {item.usage_note && (
                    <div className="mt-3 text-xs bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span className="truncate">{item.usage_note}</span>
                    </div>
                  )}
                </div>

                {/* Bottom action buttons */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    disabled={addingToCartId === item.product_id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {addingToCartId === item.product_id ? 'Đang thêm...' : 'Thêm giỏ hàng'}
                  </button>

                  <Link
                    to={`/shop/product/${item.slug}`}
                    className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-200/60 dark:bg-slate-700/60 rounded-xl hover:bg-slate-300 transition-colors"
                    title="Xem chi tiết sản phẩm"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(item.product_id)}
                      className="p-2 text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/40 rounded-xl hover:bg-red-100 transition-colors"
                      title="Gỡ sản phẩm này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal tìm và gắn sản phẩm */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-500" />
                Gắn đồ bếp / nguyên liệu vào món ăn
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  1. Tìm sản phẩm trên sàn Cook:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập tên chảo, dầu ăn, gia vị..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Danh sách kết quả tìm kiếm */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-slate-400">Đang tìm kiếm...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    {searchQuery.trim() ? 'Không tìm thấy sản phẩm nào' : 'Gõ tên để bắt đầu tìm'}
                  </div>
                ) : (
                  searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className={`w-full p-2.5 flex items-center gap-3 text-left transition-colors ${
                        selectedProduct?.id === p.id
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-200">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Ảnh</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{p.name}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                          {formatPrice(p.sale_price ?? p.price)}
                        </p>
                      </div>
                      {selectedProduct?.id === p.id && (
                        <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Nhập ghi chú sử dụng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  2. Ghi chú sử dụng trong công thức (không bắt buộc):
                </label>
                <input
                  type="text"
                  value={usageNote}
                  onChange={(e) => setUsageNote(e.target.value)}
                  placeholder="Ví dụ: Dùng chảo này chống dính rất êm ở bước 2..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!selectedProduct || isSavingTag}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSavingTag ? 'Đang lưu...' : 'Gắn vào công thức'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
