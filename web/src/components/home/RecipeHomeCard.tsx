import { Link } from 'react-router-dom';
import { Clock, Star, ArrowRight } from 'lucide-react';
import type { FeaturedRecipe } from './types';
import ImageWithFallback from '../../lib/ImageWithFallback';

export default function RecipeHomeCard({ recipe }: { recipe: FeaturedRecipe }) {
  const getDiffBadge = (d?: string) => {
    const map: Record<string, string> = {
      'Dễ': 'bg-emerald-500 text-white ring-1 ring-emerald-300/80 shadow-md dark:bg-emerald-500 dark:text-white dark:ring-emerald-300/50',
      'Trung bình': 'bg-amber-500 text-white ring-1 ring-amber-300/80 shadow-md dark:bg-amber-500 dark:text-white dark:ring-amber-300/50',
      'Khó': 'bg-rose-500 text-white ring-1 ring-rose-300/80 shadow-md dark:bg-rose-500 dark:text-white dark:ring-rose-300/50',
    };
    return map[d ?? ''] ?? 'bg-slate-600 text-white ring-1 ring-slate-300/80 shadow-md dark:bg-slate-600 dark:text-white dark:ring-slate-300/50';
  };

  const diffLabel = recipe.difficulty || 'Trung bình';

  return (
    <div className="group overflow-hidden border-b border-gray-200/80 bg-white/95 pb-6 transition-all duration-300 sm:rounded-lg sm:border sm:pb-0 sm:shadow-sm hover:-translate-y-1 hover:border-gray-300 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900/85 dark:hover:border-slate-600 dark:hover:shadow-none flex flex-col h-full">
      <div className="relative overflow-hidden">
        <ImageWithFallback
          src={recipe.image_url || '/assets/images/vietnam1.jpg'}
          alt={recipe.title}
          className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        <div className="absolute left-4 top-4 flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-2">
          {recipe.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 h-7 text-xs font-bold text-white shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              Nổi bật
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-black/85 px-3 h-7 text-xs font-bold text-white backdrop-blur-sm shadow-md dark:bg-black/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {recipe.category_name || 'Món chính'}
          </span>
        </div>

        <div className="absolute right-4 top-4">
          <span className={`${getDiffBadge(diffLabel)} inline-flex items-center h-7 px-3 text-xs font-bold uppercase tracking-wider backdrop-blur-sm rounded-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]`}>
            {diffLabel}
          </span>
        </div>
      </div>

      <div className="pt-6 sm:p-5 flex-1 flex flex-col">
        <h3 className="mb-3 line-clamp-2 text-xl font-bold font-serif text-black transition-colors duration-300 group-hover:text-gray-600 dark:text-white dark:group-hover:text-slate-200 min-h-[3.5rem]">
          {recipe.title}
        </h3>
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{recipe.cooking_time != null ? `${recipe.cooking_time} phút` : '-'}</span>
          </div>
        </div>
        <Link
          to={`/recipes/detail/${recipe.id}`}
          className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-black transition-colors duration-300 hover:text-gray-500 group/link dark:text-white dark:hover:text-slate-300 mt-auto"
        >
          <span>ĐỌC TIẾP</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
