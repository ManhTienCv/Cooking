export interface Recipe {
  id: number;
  title: string;
  description: string | null;
  ingredients: string;
  instructions: string;
  difficulty: string;
  cooking_time: number | null;
  servings: number | null;
  image_url: string | null;
  category_id: number;
  author_id: number;
  status: 'pending' | 'approved' | 'rejected';
  views: number;
  is_featured: boolean;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface RecipeWithAuthor extends Recipe {
  author_name: string;
  author_avatar: string | null;
  category_name: string;
}

export interface RecipeCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}
