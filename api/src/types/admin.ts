export interface Admin {
  id: number;
  full_name: string;
  email: string;
}

export interface DashboardStats {
  admins: number;
  users: number;
  recipes: number;
  blogs: number;
  feedback: number;
  pendingRecipes: number;
  pendingBlogs: number;
  pendingProducts: number;
  products: number;
  orders: number;
  revenue: number;
  pendingOrders: number;
  recipeCategories: number;
  productCategories: number;
  blogCategories: number;
  ordersByStatus: Array<{ status: string; count: number; revenue: number }>;
  recentOrders: Array<{
    id: number;
    order_code: string;
    shipping_name: string;
    total_amount: number;
    status: string;
    payment_method: string;
    payment_status: string;
    created_at: string;
  }>;
  topProducts: Array<{
    id: number;
    name: string;
    price: number;
    stock: number;
    total_sold: number;
    image_url: string;
  }>;
}
