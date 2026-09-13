import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Star,
  Minus,
  Plus,
  ChevronRight,
  ArrowLeft,
  Heart,
  MessageSquare,
  Camera,
  X,
  Video,
  ExternalLink,
  CheckCircle2,
  Truck,
  ShieldCheck,
  RotateCcw,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { apiJson, apiFetch } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';
import { Reveal } from '../../components/motion/ScrollReveal';
import AiRecommendations from '../../components/shop/AiRecommendations';
import type { Product, ProductReview } from '../../types/marketplace';

function formatPrice(n: number) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [addingCart, setAddingCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
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
    document.title = `${product.name} | KitchenCook`;
    apiJson<{ reviews: ProductReview[]; total: number }>(`/api/marketplace/products/${product.id}/reviews?limit=20`)
      .then((d) => {
        setReviews(d.reviews ?? []);
        setReviewTotal(d.total ?? 0);
      })
      .catch(() => { });
    apiJson<{ wishlisted: boolean }>(`/api/marketplace/wishlist/${product.id}`)
      .then((d) => setWishlisted(Boolean(d.wishlisted)))
      .catch(() => setWishlisted(false));
  }, [product]);

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (!product) return;
    if (product.stock <= 0) {
      toast.error('Sản phẩm hiện đã hết hàng.');
      return;
    }
    setAddingCart(true);
    try {
      await addItem(product.id, qty);
      toast.success(`Đã thêm ${qty} ${product.unit || 'sản phẩm'} vào giỏ!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi thêm giỏ hàng');
    } finally {
      setAddingCart(false);
    }
  };

  // Handle Buy Now (Add to cart & go straight to Checkout)
  const handleBuyNow = async () => {
    if (!product) return;
    if (product.stock <= 0) {
      toast.error('Sản phẩm hiện đã hết hàng.');
      return;
    }
    setAddingCart(true);
    try {
      await addItem(product.id, qty);
      navigate('/checkout');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi thêm giỏ hàng');
    } finally {
      setAddingCart(false);
    }
  };

  // Handle Wishlist Toggle
  const handleToggleWishlist = async () => {
    if (!product) return;
    try {
      await apiFetch(`/api/marketplace/wishlist/${product.id}`, { method: 'POST' });
      setWishlisted(!wishlisted);
      toast.success(wishlisted ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích');
    } catch {
      toast.error('Vui lòng đăng nhập để lưu yêu thích');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 font-vietnam">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-12 gap-10 animate-pulse">
            <div className="lg:col-span-6 aspect-square bg-gray-200 dark:bg-slate-800 rounded-3xl" />
            <div className="lg:col-span-6 space-y-4">
              <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded w-4/5" />
              <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-20 bg-gray-200 dark:bg-slate-800 rounded" />
              <div className="h-14 bg-gray-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 flex items-center justify-center font-vietnam">
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 max-w-md">
          <div className="text-6xl mb-4">🍳</div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Sản phẩm không tồn tại</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Sản phẩm bạn đang tìm kiếm có thể đã được gỡ bỏ hoặc tạm dừng kinh doanh.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all"
          >
            ← Về cửa hàng KitchenCook
          </Link>
        </div>
      </div>
    );
  }

  const hasDiscount = product.sale_price != null && product.sale_price < product.price;
  const finalPrice = hasDiscount ? product.sale_price! : product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : null;

  const allImages = product.image_url ? [product.image_url, ...product.images] : product.images;

  // Specs and Key Features
  const rawSpecs = product.specs && typeof product.specs === 'object' ? product.specs : {};
  const keyFeatures: string[] = Array.isArray(rawSpecs.key_features)
    ? rawSpecs.key_features
    : [];

  const specsEntries = Object.entries(rawSpecs).filter(
    ([k, v]) => k !== 'key_features' && typeof v !== 'object'
  );

  // Brand Name
  const brandName =
    (rawSpecs['Thương hiệu'] as string) ||
    product.category_name?.toUpperCase() ||
    'KITCHENCOOK OFFICIAL';

  // Dynamic Warranty from specs (customizable per product, e.g. '30 ngày', '6 tháng')
  const rawWarranty = (rawSpecs['Bảo hành'] as string) || (rawSpecs['warranty'] as string) || '30 ngày';
  const warrantyBadgeText = rawWarranty.toLowerCase().startsWith('bảo hành')
    ? rawWarranty
    : `Bảo hành ${rawWarranty}`;

  // Teaser Description (first 2 sentences or clean short text)
  const teaserDesc = product.description
    ? product.description.split('\n')[0].slice(0, 220)
    : 'Dụng cụ và thiết bị nhà bếp chính hãng KitchenCook, chất lượng cao cấp, thiết kế hiện đại tiện lợi cho mọi bữa ăn gia đình.';

  // Stock status
  const isOutOfStock = product.stock <= 0;

  // Review statistics calculation
  const totalReviewsCount = reviews.length;
  const avgRating =
    product.rating > 0
      ? product.rating
      : totalReviewsCount > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount
        : 5.0;

  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reviews.filter((r) => r.rating === s).length,
    percentage: totalReviewsCount > 0
      ? Math.round((reviews.filter((r) => r.rating === s).length / totalReviewsCount) * 100)
      : (s === 5 ? 100 : 0),
  }));

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 transition-colors font-vietnam pb-20">
      {/* Breadcrumb Navigation */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-800/60 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <Link
              to="/shop"
              className="hover:text-[#E8590C] dark:hover:text-[#f77b31] transition-colors inline-flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Cửa hàng
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
            {product.category_slug ? (
              <Link
                to={`/shop/products?category=${product.category_slug}`}
                className="hover:text-[#E8590C] dark:hover:text-[#f77b31] transition-colors"
              >
                {product.category_name || 'Đồ bếp'}
              </Link>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">{product.category_name || 'Đồ bếp'}</span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
            <span className="text-gray-900 dark:text-white font-bold truncate max-w-[200px] sm:max-w-xs">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ========================================================================= */}
        {/* UPPER SECTION: Product Hero (CameraHub Reference Style)                  */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Column: Image Gallery (5 cols on lg) */}
          <div className="lg:col-span-6 space-y-4">
            <Reveal y={16}>
              {/* Main Image Stage */}
              <div className="aspect-square rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 shadow-sm relative group">
                <motion.img
                  key={activeImg}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  src={allImages[activeImg] || product.image_url || ''}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />

                {/* Hot Badge on Image */}
                {product.is_featured && (
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white shadow-md">
                    <Sparkles className="w-3.5 h-3.5" /> NỔI BẬT
                  </div>
                )}
              </div>

              {/* Thumbnails Row */}
              {allImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 pt-2 scrollbar-none">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImg(i)}
                      className={`relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${activeImg === i
                        ? 'border-amber-500 dark:border-amber-400 shadow-md ring-2 ring-amber-500/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 opacity-70 hover:opacity-100'
                        }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </Reveal>
          </div>

          {/* Right Column: Details & Dual CTA (7 cols on lg) */}
          <div className="lg:col-span-6">
            <Reveal y={20}>
              <div className="space-y-6">
                {/* Brand & Badges Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {brandName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    Mới Ra Mắt
                  </span>
                  {discountPercent !== null && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#E8590C] text-white shadow-xs">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                {/* Product Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                  {product.name}
                </h1>

                {/* Rating & Review Jump Link */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'
                          }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('reviews');
                      const el = document.getElementById('product-content-tabs');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="font-semibold text-gray-700 dark:text-gray-300 hover:text-amber-600 transition-colors"
                  >
                    {avgRating.toFixed(1)} ({reviewTotal} đánh giá thực tế)
                  </button>
                </div>

                {/* Price Display (Clean, Spacious, CameraHub Style) */}
                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                    {formatPrice(finalPrice)}
                  </span>
                  {hasDiscount && (
                    <span className="text-lg sm:text-xl text-gray-400 dark:text-gray-500 line-through font-normal">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>

                {/* Short Teaser Description */}
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                  {teaserDesc}
                </p>

                {/* Stock Status Pill Badge */}
                <div>
                  {!isOutOfStock ? (
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Còn hàng trong kho ({product.stock} {product.unit || 'sản phẩm'} sẵn sàng giao)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Tạm thời hết hàng (Vui lòng liên hệ đặt trước)
                    </span>
                  )}
                </div>

                {/* Key Features Bullet Grid (CameraHub style) */}
                {keyFeatures.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2.5">
                      Đặc điểm nổi bật:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {keyFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-[#E8590C] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dual Action Buttons (Quantity + Add to Cart + Buy Now) */}
                <div className="pt-3 space-y-3">
                  {/* Row 1: Quantity + Add to Cart + Wishlist */}
                  <div className="flex items-center gap-3">
                    {/* Quantity selector */}
                    <div className="flex items-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        disabled={qty <= 1 || isOutOfStock}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-black text-sm text-gray-900 dark:text-white">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(Math.min(product.stock, qty + 1))}
                        disabled={qty >= product.stock || isOutOfStock}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Add to cart (Cohesive Outlined / Tinted KitchenCook style) */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={addingCart || isOutOfStock}
                      className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl border-2 border-[#E8590C] text-[#E8590C] dark:text-[#ff7e33] bg-orange-50/70 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 active:scale-98 font-black text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {addingCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
                    </button>

                    {/* Wishlist button */}
                    <button
                      type="button"
                      onClick={handleToggleWishlist}
                      className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all cursor-pointer ${wishlisted
                        ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:text-[#E8590C] hover:border-[#E8590C]/50'
                        }`}
                      title={wishlisted ? 'Bỏ yêu thích' : 'Yêu thích'}
                    >
                      <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Row 2: Buy Now (Brand orange button, full width) */}
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={addingCart || isOutOfStock}
                    className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-[#E8590C] hover:bg-[#d44e08] active:scale-98 text-white font-black text-base shadow-lg shadow-[#E8590C]/25 hover:shadow-[#E8590C]/40 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Mua ngay
                  </button>
                </div>

                {/* 3 Trust Badges (CameraHub style) */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200/80 dark:border-slate-800 text-center">
                  <div className="flex flex-col items-center gap-1.5 p-2">
                    <Truck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Miễn phí vận chuyển
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-2 border-x border-gray-200/80 dark:border-slate-800">
                    <ShieldCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {warrantyBadgeText}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-2">
                    <RotateCcw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Đổi trả 30 ngày
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LOWER SECTION: 3 Tabs Navigation (CameraHub Reference Style)             */}
        {/* ========================================================================= */}
        <div id="product-content-tabs" className="mt-20">
          {/* Tab Headers */}
          <div className="flex items-center gap-6 sm:gap-10 border-b border-gray-200 dark:border-slate-700/80 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('desc')}
              className={`pb-4 text-sm sm:text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'desc'
                ? 'text-[#E8590C] dark:text-[#f77b31]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <FileText className="w-4 h-4" />
              Mô Tả Sản Phẩm
              {activeTab === 'desc' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8590C]"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('specs')}
              className={`pb-4 text-sm sm:text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'specs'
                ? 'text-[#E8590C] dark:text-[#f77b31]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Sliders className="w-4 h-4" />
              Thông Số Kỹ Thuật Chi Tiết
              {activeTab === 'specs' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8590C]"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-sm sm:text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'reviews'
                ? 'text-[#E8590C] dark:text-[#f77b31]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <MessageSquare className="w-4 h-4" />
              Đánh Giá Khách Hàng
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {reviewTotal}
              </span>
              {activeTab === 'reviews' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8590C]"
                />
              )}
            </button>
          </div>

          {/* Tab 1: Mô Tả Sản Phẩm */}
          {activeTab === 'desc' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="py-8"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border border-gray-100 dark:border-slate-700/60 shadow-xs space-y-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#E8590C]" />
                  Chi tiết sản phẩm & Hướng dẫn sử dụng
                </h3>
                {product.description ? (
                  <div className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line space-y-4">
                    {product.description}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Chưa có bài viết mô tả chi tiết cho sản phẩm này.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 2: Thông Số Kỹ Thuật Chi Tiết */}
          {activeTab === 'specs' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="py-8"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border border-gray-100 dark:border-slate-700/60 shadow-xs space-y-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#E8590C]" />
                  Bảng thông số kỹ thuật sản phẩm
                </h3>

                {specsEntries.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <tbody>
                        {specsEntries.map(([k, v], idx) => (
                          <tr
                            key={k}
                            className={`border-b last:border-0 border-gray-200 dark:border-slate-700 transition-colors ${idx % 2 === 0
                              ? 'bg-gray-50/70 dark:bg-slate-900/30'
                              : 'bg-white dark:bg-slate-800'
                              }`}
                          >
                            <td className="py-3.5 px-6 font-semibold text-gray-600 dark:text-gray-400 w-1/3">
                              {k}
                            </td>
                            <td className="py-3.5 px-6 font-bold text-gray-900 dark:text-white">
                              {String(v)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Chưa có thông số kỹ thuật nào được thiết lập.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 3: Đánh Giá Khách Hàng (CameraHub Style) */}
          {activeTab === 'reviews' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="py-8 space-y-8"
            >
              {/* Rating Summary Card (CameraHub Style) */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-700/60 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  {/* Score */}
                  <div className="md:col-span-3 text-center md:text-left md:border-r border-gray-200/80 dark:border-slate-700/80 pr-4">
                    <div className="flex items-baseline justify-center md:justify-start gap-1">
                      <span className="text-5xl font-black text-gray-900 dark:text-white">
                        {avgRating.toFixed(1)}
                      </span>
                      <span className="text-xl text-gray-400 font-bold">/ 5</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-1 text-amber-400 my-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Dựa trên {reviewTotal} lượt đánh giá thực tế
                    </p>
                  </div>

                  {/* Star Rating Breakdown Bars */}
                  <div className="md:col-span-6 space-y-2">
                    {starCounts.map((s) => (
                      <div key={s.star} className="flex items-center gap-3 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <span className="w-12 text-right">{s.star} sao</span>
                        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${s.percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-left font-semibold text-gray-700 dark:text-gray-300">
                          {s.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="md:col-span-3 flex justify-center md:justify-end">
                    <Link
                      to="/shop/orders"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#E8590C] hover:bg-[#d44e08] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#E8590C]/20 transition-all text-center"
                    >
                      Viết Đánh Giá Của Bạn
                    </Link>
                  </div>
                </div>
              </div>

              {/* Review Filter Buttons */}
              <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
                <span className="text-gray-500 dark:text-gray-400 mr-1">Lọc theo:</span>
                {[
                  { key: 'all', label: `Tất cả (${reviews.length})` },
                  { key: '5', label: `5 ⭐ (${reviews.filter((r) => r.rating === 5).length})` },
                  { key: '4', label: `4 ⭐ (${reviews.filter((r) => r.rating === 4).length})` },
                  { key: '1-3', label: `1-3 ⭐ (${reviews.filter((r) => r.rating <= 3).length})` },
                  { key: 'with_media', label: `📸 Có hình ảnh (${reviews.filter((r) => (r.images && r.images.length > 0) || Boolean(r.video_url)).length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setReviewFilter(tab.key as typeof reviewFilter)}
                    className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${reviewFilter === tab.key
                      ? 'bg-[#E8590C] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800/60 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Chưa có đánh giá nào cho sản phẩm này.</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Khách hàng sau khi nhận hàng có thể viết đánh giá kèm ảnh tại trang Chi tiết đơn hàng.
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
                      <div
                        key={r.id}
                        className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {r.avatar_url ? (
                              <img src={r.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-amber-800 dark:text-amber-300">
                                {r.full_name?.[0] || 'K'}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-900 dark:text-white">
                                  {r.full_name}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
                                  ✓ Đã mua hàng tại KitchenCook
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-3 h-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'
                                        }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-[11px] text-gray-400">
                                  {new Date(r.created_at).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {r.comment && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                            {r.comment}
                          </p>
                        )}

                        {/* Images attached to review */}
                        {r.images && r.images.length > 0 && (
                          <div className="flex items-center gap-2.5 flex-wrap pt-2">
                            {r.images.map((imgUrl, imgIdx) => (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => setPreviewImage(imgUrl)}
                                className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 hover:scale-105 transition-transform group cursor-pointer"
                              >
                                <img src={imgUrl} alt={`Ảnh review ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Video link */}
                        {r.video_url && /^https?:\/\//i.test(r.video_url) && (
                          <div className="pt-2">
                            <a
                              href={r.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 transition-colors"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Xem video review thực tế</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Lightbox Preview Modal for Review Images */}
        {previewImage && createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-3xl max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 z-10 w-9 h-9 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={previewImage} alt="Phóng to ảnh" className="w-full h-auto max-h-[85vh] object-contain" />
            </div>
          </div>,
          document.body
        )}

        {/* AI Recommendations (Related Products) */}
        <div className="mt-20">
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
