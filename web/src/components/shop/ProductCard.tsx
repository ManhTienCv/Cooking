import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Heart, Package, Flame } from 'lucide-react';
import type { Product } from '../../types/marketplace';
import { scrollWindowToTop } from '../../lib/scroll';

interface Props {
  product: Product;
  index?: number;
  onAddToCart?: (id: number) => void;
  onToggleWishlist?: (id: number) => void;
  wishlisted?: boolean;
}

const PLACEHOLDER_IMG =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjgiIGZpbGw9IiNjYmQzZGQiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';

function formatPrice(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function ProductCard({ product, index = 0, onAddToCart, onToggleWishlist, wishlisted }: Props) {
  const hasDiscount = product.sale_price != null && product.sale_price < product.price;
  const finalPrice = hasDiscount ? product.sale_price! : product.price;
  const discountPercent = hasDiscount ? Math.round(((product.price - product.sale_price!) / product.price) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.38, delay: Math.min(index, 8) * 0.06 }}
      className="group relative rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/50 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image */}
      <Link to={`/shop/${product.slug}`} onClick={scrollWindowToTop} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={product.image_url || PLACEHOLDER_IMG}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="px-2.5 py-1 text-xs font-bold bg-red-500 text-white rounded-full shadow-lg">
              -{discountPercent}%
            </span>
          )}
          {product.is_featured && (
            <span className="px-2.5 py-1 text-xs font-bold bg-amber-400 text-black rounded-full shadow-lg inline-flex items-center gap-1">
              <Flame className="w-3 h-3" /> Hot
            </span>
          )}
        </div>

        {/* Wishlist */}
        {onToggleWishlist && (
          <button
            onClick={(e) => { e.preventDefault(); onToggleWishlist(product.id); }}
            className={`absolute top-3 right-3 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 ${wishlisted
                ? 'bg-red-500 text-white'
                : 'bg-white/80 dark:bg-slate-700/80 text-gray-500 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500'
              }`}
            aria-label={wishlisted ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Stock badge */}
        {product.stock <= 5 && product.stock > 0 && (
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-1 text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full">
              Còn {product.stock} {product.unit}
            </span>
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="px-4 py-2 bg-white/90 text-black font-bold rounded-full text-sm">Hết hàng</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2">
        {/* Category */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <Package className="w-3 h-3" />
          <span>{product.category_name}</span>
        </div>

        {/* Title */}
        <Link
          to={`/shop/${product.slug}`}
          onClick={scrollWindowToTop}
          className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          {product.name}
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-0.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">{product.rating.toFixed(1)}</span>
          </div>
          <span className="text-gray-400 dark:text-gray-500">({product.total_reviews})</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="text-gray-400 dark:text-gray-500">Đã bán {product.total_sold}</span>
        </div>

        {/* Price + Cart */}
        <div className="flex items-end justify-between mt-1">
          <div>
            <span className="text-lg font-bold text-red-600 dark:text-red-400">{formatPrice(finalPrice)}</span>
            {hasDiscount && (
              <span className="ml-2 text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
            )}
          </div>

          {onAddToCart && product.stock > 0 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onAddToCart(product.id)}
              className="p-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-md"
              aria-label="Thêm vào giỏ"
            >
              <ShoppingCart className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Seller */}
        {product.store_name && (
          <div className="pt-2 border-t border-gray-50 dark:border-slate-700/50 text-xs text-gray-400 dark:text-gray-500 truncate">
            {product.store_name}
          </div>
        )}
      </div>
    </motion.div>
  );
}
