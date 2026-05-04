import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { apiJson } from '../../lib/api';
import type { BlogCategory } from './types';

interface EditPostModalProps {
  isOpen: boolean;
  postId: number;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  categoryOptions: BlogCategory[];
  modalCategoryOptions: { value: string; label: string; id: number; name: string }[];
}

interface PostDetail {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  category_id: number;
  category_name: string;
}

export default function EditPostModal({
  isOpen,
  postId,
  onClose,
  onSuccess,
  categoryOptions,
  modalCategoryOptions,
}: EditPostModalProps) {
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
  const [isLoadingPost, setIsLoadingPost] = useState(false);

  // Load existing post data
  useEffect(() => {
    if (!isOpen || !postId) return;
    setIsLoadingPost(true);
    setFormError(null);
    setFormSuccess(null);

    apiJson<{ post: PostDetail }>(`/api/blog/posts/${postId}`)
      .then((data) => {
        const p = data.post;
        setFormData({
          title: p.title || '',
          categoryId: p.category_id || 0,
          categoryName: p.category_name || '',
          content: p.content || '',
          imageUrl: '',
        });
        setPreviewImage(p.image_url || null);
        setImageName(p.image_url ? 'Ảnh hiện tại' : '');
      })
      .catch(() => setFormError('Không thể tải dữ liệu bài viết.'))
      .finally(() => setIsLoadingPost(false));
  }, [isOpen, postId]);

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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      const body: Record<string, unknown> = {
        title: formData.title,
        category_id: formData.categoryId,
        category_name: formData.categoryName,
        content: formData.content,
      };
      // Only send image if user picked a new one
      if (formData.imageUrl) {
        body.image_url = formData.imageUrl;
      }

      await apiJson(`/api/blog/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setFormSuccess('Cập nhật bài viết thành công!');
      await onSuccess();
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể cập nhật bài viết.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col my-4 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-2xl font-bold text-black dark:text-white">Sửa Bài Viết</h3>
          <button type="button" title="Đóng" onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {isLoadingPost ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tiêu đề bài viết *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all"
                  placeholder="VD: 10 mẹo nấu ăn cần biết"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Danh mục</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all"
                  value={formData.categoryId ? String(formData.categoryId) : (formData.categoryName ? `name:${formData.categoryName}` : '')}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw.startsWith('name:')) {
                      setFormData((prev) => ({ ...prev, categoryId: 0, categoryName: raw.slice(5) }));
                      return;
                    }
                    const id = Number(raw) || 0;
                    const found = categoryOptions.find((c) => c.id === id);
                    setFormData((prev) => ({ ...prev, categoryId: id, categoryName: found?.name ?? prev.categoryName }));
                  }}
                  required
                >
                  <option value="">-- Chọn danh mục --</option>
                  {modalCategoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Thay đổi hình ảnh</label>
                <div className="flex items-center gap-3">
                  <input id="edit-blog-image" type="file" onChange={handleImageChange} accept="image/*" className="sr-only" />
                  <label htmlFor="edit-blog-image" className="inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors cursor-pointer">
                    Chọn ảnh mới
                  </label>
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{imageName || 'Giữ ảnh cũ'}</span>
                </div>
                {previewImage && (
                  <div className="mt-2 text-center">
                    <img src={previewImage} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nội dung bài viết *</label>
                <textarea
                  required
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 font-mono text-sm transition-all"
                  placeholder="Viết nội dung bài viết..."
                ></textarea>
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
      </div>
    </div>,
    document.body
  );
}
