import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, User, Eye, ArrowLeft, Bookmark, BookmarkCheck, Check, ChefHat } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiFetch, apiJson } from '../../lib/api';
import { MOCK_RECIPES } from '../../lib/mockData';
import { HeroEnter, Reveal, RevealStaggerItem } from '../../components/motion/ScrollReveal';

interface RecipeRow {
  id: number;
  title: string;
  description?: string | null;
  ingredients?: string | null;
  instructions?: string | null;
  difficulty?: string | null;
  cooking_time?: number | null;
  views?: number | null;
  image_url?: string | null;
  category_name?: string | null;
  author_name?: string | null;
  author_avatar?: string | null;
  created_at?: string | null;
}

function splitLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function RecipeDetail() {
  const { id } = useParams();
  const [isSaved, setIsSaved] = useState(false);

  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecipe = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);

    const numericId = Number(id);
    if (numericId < 0) {
      const mockRecipe = MOCK_RECIPES.find((r) => r.id === numericId);
      if (mockRecipe) {
        setRecipe(mockRecipe as unknown as RecipeRow);
        setIsSaved(false);
      } else {
        setRecipe(null);
      }
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiJson<{ recipe: RecipeRow; isSaved?: boolean }>(`/api/recipes/${id}`);
      setRecipe(data.recipe);
      setIsSaved(Boolean(data.isSaved));
      void apiFetch(`/api/recipes/${id}/view`, { method: 'POST' });
    } catch {
      setRecipe(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRecipe();
  }, [loadRecipe]);

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

  const handleSaveToggle = async () => {
    if (!recipe?.id) return;
    try {
      const data = await apiJson<{ saved: boolean }>('/api/recipes/toggle-save', {
        method: 'POST',
        body: JSON.stringify({ id: recipe.id }),
      });
      setIsSaved(data.saved);
    } catch {
      /* 401 or network */
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        <div className="relative h-96 overflow-hidden">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="min-h-screen pt-32 pb-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center text-center transition-colors duration-300">
        <ChefHat className="h-24 w-24 text-gray-300 dark:text-slate-600 mb-6 drop-shadow-md" />
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Không tìm thấy công thức</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Công thức này có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link
          to="/recipes"
          className="bg-black text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors inline-flex items-center space-x-2 font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Quay lại danh sách</span>
        </Link>
      </main>
    );
  }

  const diff = recipe.difficulty ?? 'Trung bình';
  const instructionLines = splitLines(recipe.instructions);
  const ingredientLines = splitLines(recipe.ingredients);

  return (
    <main className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <div className="relative h-96 overflow-hidden">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
            <ChefHat className="h-16 w-16 text-white" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

        <HeroEnter className="absolute bottom-8 left-8 text-white max-w-2xl z-10">
          <div className="flex items-center space-x-2 mb-4">
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
              {recipe.category_name ?? '—'}
            </span>
            <span className={`${getDifficultyBadgeClass(diff)} px-3 py-1 rounded-full text-sm font-medium`}>
              {diff}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-2">{recipe.title}</h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{recipe.cooking_time != null ? `${recipe.cooking_time} phút` : '—'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>{recipe.author_name ?? '—'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{recipe.views ?? 0} lượt xem</span>
            </div>
          </div>
        </HeroEnter>

        <div className="absolute top-4 left-4 flex space-x-2 z-50">
          <Link
            to="/recipes"
            className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 transition-colors flex items-center"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" /> Quay lại
          </Link>
        </div>

        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => void handleSaveToggle()}
            className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 transition-colors flex items-center space-x-2 cursor-pointer"
          >
            {isSaved ? <BookmarkCheck className="h-5 w-5 fill-current" /> : <Bookmark className="h-5 w-5" />}
            <span>{isSaved ? 'Đã lưu' : 'Lưu công thức'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {recipe.description && (
              <Reveal y={18}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                  <h2 className="text-2xl font-serif font-bold text-black dark:text-white mb-4">Mô tả</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{recipe.description}</p>
                </div>
              </Reveal>
            )}

            <Reveal y={20}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                <h2 className="text-2xl font-serif font-bold text-black dark:text-white mb-6">Hướng dẫn nấu ăn</h2>
                <div className="space-y-4">
                  {instructionLines.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Chưa có hướng dẫn.</p>
                  ) : (
                    instructionLines.map((instruction, index) => (
                      <RevealStaggerItem key={index} index={index} stagger={0.04} maxStaggerIndex={14}>
                        <div className="flex space-x-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 pt-2">
                            <p className="text-gray-700 dark:text-gray-300">{instruction}</p>
                          </div>
                        </div>
                      </RevealStaggerItem>
                    ))
                  )}
                </div>
              </div>
            </Reveal>
          </div>

          <div className="space-y-6">
            <Reveal y={18} delay={0.05}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                <h2 className="text-2xl font-serif font-bold text-black dark:text-white mb-4">Nguyên liệu</h2>
                <ul className="space-y-2">
                  {ingredientLines.length === 0 ? (
                    <li className="text-gray-500 dark:text-gray-400 text-sm">Chưa có danh sách nguyên liệu.</li>
                  ) : (
                    ingredientLines.map((ingredient, index) => (
                      <RevealStaggerItem key={index} index={index} stagger={0.035} maxStaggerIndex={16}>
                        <li className="flex items-start space-x-2">
                          <Check className="h-5 w-5 text-green-700 dark:text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300">{ingredient}</span>
                        </li>
                      </RevealStaggerItem>
                    ))
                  )}
                </ul>
              </div>
            </Reveal>

            <Reveal y={18} delay={0.08}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-black dark:text-white mb-4">Tác giả</h3>
              <div className="flex items-center space-x-3">
                {recipe.author_avatar ? (
                  <img
                    src={recipe.author_avatar}
                    alt={recipe.author_name ?? ''}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-slate-700 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-black dark:text-white">{recipe.author_name ?? '—'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Người đóng góp</p>
                </div>
              </div>
              </div>
            </Reveal>

            <Reveal y={18} delay={0.1}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-black dark:text-white mb-4">Thông tin</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Danh mục:</span>
                  <span className="font-semibold text-black dark:text-white">{recipe.category_name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Độ khó:</span>
                  <span className="font-semibold text-black dark:text-white">{diff}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Thời gian:</span>
                  <span className="font-semibold text-black dark:text-white">
                    {recipe.cooking_time != null ? `${recipe.cooking_time} phút` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ngày đăng:</span>
                  <span className="font-semibold text-black dark:text-white">{recipe.created_at ?? '—'}</span>
                </div>
              </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </main>
  );
}
