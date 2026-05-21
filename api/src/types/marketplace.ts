/* ── Marketplace Types ───────────────────────────────────── */

export type ProductType = 'food' | 'ingredient' | 'equipment';
export type ProductStatus = 'pending' | 'approved' | 'rejected';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  type: 'food' | 'equipment';
  icon: string | null;
  description: string | null;
  parent_id: number | null;
  sort_order: number;
  created_at: Date;
}

export interface SellerProfile {
  user_id: number;
  store_name: string;
  store_description: string | null;
  phone: string | null;
  address: string | null;
  is_verified: boolean;
  total_sales: number;
  rating: number;
  created_at: Date;
  updated_at: Date;
}

export interface SellerProfileWithUser extends SellerProfile {
  full_name: string;
  avatar_url: string | null;
  email: string;
}

export interface Product {
  id: number;
  seller_id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  images: string[];
  product_type: ProductType;
  specs: Record<string, string>;
  stock: number;
  unit: string;
  is_available: boolean;
  is_featured: boolean;
  rating: number;
  total_reviews: number;
  total_sold: number;
  recipe_id: number | null;
  status: ProductStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ProductWithSeller extends Product {
  seller_name: string;
  seller_avatar: string | null;
  store_name: string;
  category_name: string;
  category_slug: string;
}

export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  created_at: Date;
  /* joined fields */
  product_name: string;
  product_image: string | null;
  product_price: number;
  product_sale_price: number | null;
  product_stock: number;
  product_unit: string;
  seller_id: number;
  store_name: string;
}

export interface Order {
  id: number;
  buyer_id: number;
  total_amount: number;
  status: OrderStatus;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  payment_method: string;
  note: string | null;
  cancelled_reason: string | null;
  created_at: Date;
  updated_at: Date;
  is_fast_food_only?: boolean;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  seller_id: number;
  product_name: string;
  product_slug?: string | null;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface ProductReview {
  id: number;
  product_id: number;
  user_id: number;
  order_id: number;
  rating: number;
  comment: string | null;
  images: string[];
  created_at: Date;
  /* joined */
  full_name: string;
  avatar_url: string | null;
}

export interface WishlistItem {
  id: number;
  user_id: number;
  product_id: number;
  created_at: Date;
  /* joined */
  product_name: string;
  product_slug: string;
  product_image: string | null;
  product_price: number;
  product_sale_price: number | null;
  product_unit: string;
  product_stock: number;
  product_rating: number;
  product_total_reviews: number;
  store_name: string | null;
}

export interface ProductBundle {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  original_price: number;
  bundle_price: number;
  recipe_id: number | null;
  is_active: boolean;
  created_at: Date;
}

export interface BundleWithItems extends ProductBundle {
  items: BundleItem[];
}

export interface BundleItem {
  id: number;
  bundle_id: number;
  product_id: number;
  quantity: number;
  /* joined */
  product_name: string;
  product_image: string | null;
  product_price: number;
}

/* ── Input DTOs ─────────────────────────────────────────── */

export interface CreateProductInput {
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  images: string[];
  product_type: ProductType;
  category_id: number;
  specs: Record<string, string>;
  stock: number;
  unit: string;
  recipe_id: number | null;
}

export interface CreateOrderInput {
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  payment_method: string;
  note: string | null;
}
