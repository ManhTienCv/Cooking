import { useEffect, useState } from 'react';
import { ChevronDown, ArrowRight, ChefHat, Star, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Skeleton } from '../components/ui/Skeleton';
import { apiJson } from '../lib/api';
import { HeroEnter, Reveal, RevealStaggerItem } from '../components/motion/ScrollReveal';

declare global {
  interface Window {
    VanillaTilt?: { init: (elements: Element[]) => void };
  }
}

interface FeaturedRecipe {
  id: number;
  title: string;
  category_name?: string;
  difficulty?: string;
  cooking_time?: number | null;
  is_featured?: boolean;
  image_url?: string;
}

export default function Home() {
  const [featuredRecipes, setFeaturedRecipes] = useState<FeaturedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<{ recipes: FeaturedRecipe[] }>('/api/recipes/featured?limit=6');
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

  useEffect(() => {
    if (isLoading) return;
    const id = window.requestAnimationFrame(() => {
      const VT = window.VanillaTilt;
      if (VT) {
        VT.init(Array.from(document.querySelectorAll('[data-tilt]')));
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isLoading, featuredRecipes]);

  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty) {
      case 'Dễ':
        return 'bg-green-100 text-green-800';
      case 'Trung bình':
        return 'bg-yellow-100 text-yellow-800';
      case 'Khó':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <main>
      <div className="floating-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <section className="relative h-[70vh] min-h-[600px] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="/assets/images/vietnam1.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            aria-hidden="true"
            style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div className="absolute inset-0 bg-black" style={{ opacity: 0.5 }}></div>
        </div>
        <HeroEnter className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight text-center">
            <div className="mb-2">Khám Phá</div>
            <div className="mb-2 text-gradient-live drop-shadow-lg">Ẩm Thực</div>
            <div className="mb-10">Việt Nam</div>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-2xl mx-auto">
            Hành trình khám phá hương vị truyền thống qua những công thức nấu ăn đặc sắc
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link
              to="/recipes"
              className="bg-yellow-400 text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-yellow-300 transform hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2 group"
            >
              <span>Khám phá công thức</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </HeroEnter>
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10">
          <div className="animate-bounce flex flex-col items-center space-y-1">
            <ChevronDown className="h-7 w-7 text-white opacity-90 drop-shadow-md" />
            <span className="text-white text-sm opacity-80 drop-shadow-md">Cuộn xuống</span>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">Công Thức Nổi Bật</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Những món ăn được yêu thích nhất với hướng dẫn chi tiết từng bước
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="recipe-grid">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white/80 rounded-2xl overflow-hidden shadow-lg border border-white/20 p-5">
                  <Skeleton className="w-full h-64 mb-4 rounded-xl" />
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-1/4 mt-6" />
                </div>
              ))
            ) : featuredRecipes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <ChefHat className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Chưa có công thức nào</p>
              </div>
            ) : (
              featuredRecipes.map((recipe, idx) => (
                <RevealStaggerItem key={recipe.id} index={idx} stagger={0.065} maxStaggerIndex={8}>
                  <div
                    className="bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 group border border-white/20"
                    data-tilt
                    data-tilt-max="10"
                    data-tilt-speed="400"
                    data-tilt-glare="true"
                    data-tilt-max-glare="0.3"
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
                        <div className="w-full h-64 bg-gradient-to-br from-yellow-200 to-yellow-400 flex items-center justify-center">
                          <ChefHat className="h-24 w-24 text-white" />
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
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyBadgeClass(recipe.difficulty ?? 'Trung bình')}`}
                        >
                          {recipe.difficulty || 'Trung bình'}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-black mb-3 group-hover:text-yellow-600 transition-colors duration-300">
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
                        className="inline-flex items-center space-x-2 text-black font-semibold hover:text-yellow-600 transition-colors duration-300 group"
                      >
                        <span>Xem công thức</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                    </div>
                  </div>
                </RevealStaggerItem>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">Danh Mục Món Ăn</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tìm kiếm theo danh mục để khám phá những món ăn yêu thích
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="category-grid">
            {['Món khai vị', 'Món chính', 'Tráng miệng', 'Đồ uống'].map((cat, idx) => {
              const imgMap: Record<string, string> = {
                'Món khai vị': 'monkhaivi.jpg',
                'Món chính': 'monchinh.jpg',
                'Tráng miệng': 'montrangmieng.jpg',
                'Đồ uống': 'douong.jpg',
              };
              return (
                <RevealStaggerItem key={cat} index={idx} stagger={0.07} y={22}>
                  <div className="h-64">
                    <Link
                      to={`/recipes?category=${encodeURIComponent(cat)}`}
                      className="block w-full h-full group relative overflow-hidden rounded-2xl transform hover:scale-105 transition-all duration-500 shadow-md hover:shadow-xl"
                      data-tilt
                      data-tilt-scale="1.05"
                    >
                      <img
                        src={`/assets/images/${imgMap[cat]}`}
                        alt={cat}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-opacity-60 transition-all duration-300"></div>
                      <div className="absolute inset-0 flex flex-col justify-end p-6">
                        <h3 className="text-white text-xl font-bold mb-2 group-hover:text-yellow-400 transition-colors duration-300">
                          {cat}
                        </h3>
                      </div>
                    </Link>
                  </div>
                </RevealStaggerItem>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <Reveal y={24}>
            <div
              className="bg-white/60 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-xl border border-white/20"
              data-tilt
              data-tilt-max="5"
              data-tilt-glare="true"
              data-tilt-max-glare="0.2"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">Bắt Đầu Hành Trình Nấu Ăn</h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Tham gia cộng đồng những người yêu thích nấu ăn và chia sẻ những công thức độc đáo của bạn
              </p>
              <Link
                to="/recipes"
                className="inline-flex items-center space-x-2 bg-black text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-800 transform hover:scale-105 transition-all duration-300 group shadow-lg hover:shadow-xl"
              >
                <span>Khám phá ngay</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
