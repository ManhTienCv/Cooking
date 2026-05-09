import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, ChefHat } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthModal from '../../components/AuthModal';
import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';

import RecipeFilterBar from '../../components/recipes/RecipeFilterBar';
import RecipeList from '../../components/recipes/RecipeList';
import CreateRecipeModal from '../../components/recipes/CreateRecipeModal';
import Pagination from '../../components/ui/Pagination';
import type { RecipeListRow, RecipeCategory } from '../../components/recipes/types';
import { LEGACY_RECIPE_CATEGORIES } from '../../constants/recipes';
import { useRecipeFilters } from '../../hooks/useRecipeFilters';

const PAGE_SIZE = 6;

export default function Recipes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [categoryOptions, setCategoryOptions] = useState<RecipeCategory[]>([]);
  const [categories, setCategories] = useState<string[]>(['Tất cả']);
  
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    setCurrentPage,
    clearFilters
  } = useRecipeFilters(categories);

  const [recipes, setRecipes] = useState<RecipeListRow[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load Categories
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<{ categories: RecipeCategory[] }>('/api/recipes/categories');
        const options = data.categories ?? [];
        if (!cancelled) {
          setCategoryOptions(options);
          setCategories(['Tất cả', ...options.map((c) => c.name)]);
        }
      } catch {
        if (!cancelled) {
          setCategoryOptions([]);
          setCategories(['Tất cả', ...LEGACY_RECIPE_CATEGORIES]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch Recipes
  const fetchRecipes = useCallback(async (hideLoading = false) => {
    if (!hideLoading) setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (searchQuery.trim()) q.set('q', searchQuery.trim());
      if (selectedCategory && selectedCategory !== 'Tất cả') q.set('category', selectedCategory);
      q.set('limit', String(PAGE_SIZE));
      q.set('offset', String((currentPage - 1) * PAGE_SIZE));
      const data = await apiJson<{ recipes: RecipeListRow[]; total?: number }>(`/api/recipes/search?${q.toString()}`);
      
      setRecipes(data.recipes ?? []);
      setTotalRecipes(data.total ?? 0);
    } catch {
      setRecipes([]);
      setTotalRecipes(0);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, currentPage]);

  useEffect(() => {
    const t = window.setTimeout(() => fetchRecipes(), 350);
    return () => clearTimeout(t);
  }, [fetchRecipes]);

  // Auth & Modal handling
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '8px';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isModalOpen]);

  const openCreateModal = async () => {
    try {
      const me = await apiJson<{ authenticated?: boolean }>('/api/auth/me');
      if (!me.authenticated) {
        setIsAuthOpen(true);
        return;
      }
      setIsModalOpen(true);
    } catch {
      setIsAuthOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Reveal y={16}>
            <h1 className="text-4xl font-serif italic font-bold text-black dark:text-white mb-4">Công Thức Nấu Ăn</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Khám phá <strong className="text-black dark:text-white">{totalRecipes}</strong> công thức nấu ăn đa dạng
            </p>
          </Reveal>
        </div>
      </div>

      <RecipeFilterBar 
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row items-center justify-center gap-4">
          <Link to="/recipes/fridge" className="bg-yellow-400 text-black px-6 py-3 rounded-full font-semibold hover:bg-yellow-300 transition-all duration-300 inline-flex items-center space-x-2 whitespace-nowrap">
            <ChefHat className="h-5 w-5" />
            <span>Khám phá Tủ lạnh</span>
          </Link>
          <button onClick={openCreateModal} className="bg-yellow-400 text-black px-6 py-3 rounded-full font-semibold hover:bg-yellow-300 transition-all duration-300 inline-flex items-center space-x-2 whitespace-nowrap">
            <Plus className="h-5 w-5" />
            <span>Đăng công thức</span>
          </button>
          <div className="relative w-full max-w-md">
            <button className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
              <Search className="h-5 w-5" />
            </button>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm công thức..." 
              className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-slate-700 rounded-full focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300 bg-white dark:bg-slate-800 text-black dark:text-white" 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <RecipeList 
          isLoading={isLoading} 
          recipes={recipes} 
          onClearFilters={clearFilters}
        />
        {!isLoading && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalRecipes}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <CreateRecipeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categoryOptions={categoryOptions}
        onSuccess={() => {
          setIsModalOpen(false);
          void fetchRecipes(true);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAuthOpen(false);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}
