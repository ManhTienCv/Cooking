import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Plus, ChefHat, Star, Clock, ArrowRight } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Link } from 'react-router-dom';
import AuthModal from '../../components/AuthModal';
import { apiJson } from '../../lib/api';
import { Reveal, RevealStaggerItem } from '../../components/motion/ScrollReveal';

interface RecipeListRow {
  id: number;
  title: string;
  image_url?: string | null;
  category_name?: string | null;
  difficulty?: string | null;
  cooking_time?: number | null;
  is_featured?: boolean | number;
}

export default function Recipes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>(['Tất cả']);
  
  const [recipes, setRecipes] = useState<RecipeListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<{ categories: { name: string }[] }>('/api/recipes/categories');
        const names = (data.categories ?? []).map((c) => c.name);
        if (!cancelled) setCategories(['Tất cả', ...names]);
      } catch {
        if (!cancelled) setCategories((c) => (c.length ? c : ['Tất cả']));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const searchKey = useMemo(
    () => `${searchQuery.trim()}|${selectedCategory}`,
    [searchQuery, selectedCategory]
  );

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      (async () => {
        setIsLoading(true);
        try {
          const q = new URLSearchParams();
          if (searchQuery.trim()) q.set('q', searchQuery.trim());
          if (selectedCategory && selectedCategory !== 'Tất cả') q.set('category', selectedCategory);
          q.set('limit', '24');
          q.set('offset', '0');
          const data = await apiJson<{ recipes: RecipeListRow[] }>(
            `/api/recipes/search?${q.toString()}`
          );
          if (!cancelled) setRecipes(data.recipes ?? []);
        } catch {
          if (!cancelled) setRecipes([]);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery, selectedCategory]);

  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty) {
      case 'Dễ': return 'bg-green-100 text-green-800';
      case 'Trung bình': return 'bg-yellow-100 text-yellow-800';
      case 'Khó': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPreviewImage(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-white/60 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Reveal y={16}>
            <h1 className="text-4xl font-bold text-black mb-4">Công Thức Nấu Ăn</h1>
            <p className="text-gray-600 text-lg">
              Khám phá <strong className="text-black">{recipes.length}</strong> công thức nấu ăn đa dạng
            </p>
          </Reveal>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="relative flex-1 max-w-md">
              <button className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                <Search className="h-5 w-5" />
              </button>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm công thức..." 
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-full focus:border-black focus:ring-0 transition-all duration-300 bg-white/80" 
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${selectedCategory === cat ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <button onClick={() => {
            const isAuthenticated = false; // Mock
            if (!isAuthenticated) setIsAuthOpen(true);
            else setIsModalOpen(true);
          }} className="bg-yellow-400 text-black px-6 py-3 rounded-full font-semibold hover:bg-yellow-300 transition-all duration-300 inline-flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Đăng công thức</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" key={searchKey}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/80 rounded-2xl overflow-hidden shadow-lg border border-white/20 p-5">
                <Skeleton className="w-full h-64 mb-4 rounded-xl" />
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-1/4 mt-6" />
              </div>
            ))
          ) : recipes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="mb-4">
                <ChefHat className="h-16 w-16 text-gray-300 mx-auto" />
              </div>
              <h3 className="text-gray-700 font-bold text-lg mb-2">Không có công thức nào</h3>
              <p className="text-gray-500 mb-4">Chưa có công thức nào trong danh mục này.</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Tất cả');
                }}
                className="text-yellow-600 hover:text-yellow-700 font-medium inline-flex items-center transition-colors"
              >
                Xem tất cả công thức &rarr;
              </button>
            </div>
          ) : (
            recipes.map((recipe, idx) => (
              <RevealStaggerItem key={recipe.id} index={idx} stagger={0.05} maxStaggerIndex={12}>
                <div className="bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 group border border-white/20">
                  <div className="relative overflow-hidden">
                    {recipe.image_url ? (
                      <img src={recipe.image_url} alt={recipe.title} className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-yellow-200 to-yellow-400 flex items-center justify-center">
                        <ChefHat className="h-24 w-24 text-white" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                      {recipe.is_featured && (
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                          <Star className="w-3 h-3 inline mr-1 fill-current" />Nổi bật
                        </span>
                      )}
                      <span className="bg-black/80 text-white px-3 py-1 rounded-full text-sm">
                        {recipe.category_name || 'Món chính'}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyBadgeClass(recipe.difficulty ?? 'Trung bình')}`}>
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
                    <Link to={`/recipes/detail/${recipe.id}`} className="inline-flex items-center space-x-2 text-black font-semibold hover:text-yellow-600 transition-colors duration-300 group">
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-4 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-2xl font-bold text-black">Thêm Công Thức Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên món ăn *</label>
                  <input type="text" required className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl focus:border-black focus:ring-0" placeholder="VD: Phở Bò Hà Nội" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả ngắn</label>
                  <textarea rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl focus:border-black focus:ring-0" placeholder="Mô tả ngắn gọn về món ăn"></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục *</label>
                    <select required className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl focus:border-black focus:ring-0">
                      {categories.filter(c => c !== 'Tất cả').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Độ khó *</label>
                    <select required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-black focus:ring-0">
                      <option value="Dễ">Dễ</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Khó">Khó</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian nấu (phút)</label>
                    <input type="number" min="1" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-black focus:ring-0" placeholder="30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số khẩu phần</label>
                    <input type="number" min="1" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-black focus:ring-0" placeholder="4" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh món ăn</label>
                  <input type="file" onChange={handleImageChange} accept="image/*" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-black focus:ring-0" required />
                  {previewImage && (
                    <div className="mt-2">
                      <img src={previewImage} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nguyên liệu *</label>
                  <textarea required rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-black focus:ring-0" placeholder="Mỗi nguyên liệu 1 dòng..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cách làm *</label>
                  <textarea required rows={5} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-black focus:ring-0" placeholder="Mỗi bước 1 dòng..."></textarea>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button type="submit" className="flex-1 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors">Đăng công thức</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors">Hủy</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
