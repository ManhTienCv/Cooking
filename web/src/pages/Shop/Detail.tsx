import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Minus, Plus, ChevronRight, Package, Store, ArrowLeft, Heart, MessageSquare, MessageCircle, Camera, X, Video, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

import { apiJson, apiFetch } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';
import { Reveal } from '../../components/motion/ScrollReveal';
import AiRecommendations from '../../components/shop/AiRecommendations';
import type { Product, ProductReview } from '../../types/marketplace';

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [addingCart, setAddingCart] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'with_media' | '5' | '4' | '1-3'>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiJson<{ product: Product }>(`/api/marketplace/products/${slug}`)
      .then((d) => {
        setProduct(d.product);
        setQty(1);
        setActiveImg(0);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    apiJson<{ reviews: ProductReview[]; total: number }>(`/api/marketplace/products/${product.id}/reviews?limit=10`)
      .then((d) => { setReviews(d.reviews ?? []); setReviewTotal(d.total ?? 0); })
      .catch(() => {});
    apiJson<{ wishlisted: boolean }>(`/api/marketplace/wishlist/${product.id}`)
      .then((d) => setWishlisted(Boolean(d.wishlisted)))
      .catch(() => setWishlisted(false));
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingCart(true);
    try {
      await addItem(product.id, qty);
      toast.success(`Đã thêm ${qty} ${product.unit} vào giỏ!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi thêm giỏ hàng');
    } finally {
      setAddingCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    try {
      await apiFetch(`/api/marketplace/wishlist/${product.id}`, { method: 'POST' });
      setWishlisted(!wishlisted);
      toast.success(wishlisted ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích');
    } catch {
      toast.error('Vui lòng đăng nhập');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-10 animate-pulse">
            <div className="aspect-square bg-gray-200 dark:bg-slate-700 rounded-3xl" />
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
              <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sản phẩm không tồn tại</h2>
          <Link to="/shop" className="text-amber-600 dark:text-amber-400 hover:underline font-medium">← Về cửa hàng</Link>
        </div>
      </div>
    );
  }

  const hasDiscount = product.sale_price != null && product.sale_price < product.price;
  const finalPrice = hasDiscount ? product.sale_price! : product.price;
  const allImages = product.image_url ? [product.image_url, ...product.images] : product.images;
  const specs = product.specs && Object.keys(product.specs).length > 0 ? product.specs : null;
  const chatHref = `/messages?sellerId=${product.seller_id}&seller=${encodeURIComponent(product.store_name || product.seller_name || 'Shop')}&productId=${product.id}&product=${encodeURIComponent(product.name)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-slate-900 dark:to-slate-800 transition-colors">
      {/* Breadcrumb */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/shop" className="hover:text-black dark:hover:text-white transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Cửa hàng
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-400 dark:text-gray-500">{product.category_name}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-black dark:text-white font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          {/* Image Gallery */}
          <Reveal y={16}>
            <div className="space-y-4">
              <div className="aspect-square rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/50 shadow-sm">
                <motion.img
                  key={activeImg}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={allImages[activeImg] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjgiIGZpbGw9IiNjYmQzZGQiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        i === activeImg ? 'border-amber-500 shadow-md' : 'border-gray-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          {/* Product Info */}
          <Reveal y={16} delay={0.1}>
            <div className="space-y-5">
              {/* Category + Type */}
              <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-medium inline-flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> {product.category_name}
                </span>
                {product.product_type === 'equipment' && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                    Thiết bị
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                {product.name}
              </h1>

              {/* Rating + Sales */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-gray-900 dark:text-white">{product.rating.toFixed(1)}</span>
                  <span className="text-gray-400">({product.total_reviews} đánh giá)</span>
                </div>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-gray-500 dark:text-gray-400">Đã bán {product.total_sold}</span>
              </div>

              {/* Price */}
              <div className="p-5 bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-900/10 dark:to-amber-900/10 rounded-2xl">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">{formatPrice(finalPrice)}</span>
                  {hasDiscount && (
                    <>
                      <span className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</span>
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        -{Math.round(((product.price - product.sale_price!) / product.price) * 100)}%
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">/ {product.unit}</p>
              </div>

              {/* Quantity + Cart */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-0 border border-gray-200 dark:border-slate-700 rounded-full overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-5 py-2.5 font-bold text-gray-900 dark:text-white min-w-[3rem] text-center">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(product.stock, qty + 1))}
                    className="px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  Kho: {product.stock} {product.unit}
                </span>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || addingCart}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-base hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-all shadow-lg"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.stock === 0 ? 'Hết hàng' : addingCart ? 'Đang thêm...' : 'Thêm vào giỏ'}
                </motion.button>
                <button
                  onClick={handleToggleWishlist}
                  className={`p-3.5 rounded-full border transition-all ${
                    wishlisted
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-slate-700 hover:text-red-500 hover:border-red-300'
                  }`}
                  aria-label="Yêu thích"
                >
                  <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Seller */}
              {product.store_name && (
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <Link to={`/creator/${product.seller_id}`} className="min-w-0 flex-1 transition hover:opacity-90">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{product.store_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">bởi {product.seller_name} · Xem trang</p>
                  </Link>
                  <Link
                    to={chatHref}
                    className="shrink-0 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/35"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </Link>
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Mô tả</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
                </div>
              )}

              {/* Specs */}
              {specs && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Thông số</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(specs).map(([k, v]) => (
                      <div key={k} className="flex justify-between p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{k}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          <Reveal y={16}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Đánh giá ({reviewTotal})
                </h2>
                {product.rating > 0 && (
                  <span className="flex items-center gap-1 ml-2 text-sm font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {product.rating.toFixed(1)} / 5
                  </span>
                )}
              </div>

              {/* Review filter tabs */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold">
                {[
                  { key: 'all', label: `Tất cả (${reviews.length})` },
                  { key: 'with_media', label: `📸 Có ảnh & video (${reviews.filter((r) => (r.images && r.images.length > 0) || Boolean(r.video_url)).length})` },
                  { key: '5', label: '⭐ 5 sao' },
                  { key: '4', label: '⭐ 4 sao' },
                  { key: '1-3', label: '⭐ 1-3 sao' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setReviewFilter(tab.key as typeof reviewFilter)}
                    className={`px-3 py-1.5 rounded-full transition-all ${
                      reviewFilter === tab.key
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          {reviews.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
              <p className="text-gray-500 dark:text-gray-400">Chưa có đánh giá nào cho sản phẩm này.</p>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                Khách hàng sau khi nhận hàng có thể đăng đánh giá kèm hình ảnh thực tế tại trang Chi tiết đơn hàng.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews
                .filter((r) => {
                  if (reviewFilter === 'with_media') return (r.images && r.images.length > 0) || Boolean(r.video_url);
                  if (reviewFilter === '5') return r.rating === 5;
                  if (reviewFilter === '4') return r.rating === 4;
                  if (reviewFilter === '1-3') return r.rating <= 3;
                  return true;
                })
                .map((r) => (
                  <Reveal key={r.id} y={12}>
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50 space-y-3">
                      <div className="flex items-center gap-3">
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                            {r.full_name?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">{r.full_name}</p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="ml-auto text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>

                      {r.comment && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{r.comment}</p>}

                      {/* Visual reviews: Image gallery */}
                      {r.images && r.images.length > 0 && (
                        <div className="flex items-center gap-2.5 flex-wrap pt-1">
                          {r.images.map((imgUrl, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => setPreviewImage(imgUrl)}
                              className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform group"
                            >
                              <img src={imgUrl} alt={`Ảnh review ${imgIdx + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Video URL badge if any */}
                      {r.video_url && /^https?:\/\//i.test(r.video_url) && (
                        <div className="pt-1">
                          <a
                            href={r.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Xem video unboxing / review thực tế</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </Reveal>
                ))}
            </div>
          )}
        </div>

        {/* Lightbox Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 z-10 w-9 h-9 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={previewImage} alt="Phóng to ảnh đánh giá" className="w-full h-auto max-h-[85vh] object-contain" />
            </div>
          </div>
        )}

        {/* Related Products — AI-powered */}
        <div className="mt-14">
          <AiRecommendations
            recipeTitle={product.name}
            context="product"
            limit={4}
          />
        </div>
      </div>
    </div>
  );
}
