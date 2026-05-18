import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChefHat, Clock, Sparkles } from 'lucide-react';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';
import { Skeleton } from '../ui/Skeleton';
import { apiJson } from '../../lib/api';
import RecipeHomeCard from './RecipeHomeCard';
import ImageWithFallback from '../../lib/ImageWithFallback';
import type { FeaturedRecipe } from './types';

const STATIC_COLLECTIONS = [
  { text: 'Nồi áp suất', detail: 'Món mềm nhanh, ít canh lửa', category: 'Nồi Áp Suất' },
  { text: 'Món thuần chay', detail: 'Nhẹ bụng cho ngày trong tuần', category: 'Thuần Chay' },
  { text: 'Thực đơn bận rộn', detail: 'Chuẩn bị nhanh sau giờ làm', category: 'Thực đơn bận rộn' },
  { text: 'Nhanh và dễ', detail: 'Ít bước, nguyên liệu quen', category: 'Nhanh & Gọn' },
  { text: 'Món mì Ý', detail: 'Pasta sốt kem, sốt cà chua', search: 'mì Ý' },
  { text: 'Súp và canh', detail: 'Ấm bụng, dễ nấu cho gia đình', category: 'Súp & Canh' },
];

export default function FeaturedRecipes() {
  const [featuredRecipes, setFeaturedRecipes] = useState<FeaturedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<{ recipes: FeaturedRecipe[] }>('/api/recipes/featured?limit=7');
        if (!cancelled) setFeaturedRecipes(data.recipes ?? []);
      } catch {
        if (!cancelled) setFeaturedRecipes([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mainRecipe = featuredRecipes.length > 0 ? featuredRecipes[0] : null;
  const otherRecipes = featuredRecipes.length > 1 ? featuredRecipes.slice(1, 5) : [];

  return (
    <section className="py-10 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              <Sparkles className="h-4 w-4" />
              Bếp chọn hôm nay
            </span>
            <h2 className="text-3xl font-serif font-bold text-black dark:text-white sm:text-4xl md:text-5xl">
              Công thức nổi bật
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-gray-600 dark:text-slate-300 md:text-lg">
              Các món đang được yêu thích, trình bày gọn để dễ chọn món và đọc nhanh trước khi vào chi tiết.
            </p>
          </div>
          <Link
            to="/recipes"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-600"
          >
            Xem tất cả
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Skeleton className="h-[460px] w-full rounded-lg" />
            <Skeleton className="h-[460px] w-full rounded-lg" />
            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
              <Skeleton className="h-80 w-full rounded-lg" />
              <Skeleton className="h-80 w-full rounded-lg" />
              <Skeleton className="h-80 w-full rounded-lg" />
              <Skeleton className="h-80 w-full rounded-lg" />
            </div>
          </div>
        ) : featuredRecipes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white/70 py-16 text-center dark:border-slate-700 dark:bg-slate-900/70">
            <ChefHat className="mx-auto mb-4 h-20 w-20 text-gray-300 dark:text-slate-600" />
            <p className="text-lg font-medium text-gray-500 dark:text-slate-400">Chưa có công thức nào</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              {mainRecipe && (
                <RevealStaggerItem index={0} stagger={0.08}>
                  <Link
                    to={`/recipes/detail/${mainRecipe.id}`}
                    className="group relative block h-full min-h-[320px] overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:min-h-[420px] lg:min-h-full dark:bg-slate-900 dark:hover:shadow-none"
                  >
                    <ImageWithFallback
                      src={mainRecipe?.image_url || '/assets/images/vietnam1.jpg'}
                      alt={mainRecipe?.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-black">
                          Ngôi sao hôm nay
                        </span>
                        {mainRecipe.cooking_time != null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                            <Clock className="h-4 w-4" />
                            {mainRecipe.cooking_time} phút
                          </span>
                        )}
                      </div>
                      <h3 className="max-w-3xl font-serif text-2xl font-bold leading-tight sm:text-3xl md:text-5xl">
                        {mainRecipe.title}
                      </h3>
                      {mainRecipe.description && (
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85 sm:mt-4 sm:text-base md:text-lg">
                          {mainRecipe.description.length > 150
                            ? `${mainRecipe.description.substring(0, 150)}...`
                            : mainRecipe.description}
                        </p>
                      )}
                      <span className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                        Đọc tiếp
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </RevealStaggerItem>
              )}

              <Reveal y={30} className="lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-lg border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
                  <h4 className="border-b border-gray-200 pb-4 text-center text-lg font-black uppercase tracking-wider text-gray-900 dark:border-slate-700 dark:text-white">
                    Bộ sưu tập công thức
                  </h4>
                  <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {STATIC_COLLECTIONS.map((col) => (
                      <li key={col.text}>
                        <Link
                          to={col.category ? `/recipes?category=${encodeURIComponent(col.category)}` : `/recipes?q=${encodeURIComponent(col.search || '')}`}
                          className="group flex items-center gap-4 rounded-lg p-3 transition hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
                            <ImageWithFallback
                              src={`/assets/images/collections/${col.category?.toLowerCase().replace(/\s/g, '-')}.jpg`}
                              fallback="https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=200"
                              alt={col.text}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-gray-800 dark:text-slate-100">{col.text}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-slate-400">{col.detail}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            {otherRecipes.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                {otherRecipes.map((recipe, idx) => (
                  <RevealStaggerItem key={recipe.id} index={idx + 1} stagger={0.08}>
                    <RecipeHomeCard recipe={recipe} />
                  </RevealStaggerItem>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
