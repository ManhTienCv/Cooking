import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Trash2, Sunrise, Sun, Moon, Plus, X } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiJson, apiFetch } from '../../lib/api';
import { HeroEnter, Reveal, RevealStaggerItem } from '../../components/motion/ScrollReveal';
import toast from 'react-hot-toast';

interface HealthPlanRow {
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  meal_count?: number | null;
  diet_type?: string | null;
}

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealItem {
  id: number;
  recipe_id: number | null;
  name: string;
  isCustom: boolean;
  nutrition?: NutritionTotals | null;
}

interface ShoppingItem {
  id: number;
  name: string;
  quantity: string;
  checked: boolean;
}

interface RecipeSuggestion {
  id: number;
  title: string;
  image_url: string;
  cooking_time: number;
  difficulty: string;
  calories: number;
}

interface MealPlan {
  [date: string]: {
    [mealType: string]: MealItem[];
  };
}

export default function HealthDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<HealthPlanRow | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan>({});
  const [isLoading, setIsLoading] = useState(true);
  const [nutritionTotals, setNutritionTotals] = useState<NutritionTotals | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [shoppingName, setShoppingName] = useState('');
  const [shoppingQty, setShoppingQty] = useState('');
  
  const [addingMeal, setAddingMeal] = useState<{date: string, type: string, displayDate: string} | null>(null);
  const [mealName, setMealName] = useState('');
  const [mealNote, setMealNote] = useState('');

  const loadPlanAndMeals = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await apiJson<{ plan: HealthPlanRow }>(`/api/health/plans/${id}`);
      setPlan(data.plan);

      const mealsData = await apiJson<{ success: boolean; mealPlan?: MealPlan; nutritionTotals?: NutritionTotals }>('/api/health/meal-plan', {
        method: 'POST',
        body: JSON.stringify({ action: 'get_meal_plan', plan_id: Number(id) })
      });
      if (mealsData.success && mealsData.mealPlan) {
        setMealPlan(mealsData.mealPlan);
        if (mealsData.nutritionTotals) setNutritionTotals(mealsData.nutritionTotals);
      }

      const shoppingData = await apiJson<{ success: boolean; shoppingList?: ShoppingItem[] }>('/api/health/meal-plan', {
        method: 'POST',
        body: JSON.stringify({ action: 'get_shopping_list', plan_id: Number(id) })
      });
      if (shoppingData.success && shoppingData.shoppingList) {
        setShoppingList(shoppingData.shoppingList);
      }

      try {
        let keyword = '';
        if (mealsData.mealPlan) {
          const allNames: string[] = [];
          Object.values(mealsData.mealPlan).forEach(day => {
            Object.values(day).forEach(meals => {
              (meals as MealItem[]).forEach(m => allNames.push(m.name));
            });
          });
          
          if (allNames.length > 0) {
            // Lấy từ khóa từ món ăn đầu tiên (ví dụ "Cơm chiên" -> lấy "Cơm")
            const firstDish = allNames[0];
            const words = firstDish.split(' ').filter(w => w.length > 2);
            if (words.length > 0) {
              keyword = words[0];
            } else {
              keyword = firstDish.split(' ')[0] || '';
            }
          }
        }

        const endpoint = keyword ? `/api/recipes/search?q=${encodeURIComponent(keyword)}&limit=6` : '/api/recipes/featured?limit=6';
        const recipesRes = await apiFetch(endpoint);
        const recipesJson = await recipesRes.json();
        if (recipesJson.recipes) {
          setSuggestions(recipesJson.recipes);
        }
      } catch { /* ignore */ }
    } catch {
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPlanAndMeals();
  }, [loadPlanAndMeals]);

  const generateDays = () => {
    if (!plan?.start_date) return [];
    const daysArr = [];
    // Parse start_date as local date (YYYY-MM-DD) to avoid timezone offset issues
    const parts = String(plan.start_date).slice(0, 10).split('-');
    const start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(current.getDate() + i);
      const isoDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const dayName = current.toLocaleDateString('vi-VN', { weekday: 'long' });
      const dateStr = current.toLocaleDateString('vi-VN');
      daysArr.push({ key: isoDate, date: dateStr, day: dayName });
    }
    return daysArr;
  };
  const days = generateDays();

  const handleDeletePlan = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa kế hoạch này?')) return;
    try {
      await apiFetch(`/api/health/plans/${id}`, { method: 'DELETE' });
      toast.success('Đã xóa kế hoạch');
      navigate('/health');
    } catch {
      toast.error('Lỗi khi xóa kế hoạch');
    }
  };

  const handleAddMeal = (date: string, mealType: string, displayDate: string) => {
    setAddingMeal({ date, type: mealType, displayDate });
    setMealName('');
    setMealNote('');
  };

  const submitMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingMeal || !mealName.trim()) return;
    try {
      const res = await apiJson<{success: boolean}>('/api/health/meal-plan', {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_recipe',
          plan_id: Number(id),
          date: addingMeal.date,
          meal_type: addingMeal.type,
          recipe_name: mealName.trim(),
          recipe_note: mealNote.trim(),
          is_custom: true
        })
      });
      if (res.success) {
        toast.success('Đã thêm món ăn');
        setAddingMeal(null);
        void loadPlanAndMeals();
      } else {
        toast.error('Lỗi khi thêm món');
      }
    } catch {
      toast.error('Lỗi khi thêm món');
    }
  };

  const handleRemoveMeal = async (date: string, mealType: string, mealId: number) => {
    if (!window.confirm('Bạn muốn xóa món này khỏi thực đơn?')) return;
    try {
      const res = await apiJson<{success: boolean}>('/api/health/meal-plan', {
        method: 'POST',
        body: JSON.stringify({
          action: 'remove_recipe',
          plan_id: Number(id),
          date,
          meal_type: mealType,
          id: mealId
        })
      });
      if (res.success) {
        toast.success('Đã xóa món ăn');
        void loadPlanAndMeals();
      } else {
        toast.error('Lỗi khi xóa món');
      }
    } catch {
      toast.error('Lỗi khi xóa món');
    }
  };

  const handleAddShoppingItem = async () => {
    if (!shoppingName.trim()) return;
    try {
      const res = await apiJson<{success: boolean, shoppingList?: ShoppingItem[]}>('/api/health/meal-plan', {
        method: 'POST',
        body: JSON.stringify({ action: 'add_shopping_item', plan_id: Number(id), name: shoppingName.trim(), quantity: shoppingQty.trim() })
      });
      if (res.success && res.shoppingList) {
        setShoppingList(res.shoppingList);
        setShoppingName('');
        setShoppingQty('');
      }
    } catch { /* ignore */ }
  };

  const handleToggleShoppingItem = async (itemId: number) => {
    try {
      const res = await apiJson<{success: boolean, shoppingList?: ShoppingItem[]}>('/api/health/meal-plan', {
        method: 'POST',
        body: JSON.stringify({ action: 'toggle_shopping_item', plan_id: Number(id), item_id: itemId })
      });
      if (res.success && res.shoppingList) setShoppingList(res.shoppingList);
    } catch { /* ignore */ }
  };

  const handleDeleteShoppingItem = async (itemId: number) => {
    try {
      const res = await apiJson<{success: boolean, shoppingList?: ShoppingItem[]}>('/api/health/meal-plan', {
        method: 'POST',
        body: JSON.stringify({ action: 'remove_shopping_item', plan_id: Number(id), item_id: itemId })
      });
      if (res.success && res.shoppingList) setShoppingList(res.shoppingList);
    } catch { /* ignore */ }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen pt-16 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-6 w-32 mb-6" />
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 mb-8">
             <Skeleton className="h-10 w-1/3 mb-4" />
             <Skeleton className="h-6 w-1/2 mb-6" />
          </div>
        </div>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="min-h-screen pt-32 pb-20 bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col items-center justify-center text-center">
        <Calendar className="h-24 w-24 text-gray-300 dark:text-slate-600 mb-6 drop-shadow-md" />
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Không tìm thấy kế hoạch</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Kế hoạch này có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link to="/health" className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors inline-flex items-center space-x-2 font-medium">
          <ArrowLeft className="h-5 w-5" />
          <span>Quay lại trang Sức Khỏe</span>
        </Link>
      </main>
    );
  }

  const renderMealBox = (dateStr: string, displayDate: string, mealType: string, title: string, Icon: React.ElementType, bgClass: string, textClass: string, btnClass: string) => {
    const meals = mealPlan[dateStr]?.[mealType] || [];
    return (
      <div className={`${bgClass} rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Icon className={`h-5 w-5 ${textClass} mr-2`} />
            <h4 className={`font-semibold ${textClass}`}>{title}</h4>
          </div>
          <button onClick={() => handleAddMeal(dateStr, mealType, displayDate)} className={`${btnClass} text-white px-3 py-1 rounded-full transition-colors text-sm flex items-center shadow-sm`}>
            <Plus className="h-4 w-4 mr-1" /> Thêm món
          </button>
        </div>
        <div className="space-y-2 min-h-[60px]">
          {meals.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm italic">Chưa có món ăn</p>
          ) : (
            meals.map(m => (
              <div key={m.id} className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg flex flex-col shadow-sm border border-white dark:border-slate-700 relative group">
                <div className="flex justify-between items-start">
                  <div className="flex flex-wrap items-center gap-2 pr-6">
                    <span className="font-bold text-gray-800 dark:text-white leading-tight">{m.name}</span>
                    {m.isCustom && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Tự nhập</span>
                    )}
                  </div>
                  <button onClick={() => handleRemoveMeal(dateStr, mealType, m.id)} className="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4"/>
                  </button>
                </div>
                {m.nutrition && (
                  <div className="flex items-center mt-2 text-gray-500 dark:text-gray-400 text-xs font-medium">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {m.nutrition.calories} kcal
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderDonutChart = () => {
    if (!nutritionTotals) return <div className="text-gray-400 dark:text-gray-500 italic">Chưa có dữ liệu</div>;
    const { protein, carbs, fat } = nutritionTotals;
    const total = protein + carbs + fat;
    if (total === 0) return <div className="text-gray-400 dark:text-gray-500 italic">Chưa có dữ liệu</div>;
    
    const r = 15.9155;
    const pPct = (protein / total) * 100;
    const cPct = (carbs / total) * 100;
    const fPct = (fat / total) * 100;

    return (
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 42 42" className="w-48 h-48 donut transform -rotate-90">
          <circle cx="21" cy="21" r={r} fill="transparent" stroke="currentColor" className="text-gray-100 dark:text-slate-700" strokeWidth="6"></circle>
          {pPct > 0 && <circle cx="21" cy="21" r={r} fill="transparent" stroke="#3b82f6" strokeWidth="6" strokeDasharray={`${pPct} ${100-pPct}`} strokeDashoffset="0"></circle>}
          {cPct > 0 && <circle cx="21" cy="21" r={r} fill="transparent" stroke="#eab308" strokeWidth="6" strokeDasharray={`${cPct} ${100-cPct}`} strokeDashoffset={`-${pPct}`}></circle>}
          {fPct > 0 && <circle cx="21" cy="21" r={r} fill="transparent" stroke="#ef4444" strokeWidth="6" strokeDasharray={`${fPct} ${100-fPct}`} strokeDashoffset={`-${pPct + cPct}`}></circle>}
        </svg>
        <div className="flex space-x-4 mt-6 text-sm font-medium text-gray-700 dark:text-gray-300">
          <div className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>Protein</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>Carbs</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>Fat</div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen pt-16 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal className="mb-6" y={12}>
          <Link to="/health" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Quay lại danh sách kế hoạch
          </Link>
        </Reveal>

        <HeroEnter className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-transparent dark:border-slate-700 p-8 mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-4xl font-serif font-bold text-black dark:text-white mb-4">{plan.name}</h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">{plan.description}</p>
              <div className="flex flex-wrap gap-6 text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>{plan.start_date?.slice(0, 10)} → {plan.end_date?.slice(0, 10)}</span>
                </div>
                <div className="flex items-center">
                  <span className="bg-black dark:bg-slate-700 text-white px-4 py-1 rounded-full text-sm">{plan.diet_type || 'Cân bằng'}</span>
                </div>
              </div>
            </div>
            <div className="ml-6">
              <button onClick={handleDeletePlan} className="bg-red-500 text-white px-6 py-2 rounded-full hover:bg-red-600 transition-colors duration-300 flex items-center shadow-md">
                <Trash2 className="h-5 w-5 mr-2" />
                Xóa kế hoạch
              </button>
            </div>
          </div>
        </HeroEnter>

        <Reveal y={20}>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-transparent dark:border-slate-700 p-8 mb-8">
          <h2 className="text-3xl font-serif font-bold text-black dark:text-white mb-6">Thực đơn trong tuần</h2>
          <div className="space-y-6">
            {days.map((item, idx) => (
              <RevealStaggerItem key={idx} index={idx} stagger={0.06} maxStaggerIndex={8}>
              <div className="border-l-4 border-black dark:border-slate-500 pl-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors rounded-r-lg">
                <div className="flex items-center mb-3">
                  <h3 className="text-xl font-bold text-black dark:text-white">{item.day}</h3>
                  <span className="ml-4 text-gray-500 dark:text-gray-400 text-sm">{item.date}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderMealBox(item.key, item.date, 'breakfast', 'Sáng', Sunrise, 'bg-yellow-50 dark:bg-yellow-900/20', 'text-yellow-600 dark:text-yellow-400', 'bg-yellow-600 hover:bg-yellow-700')}
                  {renderMealBox(item.key, item.date, 'lunch', 'Trưa', Sun, 'bg-orange-50 dark:bg-orange-900/20', 'text-orange-600 dark:text-orange-400', 'bg-orange-600 hover:bg-orange-700')}
                  {renderMealBox(item.key, item.date, 'dinner', 'Tối', Moon, 'bg-blue-50 dark:bg-blue-900/20', 'text-blue-600 dark:text-blue-400', 'bg-blue-600 hover:bg-blue-700')}
                </div>
              </div>
              </RevealStaggerItem>
            ))}
          </div>
        </div>
        </Reveal>

        {/* Gợi ý từ công thức */}
        <Reveal y={20}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-transparent dark:border-slate-700 p-8 mb-8">
            <h2 className="text-3xl font-serif font-bold text-black dark:text-white mb-6">Gợi ý từ công thức</h2>
            {suggestions.length > 0 ? (
              <div className="flex overflow-x-auto pb-4 hide-scrollbar gap-6 snap-x">
                {suggestions.map(recipe => (
                  <div key={recipe.id} className="min-w-[280px] w-[280px] bg-white dark:bg-slate-700 rounded-xl shadow border border-gray-100 dark:border-slate-600 snap-start flex-shrink-0 hover:shadow-lg transition-shadow">
                    <div className="h-40 relative">
                      <img src={recipe.image_url || '/assets/images/default-recipe.jpg'} className="w-full h-full object-cover rounded-t-xl" alt={recipe.title} />
                      {recipe.calories > 0 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
                          {recipe.calories} kcal
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-black dark:text-white text-lg mb-2 truncate">{recipe.title}</h3>
                      <div className="flex items-center text-gray-500 dark:text-gray-300 text-sm mb-4">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{recipe.cooking_time} phút</span>
                        <span className="mx-2">•</span>
                        <span>{recipe.difficulty}</span>
                      </div>
                      <Link to={`/recipes/${recipe.id}`} className="block text-center bg-gray-100 dark:bg-slate-600 hover:bg-black dark:hover:bg-slate-500 hover:text-white dark:text-white text-black font-semibold py-2 rounded-lg transition-colors">
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 dark:text-gray-400">
                <svg className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Hiện tại chưa có công thức của món</p>
                <p className="text-sm mt-1">Hệ thống chưa tìm thấy công thức nào khớp với thực đơn của bạn.</p>
              </div>
            )}
          </div>
        </Reveal>

        {/* Tổng quan dinh dưỡng & Biểu đồ */}
        <Reveal y={20}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-transparent dark:border-slate-700 p-8">
              <h2 className="text-3xl font-serif font-bold text-black dark:text-white mb-6">Tổng quan dinh dưỡng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
                  <svg className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-2">{nutritionTotals ? nutritionTotals.calories : 0}</h3>
                  <p className="text-gray-600 dark:text-gray-400">Calories/ngày</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-center">
                  <svg className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-2">{nutritionTotals ? nutritionTotals.protein : 0}g</h3>
                  <p className="text-gray-600 dark:text-gray-400">Protein/ngày</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 text-center">
                  <svg className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-2">{nutritionTotals ? nutritionTotals.carbs : 0}g</h3>
                  <p className="text-gray-600 dark:text-gray-400">Carbs/ngày</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
                  <svg className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-2">{nutritionTotals ? nutritionTotals.fat : 0}g</h3>
                  <p className="text-gray-600 dark:text-gray-400">Fat/ngày</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-transparent dark:border-slate-700 p-8 flex flex-col items-center justify-center">
              <h3 className="text-xl font-bold text-black dark:text-white mb-4">Tỉ lệ dinh dưỡng</h3>
              {renderDonutChart()}
            </div>
          </div>
        </Reveal>

        {/* Danh sách mua sắm */}
        <Reveal y={20}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-transparent dark:border-slate-700 p-8">
            <h2 className="text-3xl font-serif font-bold text-black dark:text-white mb-6">Danh sách mua sắm</h2>
            <div className="mb-6 flex gap-3">
              <div className="flex-1">
                <input 
                  type="text" 
                  value={shoppingName}
                  onChange={e => setShoppingName(e.target.value)}
                  placeholder="Tên nguyên liệu (VD: Thịt gà, Rau xanh...)" 
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-black dark:focus:ring-gray-300 focus:border-transparent transition-all"
                  onKeyDown={e => { if(e.key === 'Enter') handleAddShoppingItem() }}
                />
              </div>
              <div className="w-40">
                <input 
                  type="text" 
                  value={shoppingQty}
                  onChange={e => setShoppingQty(e.target.value)}
                  placeholder="Số lượng" 
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-black dark:focus:ring-gray-300 focus:border-transparent transition-all"
                  onKeyDown={e => { if(e.key === 'Enter') handleAddShoppingItem() }}
                />
              </div>
              <button onClick={handleAddShoppingItem} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap">
                <Plus className="h-5 w-5" /> Thêm
              </button>
            </div>
            
            <div className="space-y-3">
              {shoppingList.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-center py-8 italic">Chưa có nguyên liệu nào. Hãy thêm nguyên liệu bạn cần mua!</p>
              ) : (
                shoppingList.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600 group">
                    <div className="flex items-center flex-1">
                      <input 
                        type="checkbox" 
                        checked={item.checked}
                        onChange={() => handleToggleShoppingItem(item.id)}
                        className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
                      />
                      <span className={`ml-4 font-medium text-gray-800 dark:text-gray-200 ${item.checked ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500 dark:text-gray-400 mr-4 w-24 text-right">{item.quantity}</span>
                      <button onClick={() => handleDeleteShoppingItem(item.id)} className="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                        <Trash2 className="h-5 w-5"/>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {addingMeal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col">
            <div className="flex justify-between items-start p-6 border-b border-gray-100 dark:border-slate-700">
              <div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-1">Thêm món ăn vào thực đơn</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Thêm cho <span className="font-semibold text-gray-700 dark:text-gray-300">Bữa {addingMeal.type === 'breakfast' ? 'sáng' : addingMeal.type === 'lunch' ? 'trưa' : 'tối'}</span> ngày <span className="font-semibold text-gray-700 dark:text-gray-300">{addingMeal.displayDate}</span></p>
              </div>
              <button onClick={() => setAddingMeal(null)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors mt-1">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={submitMeal} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tên món ăn</label>
                  <input
                    autoFocus
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="VD: Cơm chiên dương châu, Phở bò..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:border-black dark:focus:border-gray-400 focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-all text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Ghi chú (tùy chọn)</label>
                  <textarea
                    value={mealNote}
                    onChange={(e) => setMealNote(e.target.value)}
                    placeholder="VD: Thêm tôm, bớt dầu mỡ..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:border-black dark:focus:border-gray-400 focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-all text-base resize-none"
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={!mealName.trim()} className="w-full bg-black dark:bg-white text-white dark:text-black px-4 py-3 rounded-xl font-bold text-base hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center">
                    <Plus className="h-5 w-5 mr-2" /> Thêm món
                  </button>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="button" onClick={() => setAddingMeal(null)} className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                    Đóng
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
