import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, User, Eye, ArrowLeft, Bookmark, BookmarkCheck, ChefHat, Flame, Drumstick, Wheat, Droplets, Lock } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiFetch, apiJson } from '../../lib/api';
import ImageWithFallback from '../../lib/ImageWithFallback';
import AuthModal from '../../components/AuthModal';
import { HeroEnter, Reveal } from '../../components/motion/ScrollReveal';
import { AUTH_CHANGE_EVENT } from '../../lib/authEvents';
import BuyIngredientsPanel from '../../components/shop/BuyIngredientsPanel';
import AiRecommendations from '../../components/shop/AiRecommendations';
import RecipeInstructions from '../../components/recipes/RecipeInstructions';
import IngredientList from '../../components/recipes/IngredientList';
import NutritionBox from '../../components/recipes/NutritionBox';

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
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

/** Phân tích thời gian từ bước nấu (VD: "Luộc 15 phút" -> 15) */
function extractMinutes(step: string): number | null {
  const match = step.match(/(\d+)\s*(phút|minutes?|mins?)/i);
  return match ? Number(match[1]) : null;
}

export default function RecipeDetail() {
  const { id } = useParams();
  const [isSaved, setIsSaved] = useState(false);
  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Ingredient checklist
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  // Cooking mode timer
  const [activeTimer, setActiveTimer] = useState<{ step: number; seconds: number } | null>(null);

  const loadRecipe = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);

    // Check auth
    try {
      const me = await apiJson<{ authenticated: boolean }>('/api/auth/me');
      setIsAuthenticated(Boolean(me.authenticated));
      if (!me.authenticated) { setIsLoading(false); return; }
    } catch {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiJson<{ recipe: RecipeRow; isSaved?: boolean }>(`/api/recipes/${id}`);
      setRecipe(data.recipe);
      setIsSaved(Boolean(data.isSaved));
      void apiFetch(`/api/recipes/${id}/view`, { method: 'POST' });
    } catch { setRecipe(null); }
    finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => { void loadRecipe(); }, [loadRecipe]);

  useEffect(() => {
    const handleAuthChanged = () => {
      void loadRecipe();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChanged);
  }, [loadRecipe]);

  // Timer countdown
  useEffect(() => {
    if (!activeTimer || activeTimer.seconds <= 0) return;
    const interval = setInterval(() => {
      setActiveTimer(prev => {
        if (!prev || prev.seconds <= 1) { clearInterval(interval); return null; }
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const toggleIngredient = (index: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const handleSaveToggle = async () => {
    if (!recipe?.id) return;
    try {
      const data = await apiJson<{ saved: boolean }>('/api/recipes/toggle-save', {
        method: 'POST', body: JSON.stringify({ id: recipe.id }),
      });
      setIsSaved(data.saved);
    } catch { /* 401 or network */ }
  };

  const getDiffBadge = (d: string) => {
    const map: Record<string, string> = {
      'Dễ': 'bg-emerald-500/90 text-white ring-1 ring-emerald-300/60 shadow-sm dark:bg-emerald-400/20 dark:text-emerald-100 dark:ring-emerald-300/30',
      'Trung bình': 'bg-amber-500/90 text-white ring-1 ring-amber-300/60 shadow-sm dark:bg-amber-400/20 dark:text-amber-100 dark:ring-amber-300/30',
      'Khó': 'bg-rose-500/90 text-white ring-1 ring-rose-300/60 shadow-sm dark:bg-rose-400/20 dark:text-rose-100 dark:ring-rose-300/30',
    };
    return map[d] ?? 'bg-slate-500/80 text-white ring-1 ring-slate-300/60 shadow-sm dark:bg-slate-400/20 dark:text-slate-100 dark:ring-slate-300/30';
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors">
        <div className="relative h-96 overflow-hidden"><Skeleton className="w-full h-full rounded-none" /></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Auth gate — must login to view recipe details
  if (isAuthenticated === false) {
    return (
      <main className="min-h-screen pt-16 pb-20 bg-gradient-to-br from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-10 max-w-md mx-auto border border-gray-100 dark:border-slate-700">
          <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">Cần đăng nhập</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Bạn cần đăng nhập để xem chi tiết công thức nấu ăn.</p>
          <button onClick={() => setIsAuthOpen(true)} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full hover:opacity-80 transition-opacity font-semibold mb-3 w-full">Đăng nhập</button>
          <Link to="/recipes" className="text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors">← Quay lại danh sách</Link>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="min-h-screen pt-16 pb-20 bg-gradient-to-br from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center text-center">
        <ChefHat className="h-24 w-24 text-gray-300 dark:text-slate-600 mb-6" />
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Không tìm thấy công thức</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Công thức này có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link to="/recipes" className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full hover:opacity-80 transition-opacity inline-flex items-center space-x-2 font-medium">
          <ArrowLeft className="h-5 w-5" />
          <span>Quay lại danh sách</span>
        </Link>
      </main>
    );
  }

  const diff = recipe.difficulty ?? 'Trung bình';
  const instructionLines = splitLines(recipe.instructions);
  const ingredientLines = splitLines(recipe.ingredients);

  // Mock nutrition (could come from API in the future)
  const nutrition = {
    calories: 350 + (recipe.cooking_time ?? 0) * 3,
    protein: 18 + Math.floor(ingredientLines.length * 1.5),
    carbs: 42 + Math.floor(ingredientLines.length * 2),
    fat: 12 + Math.floor(ingredientLines.length),
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">

      {/* â”€â”€ Hero Banner â”€â”€ */}
      <div className="relative h-[28rem] md:h-[32rem] overflow-hidden">
        <ImageWithFallback src={recipe.image_url || '/assets/images/vietnam1.jpg'} alt={recipe.title} className="block w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-[3000ms]" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>

        <HeroEnter className="absolute bottom-8 left-6 md:left-10 right-6 text-white z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center bg-amber-400/90 text-black px-3 h-7 rounded-full text-xs font-bold uppercase tracking-wider">
              {recipe.category_name ?? '—'}
            </span>
            <span className={`${getDiffBadge(diff)} inline-flex items-center h-7 px-3 rounded-full text-xs font-bold badge-grain`}>
              {diff}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-black leading-tight drop-shadow-lg mb-3">{recipe.title}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{recipe.cooking_time != null ? `${recipe.cooking_time} phút` : '—'}</span>
            <span className="flex items-center gap-1"><User className="h-4 w-4" />{recipe.author_name ?? '—'}</span>
            <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{recipe.views ?? 0} lượt xem</span>
          </div>
        </HeroEnter>

        {/* Top actions */}
        <div className="absolute top-4 left-4 z-50">
          <Link to="/recipes" className="bg-white/80 backdrop-blur-md text-black px-4 py-2 rounded-full hover:bg-white transition-colors flex items-center text-sm font-medium shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Quay lại
          </Link>
        </div>
        <div className="absolute top-4 right-4 z-50">
          <button onClick={() => void handleSaveToggle()} className="bg-white/80 backdrop-blur-md text-black px-4 py-2 rounded-full hover:bg-white transition-colors flex items-center gap-2 text-sm font-medium shadow-sm cursor-pointer">
            {isSaved ? <BookmarkCheck className="h-4 w-4 fill-current text-amber-400" /> : <Bookmark className="h-4 w-4" />}
            <span>{isSaved ? 'Đã lưu' : 'Lưu'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* â”€â”€ Main column â”€â”€ */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description */}
            {recipe.description && (
              <Reveal y={18}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                  <h2 className="text-2xl font-serif font-bold text-black dark:text-white mb-4">Mô tả</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{recipe.description}</p>
                </div>
              </Reveal>
            )}

            <RecipeInstructions
              instructions={instructionLines}
              activeTimer={activeTimer}
              onStartTimer={(step, seconds) => setActiveTimer({ step, seconds })}
              formatTimer={formatTimer}
              extractMinutes={extractMinutes}
            />
          </div>

          {/* â”€â”€ Sidebar â”€â”€ */}
          <div className="space-y-6">

            <NutritionBox nutrition={nutrition} />

            <IngredientList
              ingredients={ingredientLines}
              checkedIngredients={checkedIngredients}
              onToggleIngredient={toggleIngredient}
            />

            {/* Buy Ingredients — Smart Feature */}
            {ingredientLines.length > 0 && (
              <Reveal y={18} delay={0.07}>
                <BuyIngredientsPanel
                  ingredients={recipe.ingredients ?? ''}
                />
              </Reveal>
            )}

            {/* Author */}
            <Reveal y={18} delay={0.08}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-black dark:text-white mb-4">Tác giả</h3>
                <div className="flex items-center gap-3">
                  {recipe.author_avatar ? (
                    <ImageWithFallback src={recipe.author_avatar} alt={recipe.author_name ?? ''} className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/50" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-black dark:text-white">{recipe.author_name ?? '—'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Người đóng góp</p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Info */}
            <Reveal y={18} delay={0.1}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-black dark:text-white mb-4">Thông tin</h3>
                <div className="space-y-3 text-sm">
                  {[
                    ['Danh mục', recipe.category_name ?? '—'],
                    ['Độ khó', diff],
                    ['Thời gian', recipe.cooking_time != null ? `${recipe.cooking_time} phút` : '—'],
                    ['Ngày đăng', recipe.created_at ? String(recipe.created_at).slice(0, 10) : '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{label}</span>
                      <span className="font-semibold text-black dark:text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* AI Recommendations — Smart Feature */}
        <div className="mt-12">
          <AiRecommendations
            recipeTitle={recipe.title}
            ingredients={recipe.ingredients ?? ''}
            context="recipe"
            limit={4}
          />
        </div>
      </div>
    </main>
  );
}
