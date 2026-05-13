import { ChefHat } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { RevealStaggerItem } from '../motion/ScrollReveal';
import type { RecipeListRow } from './types';
import RecipeHomeCard from '../home/RecipeHomeCard';

interface RecipeListProps {
  isLoading: boolean;
  recipes: RecipeListRow[];
  onClearFilters: () => void;
}

export default function RecipeList({ isLoading, recipes, onClearFilters }: RecipeListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/80 rounded-2xl overflow-hidden shadow-lg border border-white/20 p-5">
            <Skeleton className="w-full h-64 mb-4 rounded-xl" />
            <Skeleton className="h-6 w-3/4 mb-3" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-4 w-1/4 mt-6" />
          </div>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <ChefHat className="h-16 w-16 text-gray-300 mx-auto" />
        </div>
        <h3 className="text-gray-700 font-bold text-lg mb-2">Không có công thức nào</h3>
        <p className="text-gray-500 mb-4">Chưa có công thức nào trong danh mục này.</p>
        <button 
          onClick={onClearFilters}
          className="text-yellow-600 hover:text-yellow-700 font-medium inline-flex items-center transition-colors"
        >
          Xem tất cả công thức &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {recipes.map((recipe, idx) => (
        <RevealStaggerItem key={recipe.id} index={idx} stagger={0.05} maxStaggerIndex={12}>
          {/* Reuse the awesome home card design */}
          <RecipeHomeCard recipe={{
            id: recipe.id,
            title: recipe.title,
            image_url: recipe.image_url ?? undefined,
            category_name: recipe.category_name ?? undefined,
            difficulty: recipe.difficulty ?? undefined,
            cooking_time: recipe.cooking_time ?? undefined,
            is_featured: !!recipe.is_featured,
            status: recipe.status ?? undefined,
          }} />
        </RevealStaggerItem>
      ))}
    </div>
  );
}
