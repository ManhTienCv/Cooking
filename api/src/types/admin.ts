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
}
