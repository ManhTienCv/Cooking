export interface ProfileUser {
  full_name: string;
  email: string;
  avatar: string | null;
  bio: string;
}

export interface ProfileStats {
  recipe_count: number;
  post_count: number;
  recipe_views_sum: number;
}

export interface ProfileRecipe {
  id: number;
  title: string;
  image_url?: string | null;
  category_name?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ProfilePost {
  id: number;
  title: string;
  category_name?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ProfilePlan {
  id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
}
