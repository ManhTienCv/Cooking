import { Link } from 'react-router-dom';
import { Clock, ChefHat, Star, ArrowRight } from 'lucide-react';
import type { FeaturedRecipe } from './types';

export default function RecipeHomeCard({ recipe }: { recipe: FeaturedRecipe }) {
  return (
    <div
      className="bg-white overflow-hidden group border-b sm:border border-gray-100 pb-6 sm:pb-0 sm:rounded-sm transition-all duration-300"
    >
      <div className="relative overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
            <ChefHat className="h-24 w-24 text-gray-300" />
          </div>
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          {recipe.is_featured && (
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
              <Star className="w-3 h-3 inline mr-1 fill-current" />
              Nổi bật
            </span>
          )}
          <span className="bg-black/80 text-white px-3 py-1 rounded-full text-sm">
            {recipe.category_name || 'Món chính'}
          </span>
        </div>
        <div className="absolute top-4 right-4">
          <span
            className={`px-3 py-1 bg-white/90 text-black text-xs font-bold uppercase tracking-wider shadow-sm`}
          >
            {recipe.difficulty || 'Trung bình'}
          </span>
        </div>
      </div>
      <div className="pt-6 sm:p-5">
        <h3 className="text-xl font-serif font-bold text-black mb-3 group-hover:text-gray-600 transition-colors duration-300 line-clamp-2">
          {recipe.title}
        </h3>
        <div className="flex items-center justify-between text-gray-600 text-sm mb-4">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{recipe.cooking_time != null ? `${recipe.cooking_time} phút` : '—'}</span>
          </div>
        </div>
        <Link
          to={`/recipes/detail/${recipe.id}`}
          className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest font-bold text-black hover:text-gray-500 transition-colors duration-300 group/link"
        >
          <span>ĐỌC TIẾP</span>
          <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform duration-300" />
        </Link>
      </div>
    </div>
  );
}
