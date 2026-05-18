import { useState, type KeyboardEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ChefHat, Info, Clock, Users, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiJson } from '../../lib/api';

interface RecipeRow {
  id: number;
  title: string;
  description: string;
  image_url: string;
  category_name: string;
  cooking_time: number;
  servings: number;
  match_count?: number; // returned by the API
}

export default function FridgeSearch() {
  const [inputValue, setInputValue] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  };

  const addIngredient = () => {
    const val = inputValue.trim().toLowerCase();
    if (val && !ingredients.includes(val) && ingredients.length < 10) {
      setIngredients([...ingredients, val]);
      setInputValue('');
    }
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };

  const handleSearch = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    setSearched(true);
    try {
      const q = ingredients.map(i => encodeURIComponent(i)).join(',');
      const data = await apiJson<{ recipes: RecipeRow[] }>(`/api/recipes/fridge-search?ingredients=${q}`);
      setRecipes(data.recipes || []);
    } catch (e) {
      console.error(e);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  // If ingredients become empty, reset search state
  useEffect(() => {
    if (ingredients.length === 0) {
      setRecipes([]);
      setSearched(false);
    }
  }, [ingredients]);

  return (
    <main className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
            <ChefHat className="h-8 w-8 text-amber-600 dark:text-amber-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4">
            Khám Phá Tủ Lạnh
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Bạn còn gì trong tủ lạnh? Hãy nhập các nguyên liệu bạn có sẵn, chúng tôi sẽ gợi ý những món ăn tuyệt vời nhất!
          </p>
        </div>

        {/* Search Input Box */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-amber-100 dark:border-slate-700 p-6 md:p-8 mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="VD: Trứng, Cà chua, Thịt bò (Nhấn Enter để thêm)"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-700 rounded-2xl focus:border-amber-400 dark:focus:border-amber-500 focus:ring-0 text-gray-900 dark:text-white transition-all text-lg"
                disabled={ingredients.length >= 10}
              />
            </div>
            <button
              onClick={addIngredient}
              disabled={!inputValue.trim() || ingredients.length >= 10}
              className="px-8 py-4 bg-yellow-400 text-black font-bold rounded-2xl hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg whitespace-nowrap"
            >
              Thêm
            </button>
          </div>

          {/* Tags Display */}
          <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
            <AnimatePresence>
              {ingredients.map(ing => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  key={ing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-full font-medium"
                >
                  {ing}
                  <button onClick={() => removeIngredient(ing)} className="hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-900/60">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {ingredients.length === 0 && (
              <div className="text-gray-400 dark:text-slate-500 text-sm flex items-center italic">
                Nhập nguyên liệu để bắt đầu...
              </div>
            )}
          </div>

          {/* Search Button */}
          <div className="flex justify-center border-t border-gray-100 dark:border-slate-700 pt-6">
            <button
              onClick={handleSearch}
              disabled={ingredients.length === 0 || loading}
              className="px-10 py-4 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ChefHat className="h-5 w-5" />
              )}
              {loading ? 'Đang tìm...' : 'Gợi ý món ăn'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {searched && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Kết quả phù hợp ({recipes.length})
              </h2>
              <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1 ml-4" />
            </div>

            {recipes.length === 0 && !loading ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
                <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chưa tìm thấy món nào</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Thử nhập thêm hoặc thay đổi nguyên liệu khác xem sao nhé!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe, idx) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-slate-700 flex flex-col h-full"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={recipe.image_url || '/assets/images/vietnam1.jpg'}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.src = '/assets/images/default-recipe.jpg';
                        }}
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        {recipe.category_name && (
                          <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-xs font-bold px-2.5 py-1 rounded-full text-amber-600 dark:text-amber-400">
                            {recipe.category_name}
                          </span>
                        )}
                        {recipe.match_count && (
                          <span className="bg-emerald-500/90 backdrop-blur-sm text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-sm flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Khớp {recipe.match_count}/{ingredients.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-amber-500 transition-colors">
                        {recipe.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                        {recipe.description || 'Chưa có mô tả ngắn'}
                      </p>

                      <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 mb-4 pb-4 border-b border-gray-100 dark:border-slate-700">
                        {recipe.cooking_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {recipe.cooking_time} phút
                          </div>
                        )}
                        {recipe.servings && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {recipe.servings} người
                          </div>
                        )}
                      </div>

                      <Link
                        to={`/recipes/detail/${recipe.id}`}
                        className="flex items-center justify-between text-sm font-bold text-gray-900 dark:text-white group/link"
                      >
                        <span>Xem chi tiết</span>
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center group-hover/link:bg-amber-100 dark:group-hover/link:bg-amber-900/30 group-hover/link:text-amber-600 transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
