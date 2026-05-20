import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { apiJson } from '../../lib/api';
import type { BlogCategory } from './types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  categoryOptions: BlogCategory[];
  modalCategoryOptions: { value: string; label: string; id: number; name: string }[];
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
  categoryOptions,
  modalCategoryOptions
}: CreatePostModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    categoryId: 0,
    categoryName: '',
    content: '',
    imageUrl: '',
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.categoryId && !formData.categoryName) {
      setFormError('Vui lòng chọn danh mục.');
      return;
    }

    if (formData.content.trim().length < 10) {
      setFormError('Nội dung bài viết cần ít nhất 10 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiJson('/api/blog/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title,
          category_id: formData.categoryId,
          category_name: formData.categoryName,
          content: formData.content,
          excerpt: formData.content.slice(0, 180),
          image_url: formData.imageUrl || null,
        }),
      });
      setFormSuccess('Đăng bài thành công. Bài viết đang chờ duyệt.');
      setFormData({ title: '', categoryId: 0, categoryName: '', content: '', imageUrl: '' });
      setPreviewImage(null);
      setImageName('');
      await onSuccess();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể đăng bài viết.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col my-4 overflow-hidden border border-gray-200/80 dark:border-slate-800 shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
          <h3 className="text-2xl font-bold text-black dark:text-white">Tạo Bài Viết Mới</h3>
          <button
            type="button"
            title="Đóng cửa sổ tạo bài viết"
            onClick={onClose}
            className="text-gray-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6">
          <form className="space-y-4" onSubmit={handleCreatePost}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Tiêu đề bài viết *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all"
                placeholder="VD: 10 mẹo nấu ăn cần biết"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Danh mục</label>
              <select
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all"
                value={formData.categoryId ? String(formData.categoryId) : (formData.categoryName ? `name:${formData.categoryName}` : '')}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw.startsWith('name:')) {
                    const name = raw.slice(5);
                    setFormData((prev) => ({ ...prev, categoryId: 0, categoryName: name }));
                    return;
                  }
                  const id = Number(raw) || 0;
                  const found = categoryOptions.find((c) => c.id === id);
                  setFormData((prev) => ({ ...prev, categoryId: id, categoryName: found?.name ?? prev.categoryName }));
                }}
                required
              >
                <option value="" className="dark:bg-slate-800">-- Chọn danh mục --</option>
                {modalCategoryOptions.map((cat) => (
                  <option key={cat.value} value={cat.value} className="dark:bg-slate-800">{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Hình ảnh đại diện</label>
              <div className="flex items-center gap-3">
                <input
                  id="blog-image"
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="sr-only"
                  required
                />
                <label
                  htmlFor="blog-image"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Chọn ảnh
                </label>
                <span className="text-sm text-gray-500 dark:text-slate-400 truncate">
                  {imageName || 'Chưa chọn tệp'}
                </span>
              </div>
              {previewImage && (
                <div className="mt-2 text-center">
                  <img src={previewImage} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Nội dung bài viết *</label>
              <textarea
                required
                rows={10}
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 font-mono text-sm transition-all"
                placeholder="Viết nội dung bài viết của bạn tại đây..."
              ></textarea>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            {formSuccess && <p className="text-sm text-green-600">{formSuccess}</p>}
            <div className="flex space-x-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="flex-1 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? 'Đang đăng...' : 'Đăng bài viết'}
              </button>
              <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-full font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
