import { useState, useEffect, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Sliders,
  DollarSign,
  Package,
  Layers,
  FileText,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiJson } from '../../../lib/api';

export interface AdminProductDetail {
  id?: number;
  name: string;
  slug?: string;
  category_id: number | '';
  product_type: string;
  price: number | '';
  sale_price: number | '' | null;
  stock: number | '';
  unit: string;
  image_url: string;
  images: string[];
  specs: Record<string, any>;
  description: string;
  is_featured: boolean;
  is_available: boolean;
  status?: string;
}

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  type: string;
}

interface AdminProductModalProps {
  open: boolean;
  product?: AdminProductDetail | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_FORM: AdminProductDetail = {
  name: '',
  category_id: '',
  product_type: 'equipment',
  price: '',
  sale_price: '',
  stock: '',
  unit: 'cái',
  image_url: '',
  images: [],
  specs: {},
  description: '',
  is_featured: false,
  is_available: true,
};

export default function AdminProductModal({
  open,
  product,
  onClose,
  onSuccess,
}: AdminProductModalProps) {
  const isEdit = Boolean(product && product.id);

  const [form, setForm] = useState<AdminProductDetail>({ ...DEFAULT_FORM });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Key Features (string list)
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  // Dynamic Specs (key-value list)
  const [specList, setSpecList] = useState<{ key: string; value: string }[]>([]);
  // Input helper for gallery URL
  const [newGalleryUrl, setNewGalleryUrl] = useState('');

  // Fetch product categories when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingCategories(true);
    apiJson<{ categories: CategoryOption[] }>('/api/marketplace/categories')
      .then((res) => setCategories(res.categories || []))
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, [open]);

