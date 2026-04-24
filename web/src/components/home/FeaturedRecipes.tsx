import { useEffect, useState } from 'react';
import { ChefHat } from 'lucide-react';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';
import { Skeleton } from '../ui/Skeleton';
import { apiJson } from '../../lib/api';
import RecipeHomeCard from './RecipeHomeCard';
import type { FeaturedRecipe } from './types';
import { Link } from 'react-router-dom';

const STATIC_COLLECTIONS = [
  { text: 'Công thức Nồi áp suất' },
  { text: 'Món thuần chay' },
  { text: 'Thực đơn bận rộn' },
  { text: 'Công thức nhanh & dễ' },
  { text: 'Các món Mì Ý (Pasta)' },
  { text: 'Các món Súp & Canh' },
  { text: 'Công thức xem nhiều nhất' },
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
  const otherRecipes = featuredRecipes.length > 1 ? featuredRecipes.slice(1) : [];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <Reveal className="text-center mb-16">
          <h2 className="text-5xl font-serif text-black dark:text-white mb-4">Công Thức Nổi Bật</h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto font-medium">
            Những món ăn được yêu thích nhất với hướng dẫn chi tiết từng bước
          </p>
        </Reveal>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Cột trái: Công thức (Khoảng 2/3) */}
          <div className="lg:w-2/3">
            {isLoading ? (
              <div className="space-y-12">
                <div>
                  <Skeleton className="w-full h-[400px] rounded-sm mb-4" />
                  <Skeleton className="w-2/3 h-8 mb-2" />
                  <Skeleton className="w-full h-16" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Skeleton className="w-full h-64 rounded-sm" />
                  <Skeleton className="w-full h-64 rounded-sm" />
                </div>
              </div>
            ) : featuredRecipes.length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="h-24 w-24 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Chưa có công thức nào</p>
              </div>
            ) : (
              <>
                {/* Main Spotlight Recipe */}
                {mainRecipe && (
                  <RevealStaggerItem index={0} stagger={0.1}>
                    <div className="mb-16 group">
                      <Link to={`/recipes/detail/${mainRecipe.id}`} className="block">
                        <div className="overflow-hidden rounded-sm mb-6">
                          {mainRecipe.image_url ? (
                            <img src={mainRecipe.image_url} alt={mainRecipe.title} className="w-full h-[300px] object-cover md:h-[450px] transform group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-[300px] md:h-[450px] bg-gray-100 flex items-center justify-center">
                              <ChefHat className="w-24 h-24 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block">
                            Ngôi sao hôm nay
                          </span>
                          <h3 className="text-3xl md:text-4xl font-serif font-bold text-black dark:text-white mb-4 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                            {mainRecipe.title}
                          </h3>
                          {mainRecipe.description && (
                            <p className="text-gray-700 dark:text-gray-300 md:text-lg max-w-3xl mb-6">
                              {mainRecipe.description.length > 200 ? `${mainRecipe.description.substring(0, 200)}...` : mainRecipe.description}
                            </p>
                          )}
                          <span className="text-xs uppercase tracking-widest font-bold text-black dark:text-white">ĐỌC TIẾP</span>
                        </div>
                      </Link>
                    </div>
                  </RevealStaggerItem>
                )}

                {/* Sub Grid of Other Recipes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
                  {otherRecipes.map((recipe, idx) => (
                    <RevealStaggerItem key={recipe.id} index={idx + 1} stagger={0.1}>
                      <RecipeHomeCard recipe={recipe} />
                    </RevealStaggerItem>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cột phải: Sidebar (Khoảng 1/3) */}
          <div className="lg:w-1/3">
            <Reveal y={30} className="sticky top-24">
              <div className="bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 p-8 rounded-sm">
                <h4 className="font-black text-lg text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-6 text-center border-b border-gray-200 dark:border-slate-800 pb-4">
                  Bộ Sưu Tập Công Thức
                </h4>
                <ul className="space-y-4">
                  {STATIC_COLLECTIONS.map((col, i) => (
                    <li key={i} className="flex justify-between items-center group cursor-pointer border-b border-gray-100 dark:border-slate-800 pb-4 last:border-0">
                      <div className="flex space-x-3 items-center">
                        <span className="w-5 h-5 rounded-full bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-[10px] font-bold flex flex-shrink-0 items-center justify-center group-hover:bg-gray-600 dark:group-hover:bg-gray-400 transition-colors">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white">
                          {col.text}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>

      </div>
    </section>
  );
}
