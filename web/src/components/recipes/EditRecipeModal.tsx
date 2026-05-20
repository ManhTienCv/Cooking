import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { apiJson } from '../../lib/api';
import { DIFFICULTY_LEVELS } from '../../constants/recipes';
import type { RecipeCategory } from './types';

interface EditRecipeModalProps {
  isOpen: boolean;
  recipeId: number;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  categoryOptions: RecipeCategory[];
}

interface RecipeDetail {
  id: number;
  title: string;
  description: string | null;
  ingredients: string;
  instructions: string;
  difficulty: string;
  cooking_time: number | null;
  servings: number | null;
  image_url: string | null;
  category_id: number;
  category_name: string;
}

export default function EditRecipeModal({
  isOpen,
  recipeId,
  onClose,
  onSuccess,
  categoryOptions,
}: EditRecipeModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: 0,
    difficulty: 'Trung bình',
    cookingTime: '',
    servings: '',
    imageUrl: '',
    ingredients: '',
    instructions: '',
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  useEffect(() => {
    if (!isOpen || !recipeId) return;
    setIsLoadingRecipe(true);
    setFormError(null);
    setFormSuccess(null);

    apiJson<{ recipe: RecipeDetail }>(`/api/recipes/${recipeId}`)
      .then((data) => {
        const r = data.recipe;
        setFormData({
          title: r.title || '',
          description: r.description || '',
          categoryId: r.category_id || 0,
          difficulty: r.difficulty || 'Trung bình',
          cookingTime: r.cooking_time ? String(r.cooking_time) : '',
          servings: r.servings ? String(r.servings) : '',
          imageUrl: '',
          ingredients: r.ingredients || '',
          instructions: r.instructions || '',
        });
        setPreviewImage(r.image_url || null);
        setImageName(r.image_url ? 'Ảnh hiện tại' : '');
      })
      .catch(() => setFormError('Không thể tải dữ liệu công thức.'))
      .finally(() => setIsLoadingRecipe(false));
  }, [isOpen, recipeId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = evt.target?.result as string;
        setPreviewImage(img);
        setFormData((prev) => ({ ...prev, imageUrl: img }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.categoryId) {
      setFormError('Vui lòng chọn danh mục.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || null,
        category_id: formData.categoryId,
        difficulty: formData.difficulty,
        cooking_time: formData.cookingTime ? Number(formData.cookingTime) : null,
        servings: formData.servings ? Number(formData.servings) : null,
        ingredients: formData.ingredients,
        instructions: formData.instructions,
      };
      if (formData.imageUrl) {
        body.image_url = formData.imageUrl;
      }

      await apiJson(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setFormSuccess('Cập nhật công thức thành công!');
      await onSuccess();
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể cập nhật công thức.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />
          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col my-4 overflow-hidden shadow-2xl border border-gray-200/80 dark:border-slate-800 pointer-events-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
                <h3 className="text-2xl font-bold text-black dark:text-white">Sửa Công Thức</h3>
                <button type="button" title="Đóng" onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {isLoadingRecipe ? (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</div>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tên món ăn *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none"
                        placeholder="VD: Phở Bò Hà Nội"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mô tả ngắn</label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none"
                        placeholder="Mô tả ngắn gọn về món ăn"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Danh mục *</label>
                        <select
                          required
                          value={formData.categoryId || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: Number(e.target.value) || 0 }))}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none"
                        >
                          <option value="">-- Chọn --</option>
                          {categoryOptions.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Độ khó *</label>
                        <select
                          required
                          value={formData.difficulty}
                          onChange={(e) => setFormData((prev) => ({ ...prev, difficulty: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none"
                        >
                          {DIFFICULTY_LEVELS.map((level) => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Thời gian nấu (phút)</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.cookingTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, cookingTime: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none"
                          placeholder="30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Số khẩu phần</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.servings}
                          onChange={(e) => setFormData((prev) => ({ ...prev, servings: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none"
                          placeholder="4"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Thay đổi hình ảnh</label>
                      <div className="flex items-center gap-3">
                        <input id="edit-recipe-image" type="file" onChange={handleImageChange} accept="image/*" className="sr-only" />
                        <label
                          htmlFor="edit-recipe-image"
                          className="inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                        >
                          Chọn ảnh mới
                        </label>
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{imageName || 'Giữ ảnh cũ'}</span>
                      </div>
                      {previewImage && (
                        <div className="mt-2">
                          <img src={previewImage} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nguyên liệu *</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.ingredients}
                        onChange={(e) => setFormData((prev) => ({ ...prev, ingredients: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none"
                        placeholder="Mỗi nguyên liệu 1 dòng..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cách làm *</label>
                      <textarea
                        required
                        rows={5}
                        value={formData.instructions}
                        onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none"
                        placeholder="Mỗi bước 1 dòng..."
                      />
                    </div>

                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                    {formSuccess && <p className="text-sm text-green-600">{formSuccess}</p>}

                    <div className="flex space-x-3 pt-2">
                      <button type="submit" disabled={isSubmitting} className="flex-1 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                      <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 dark:border-slate-600 rounded-full font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-black dark:text-white">
                        Hủy
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
