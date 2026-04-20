export interface FeaturedRecipe {
  description?: string | null;
  id: number;
  title: string;
  category_name?: string;
  difficulty?: string;
  cooking_time?: number | null;
  is_featured?: boolean;
  image_url?: string;
}
