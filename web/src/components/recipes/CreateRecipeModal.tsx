import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { apiJson } from '../../lib/api';
import { DIFFICULTY_LEVELS } from '../../constants/recipes';
import type { RecipeCategory } from './types';

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryOptions: RecipeCategory[];
  onSuccess: () => void;
}

export default function CreateRecipeModal({
  isOpen,
  onClose,
  categoryOptions,
  onSuccess,
}: CreateRecipeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');

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
    } else {
      setImageName('');
      setPreviewImage(null);
      setFormData((prev) => ({ ...prev, imageUrl: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.categoryId) {
      setFormError('Vui lòng chọn danh mục công thức.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiJson('/api/recipes', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          category_id: formData.categoryId,
          difficulty: formData.difficulty,
          cooking_time: formData.cookingTime ? Number(formData.cookingTime) : null,
          servings: formData.servings ? Number(formData.servings) : null,
          image_url: formData.imageUrl || null,
          ingredients: formData.ingredients,
          instructions: formData.instructions,
        }),
      });

      setFormData({
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
      setPreviewImage(null);
      setImageName('');
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể đăng công thức.');
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
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col my-4 overflow-hidden border border-gray-200/80 dark:border-slate-800 shadow-2xl pointer-events-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
                <h3 className="text-2xl font-bold text-black dark:text-white">Thêm Công Thức Mới</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="overflow-y-auto flex-1 p-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Tên món ăn *</label>
                    <input type="text" required value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none" placeholder="VD: Phở Bò Hà Nội" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Mô tả ngắn</label>
                    <textarea rows={2} value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none" placeholder="Mô tả ngắn gọn về món ăn"></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Danh mục *</label>
                      <select required value={formData.categoryId || ''} onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: Number(e.target.value) || 0 }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none">
                        <option value="" className="dark:bg-slate-800">-- Chọn danh mục --</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat.id} value={cat.id} className="dark:bg-slate-800">{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Độ khó *</label>
                      <select required value={formData.difficulty} onChange={(e) => setFormData((prev) => ({ ...prev, difficulty: e.target.value }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none">
                        {DIFFICULTY_LEVELS.map((level) => (
                          <option key={level} value={level} className="dark:bg-slate-800">{level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Thời gian nấu (phút)</label>
                      <input type="number" min="1" value={formData.cookingTime} onChange={(e) => setFormData((prev) => ({ ...prev, cookingTime: e.target.value }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none" placeholder="30" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Số khẩu phần</label>
                      <input type="number" min="1" value={formData.servings} onChange={(e) => setFormData((prev) => ({ ...prev, servings: e.target.value }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none" placeholder="4" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Hình ảnh món ăn</label>
                    <div className="flex items-center gap-3">
                      <input
                        id="recipe-image"
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="sr-only"
                        required
                      />
                      <label
                        htmlFor="recipe-image"
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Chọn ảnh
                      </label>
                      <span className="text-sm text-gray-500 dark:text-slate-400 truncate">
                        {imageName || 'Chưa chọn tệp'}
                      </span>
                    </div>
                    {previewImage && (
                      <div className="mt-2">
                        <img src={previewImage} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Nguyên liệu *</label>
                    <textarea required rows={4} value={formData.ingredients} onChange={(e) => setFormData((prev) => ({ ...prev, ingredients: e.target.value }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none" placeholder="Mỗi nguyên liệu 1 dòng..."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Cách làm *</label>
                    <textarea required rows={5} value={formData.instructions} onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all outline-none" placeholder="Mỗi bước 1 dòng..."></textarea>
                  </div>
                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <div className="flex space-x-3 pt-2">
                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSubmitting ? 'Đang đăng...' : 'Đăng công thức'}</button>
                    <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-full font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Hủy</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
