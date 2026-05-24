import { Link } from 'react-router-dom';
import { Clock, Star, ArrowRight } from 'lucide-react';
import type { FeaturedRecipe } from './types';
import ImageWithFallback from '../../lib/ImageWithFallback';

export default function RecipeHomeCard({ recipe }: { recipe: FeaturedRecipe }) {
  const isPending = recipe.status === 'pending';
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
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900/85 dark:hover:border-slate-600 dark:hover:shadow-none`}
    >
      <Link to={`/recipes/detail/${recipe.id}`} className="relative block aspect-[4/3] w-full overflow-hidden">
        <ImageWithFallback
          src={recipe.image_url || '/assets/images/vietnam1.jpg'}
          alt={recipe.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        <div className="absolute left-3 top-3 flex flex-col gap-1.5 sm:left-4 sm:top-4">
          {isPending && (
            <span className="inline-flex items-center rounded-full bg-slate-200 px-3 h-7 text-[10px] font-semibold uppercase tracking-wider text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">
              Đang chờ duyệt
            </span>
          )}
          {recipe.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 h-7 text-xs font-bold text-white shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              Nổi bật
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
          <span className={`${getDiffBadge(diffLabel)} inline-flex items-center h-7 px-3 text-xs font-bold uppercase tracking-wider backdrop-blur-sm rounded-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]`}>
            {diffLabel}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Category tag */}
        <div className="mb-1 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
          {recipe.category_name || 'Món chính'}
        </div>

        <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] font-serif text-base font-bold text-black transition-colors duration-300 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400 sm:mb-3 sm:min-h-[3.5rem] sm:text-xl">
          <Link to={`/recipes/detail/${recipe.id}`}>{recipe.title}</Link>
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