  // Sync product prop into local state
  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      if (product) {
        setForm({
          id: product.id,
          name: product.name || '',
          slug: product.slug || '',
          category_id: product.category_id ?? '',
          product_type: product.product_type || 'equipment',
          price: product.price ?? '',
          sale_price: product.sale_price ?? '',
          stock: product.stock ?? 0,
          unit: product.unit || 'cái',
          image_url: product.image_url || '',
          images: Array.isArray(product.images)
            ? product.images
            : typeof product.images === 'string'
            ? JSON.parse(product.images || '[]')
            : [],
          specs: product.specs || {},
          description: product.description || '',
          is_featured: Boolean(product.is_featured),
          is_available: product.is_available !== undefined ? Boolean(product.is_available) : true,
          status: product.status || 'approved',
        });

        // Parse key features from specs.key_features if available
        const rawSpecs = product.specs || {};
        if (Array.isArray(rawSpecs.key_features)) {
          setKeyFeatures([...rawSpecs.key_features]);
        } else {
          setKeyFeatures([]);
        }

        // Parse key-value specs excluding key_features
        const list: { key: string; value: string }[] = [];
        Object.entries(rawSpecs).forEach(([k, v]) => {
          if (k !== 'key_features' && typeof v !== 'object') {
            list.push({ key: k, value: String(v) });
          }
        });
        setSpecList(list);
      } else {
        setForm({ ...DEFAULT_FORM });
        setKeyFeatures(['', '', '']);
        setSpecList([
          { key: 'Thương hiệu', value: '' },
          { key: 'Chất liệu', value: '' },
          { key: 'Xuất xứ', value: '' },
          { key: 'Bảo hành', value: '30 ngày' },
        ]);
      }
      setNewGalleryUrl('');
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [open, product]);

  const updateField = <K extends keyof AdminProductDetail>(key: K, value: AdminProductDetail[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Cover image upload
  const handleCoverFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh hợp lệ.');
      e.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa 8MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateField('image_url', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Gallery image upload
  const handleGalleryFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh hợp lệ.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateField('images', [...form.images, reader.result]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add gallery image from URL
  const handleAddGalleryUrl = () => {
    if (!newGalleryUrl.trim()) return;
    updateField('images', [...form.images, newGalleryUrl.trim()]);
    setNewGalleryUrl('');
  };

  // Remove gallery image
  const handleRemoveGalleryImage = (index: number) => {
    updateField('images', form.images.filter((_, i) => i !== index));
  };

  // Key Features handlers
  const handleAddKeyFeature = () => {
    setKeyFeatures((prev) => [...prev, '']);
  };
  const handleUpdateKeyFeature = (index: number, val: string) => {
    setKeyFeatures((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };
  const handleRemoveKeyFeature = (index: number) => {
    setKeyFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  // Specs handlers
  const handleAddSpec = () => {
    setSpecList((prev) => [...prev, { key: '', value: '' }]);
  };
  const handleUpdateSpec = (index: number, field: 'key' | 'value', val: string) => {
    setSpecList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };
  const handleRemoveSpec = (index: number) => {
    setSpecList((prev) => prev.filter((_, i) => i !== index));
  };

  // Discount calculation
  const numPrice = Number(form.price) || 0;
  const numSalePrice = Number(form.sale_price) || 0;
  const discountPercent =
    numSalePrice > 0 && numSalePrice < numPrice
      ? Math.round(((numPrice - numSalePrice) / numPrice) * 100)
      : null;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm.');
      return;
    }
    if (!form.category_id) {
      toast.error('Vui lòng chọn danh mục sản phẩm.');
      return;
    }
    if (Number(form.price) <= 0) {
      toast.error('Giá bán niêm yết phải lớn hơn 0.');
      return;
    }
    if (form.stock === '' || Number(form.stock) < 0) {
      toast.error('Số lượng tồn kho không thể âm.');
      return;
    }

    setSubmitting(true);
    try {
      // Build specs object
      const finalSpecs: Record<string, any> = {};
      specList.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          finalSpecs[s.key.trim()] = s.value.trim();
        }
      });
      const validFeatures = keyFeatures.map((f) => f.trim()).filter(Boolean);
      if (validFeatures.length > 0) {
        finalSpecs.key_features = validFeatures;
      }

      const payload = {
        name: form.name.trim(),
        category_id: Number(form.category_id),
        product_type: form.product_type,
        price: Number(form.price),
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        stock: Number(form.stock),
        unit: form.unit.trim() || 'cái',
        image_url: form.image_url.trim() || null,
        images: form.images,
        specs: finalSpecs,
        description: form.description.trim() || null,
        is_featured: form.is_featured,
        is_available: Number(form.stock) > 0 ? form.is_available : false,
      };

      if (isEdit && form.id) {
        await apiJson(`/api/admin/marketplace/products/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        await apiJson('/api/admin/marketplace/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Đăng sản phẩm mới thành công!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi lưu sản phẩm.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  {isEdit ? 'Chỉnh sửa sản phẩm' : 'Đăng sản phẩm mới'}
                  {isEdit && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
                      ID: #{form.id}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Điền thông tin chi tiết, cấu hình hình ảnh và thông số kỹ thuật cho gian hàng KitchenCook.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Thông tin cơ bản & Phân loại */}
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                1. Thông tin cơ bản & Phân loại
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Ví dụ: Nồi chiên không dầu Philips HD9252 4.1L điện tử"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Danh mục sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => updateField('category_id', e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">{loadingCategories ? '-- Đang tải danh mục... --' : '-- Chọn danh mục đồ bếp --'}</option>
                    {categories
                      .filter((c) => c.type === 'equipment')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Loại sản phẩm
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-sm text-slate-800 dark:text-white font-medium">
                    <span>🍳 Đồ bếp & Dụng cụ làm bếp</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold ml-auto">
                      Chính hãng
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đơn vị tính
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => updateField('unit', e.target.value)}
                    placeholder="cái, bộ, chiếc, kg, hộp..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => updateField('is_featured', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Sản phẩm nổi bật (HOT badge)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.is_available && Number(form.stock) > 0}
                      disabled={Number(form.stock) <= 0}
                      onChange={(e) => updateField('is_available', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 disabled:opacity-50"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Kích hoạt bán ngay (Hiển thị ở cửa hàng)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 2: Giá bán & Tồn kho */}
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                  2. Giá bán & Quản lý tồn kho
                </div>
                {discountPercent !== null && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                    Giảm -{discountPercent}%
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giá niêm yết (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={form.price}
                    onChange={(e) => updateField('price', e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ví dụ: 1500000"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giá khuyến mãi (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={form.sale_price ?? ''}
                    onChange={(e) => updateField('sale_price', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Bỏ trống nếu không sale"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số lượng trong kho <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.stock}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : 0;
                      updateField('stock', val);
                      if (val <= 0) {
                        updateField('is_available', false);
                      }
                    }}
                    placeholder="Ví dụ: 20"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Hình ảnh sản phẩm (CameraHub style) */}
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                3. Hình ảnh sản phẩm
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ảnh đại diện chính (Cover Image)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input
                    type="text"
                    value={form.image_url}
                    onChange={(e) => updateField('image_url', e.target.value)}
                    placeholder="Nhập đường dẫn URL ảnh hoặc chọn tải lên từ máy tính..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" /> Tải ảnh lên
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload} />
                  </label>
                </div>

                {form.image_url && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-purple-500/50 bg-slate-100 dark:bg-slate-800 shadow-sm">
                      <img src={form.image_url} alt="Cover Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => updateField('image_url', '')}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-md transition-colors"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Xem trước ảnh bìa chính</span>
                  </div>
                )}
              </div>

              {/* Gallery Images */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bộ sưu tập ảnh chi tiết (Gallery Images)
                </label>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <input
                    type="text"
                    value={newGalleryUrl}
                    onChange={(e) => setNewGalleryUrl(e.target.value)}
                    placeholder="URL ảnh phụ bổ sung..."
                    className="flex-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddGalleryUrl}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
                  >
                    + Thêm URL
                  </button>
                  <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" /> Tải thêm
                    <input type="file" accept="image/*" className="hidden" onChange={handleGalleryFileUpload} />
                  </label>
                </div>

                {form.images.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5 mt-3">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group">
                        <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(idx)}
                          className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          title="Xóa ảnh"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">Chưa có ảnh gallery bổ sung nào.</p>
                )}
              </div>
            </div>

            {/* Section 4: Đặc điểm nổi bật (Key Features) */}
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  4. Đặc điểm nổi bật (Key Features)
                </div>
                <button
                  type="button"
                  onClick={handleAddKeyFeature}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm đặc điểm
                </button>
              </div>

              <div className="space-y-2">
                {keyFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs font-bold text-slate-400">•</span>
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => handleUpdateKeyFeature(idx, e.target.value)}
                      placeholder={`Đặc điểm nổi bật ${idx + 1} (Ví dụ: Lòng nồi chống dính ceramic cao cấp không bong tróc)`}
                      className="flex-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyFeature(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="Xóa dòng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: Thông số kỹ thuật chi tiết (Specifications) */}
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <Sliders className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  5. Thông số kỹ thuật chi tiết
                </div>
                <button
                  type="button"
                  onClick={handleAddSpec}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm thông số
                </button>
              </div>

              <div className="space-y-2">
                {specList.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) => handleUpdateSpec(idx, 'key', e.target.value)}
                      placeholder="Tên thông số (e.g. Công suất, Dung tích, Xuất xứ...)"
                      className="w-1/3 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-800 dark:text-white font-medium"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => handleUpdateSpec(idx, 'value', e.target.value)}
                      placeholder="Giá trị thông số (e.g. 1800W, 5 Lít, Ba Lan...)"
                      className="flex-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="Xóa thông số"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 6: Mô tả chi tiết sản phẩm */}
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                6. Bài viết mô tả chi tiết sản phẩm
              </div>

              <div>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Nhập nội dung mô tả chi tiết, câu chuyện sản phẩm, hướng dẫn sử dụng và bảo hành..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? 'Cập nhật sản phẩm' : 'Đăng sản phẩm ngay'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
