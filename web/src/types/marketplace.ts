/* ── Marketplace frontend types ────────────────────────── */

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  type: 'food' | 'equipment';
  icon: string | null;
  sort_order: number;
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
  product_type: 'food' | 'ingredient' | 'equipment';
  specs: Record<string, string>;
  stock: number;
  unit: string;
  is_available: boolean;
  is_featured: boolean;
  rating: number;
  total_reviews: number;
  total_sold: number;
  recipe_id: number | null;
  status: string;
  created_at: string;
  /* joined */
  seller_name: string;
  seller_avatar: string | null;
  store_name: string;
  category_name: string;
  category_slug: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
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
  status: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  payment_method: string;
  note: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  paid_amount?: number;
  paid_via?: string | null;
  is_fast_food_only?: boolean;
  delivery_type?: string;
  ref_recipe_id?: number | null;
  commission_amount?: number;
  commission_paid?: boolean;
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
  rating: number;
  comment: string | null;
  images: string[];
  video_url?: string | null;
  created_at: string;
  full_name: string;
  avatar_url: string | null;
}

export interface RecipeTaggedProduct {
  id: number;
  recipe_id: number;
  product_id: number;
  usage_note: string | null;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  main_image: string | null;
  rating: number;
  total_reviews: number;
  seller_id: number;
  store_name: string;
}

export interface WishlistItem {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  product_price: number;
  product_sale_price: number | null;
  product_unit: string;
  product_stock: number;
  product_rating: number;
  product_total_reviews: number;
  product_status: string;
  product_is_available: boolean;
  store_name: string | null;
}
