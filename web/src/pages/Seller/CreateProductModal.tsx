import { useState, useEffect, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiJson } from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface Category { id: number; name: string; slug: string; type: string; }

const PRODUCT_TYPES = [
  { value: 'food', label: 'Đồ ăn' },
  { value: 'ingredient', label: 'Nguyên liệu' },
  { value: 'equipment', label: 'Dụng cụ bếp' },
];

const BLANK = {
  name: '', description: '', price: '', sale_price: '', image_url: '',
  product_type: 'food', category_id: '', stock: '', unit: 'cái',
};

export interface EditingProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  product_type: string;
  category_id: number;
  stock: number;
  unit: string;
  specs: Record<string, string>;
}

export default function CreateProductModal({ open, onClose, onCreated, product }: Props & { product?: EditingProduct | null }) {
  const [form, setForm] = useState({ ...BLANK });
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [imageName, setImageName] = useState('');

  const isEdit = !!product;

  useEffect(() => {
    if (!open) return;
    apiJson<{ categories: Category[] }>('/api/marketplace/categories')
      .then(d => setCategories(d.categories ?? []))
      .catch(() => { });
  }, [open]);

  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      if (product) {
        setForm({
          name: product.name || '',
          description: product.description || '',
          price: product.price ? String(product.price) : '',
          sale_price: product.sale_price ? String(product.sale_price) : '',
          image_url: product.image_url || '',
          product_type: product.product_type || 'food',
          category_id: product.category_id ? String(product.category_id) : '',
          stock: product.stock ? String(product.stock) : '0',
          unit: product.unit || 'cái',
        });
        const sp = product.specs || {};
        setSpecs(Object.entries(sp).map(([k, v]) => ({ key: k, value: String(v) })));
      } else {
        setForm({ ...BLANK });
        setSpecs([]);
      }
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [open, product]);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const getSpecValue = (key: string) => specs.find(s => s.key === key)?.value ?? '';

  const setSpecValue = (key: string, value: string) => {
    setSpecs(prev => {
      const idx = prev.findIndex(s => s.key === key);
      if (!value.trim()) return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], value };
        return next;
      }
      return [...prev, { key, value }];
    });
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ảnh tối đa 10MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        toast.error('Không thể đọc file ảnh.');
        return;
      }
      set('image_url', result);
      setImageName(file.name);
    };
    reader.onerror = () => toast.error('Không thể đọc file ảnh.');
    reader.readAsDataURL(file);
  };

  const filteredCats = categories.filter(c =>
    form.product_type === 'equipment' ? c.type === 'equipment' : c.type === 'food'
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Nhập tên sản phẩm'); return; }
    if (!Number(form.price) || Number(form.price) <= 0) { toast.error('Nhập giá hợp lệ'); return; }
    if (!form.category_id) { toast.error('Chọn danh mục'); return; }

    setSubmitting(true);
    try {
      const specsObj: Record<string, string> = {};
      specs.forEach(s => { if (s.key.trim()) specsObj[s.key.trim()] = s.value.trim(); });

      const endpoint = isEdit ? `/api/marketplace/seller/products/${product.id}` : '/api/marketplace/seller/products';
      const method = isEdit ? 'PUT' : 'POST';

      await apiJson(endpoint, {
        method,
        body: JSON.stringify({
          ...(isEdit ? {} : { name: form.name.trim() }), // name cannot be edited
          description: form.description.trim() || null,
          price: Number(form.price),
          sale_price: form.sale_price ? Number(form.sale_price) : null,
          image_url: form.image_url.trim() || null,
          images: [],
          product_type: form.product_type,
          category_id: Number(form.category_id),
          stock: Number(form.stock) || 0,
          unit: form.unit.trim() || 'cái',
          specs: specsObj,
        }),
      });
      toast.success(isEdit ? 'Đã cập nhật sản phẩm!' : 'Đã tạo sản phẩm! Đang chờ admin duyệt.');
      setForm({ ...BLANK });
      setSpecs([]);
      setImageName('');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tạo sản phẩm');
    } finally { setSubmitting(false); }
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all';
  const labelCls = 'text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-700">

            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isEdit ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Product type */}
              <div>
                <label className={labelCls}>Loại sản phẩm</label>
                <div className="flex gap-2">
                  {PRODUCT_TYPES.map(t => (
                    <button key={t.value} onClick={() => {
                      if (isEdit) return; // Prevent changing type in edit mode
                      set('product_type', t.value);
                      set('category_id', '');
                      set('unit', t.value === 'food' ? 'phần' : t.value === 'ingredient' ? 'kg' : 'cái');
                    }}
                      disabled={isEdit}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${form.product_type === t.value
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                        : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600'
                        } ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* Type-specific hint */}
                <div className={`mt-2.5 text-xs px-3 py-2 rounded-lg border ${form.product_type === 'food'
                    ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/20 text-orange-700 dark:text-orange-400'
                    : form.product_type === 'ingredient'
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800/20 text-green-700 dark:text-green-400'
                      : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/20 text-blue-700 dark:text-blue-400'
                  }`}>
                  {form.product_type === 'food' && 'Các món ăn chế biến sẵn, đồ ăn vặt, bánh, đồ uống...'}
                  {form.product_type === 'ingredient' && 'Nguyên liệu tươi sống, gia vị, bột, nước sốt...'}
                  {form.product_type === 'equipment' && 'Dụng cụ nhà bếp, nồi, chảo, máy xay, dao...'}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={labelCls}>Tên sản phẩm *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder={form.product_type === 'food' ? 'VD: Phở bò tái chín, Bánh tráng trộn...' : form.product_type === 'ingredient' ? 'VD: Bột mì Hàn Quốc 1kg, Nước mắm Phú Quốc...' : 'VD: Chảo chống dính 28cm, Máy xay sinh tố...'}
                  disabled={isEdit}
                  className={`${inputCls} ${isEdit ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 cursor-not-allowed opacity-70 border-dashed' : ''}`} />
              </div>

              {/* Category */}
              <div>
                <label className={labelCls}>Danh mục *</label>
                <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
                  className={inputCls + ' cursor-pointer'}>
                  <option value="">— Chọn danh mục —</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Price row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Giá gốc (đ) *</label>
                  <input
                    type="number"
                    name="product_price"
                    min="0"
                    inputMode="decimal"
                    autoComplete="off"
                    defaultValue={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="50000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Giá khuyến mãi (đ)</label>
                  <input
                    type="number"
                    name="product_sale_price"
                    min="0"
                    inputMode="decimal"
                    autoComplete="off"
                    defaultValue={form.sale_price}
                    onChange={e => set('sale_price', e.target.value)}
                    placeholder="Để trống nếu không"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Stock + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tồn kho</label>
                  <input
                    type="number"
                    name="product_stock"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    autoComplete="off"
                    defaultValue={form.stock}
                    onChange={e => set('stock', e.target.value)}
                    placeholder="100"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Đơn vị</label>
                  <input value={form.unit} onChange={e => set('unit', e.target.value)}
                    placeholder={form.product_type === 'food' ? 'phần, hộp, gói...' : form.product_type === 'ingredient' ? 'kg, lít, gói...' : 'cái, bộ, chiếc...'}
                    className={inputCls} />
                </div>
              </div>

              {/* Type-specific fields */}
              {form.product_type === 'food' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Khẩu phần</label>
                    <input
                      value={getSpecValue('Khẩu phần')}
                      placeholder="VD: 1-2 người"
                      onChange={e => setSpecValue('Khẩu phần', e.target.value)}
                      autoComplete="off"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Hạn sử dụng</label>
                    <input
                      value={getSpecValue('Hạn sử dụng')}
                      placeholder="VD: 3 ngày, 1 tháng"
                      onChange={e => setSpecValue('Hạn sử dụng', e.target.value)}
                      autoComplete="off"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {form.product_type === 'ingredient' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Xuất xứ</label>
                    <input
                      value={getSpecValue('Xuất xứ')}
                      placeholder="VD: Việt Nam, Hàn Quốc"
                      onChange={e => setSpecValue('Xuất xứ', e.target.value)}
                      autoComplete="off"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Khối lượng</label>
                    <input
                      value={getSpecValue('Khối lượng')}
                      placeholder="VD: 500g, 1 lít"
                      onChange={e => setSpecValue('Khối lượng', e.target.value)}
                      autoComplete="off"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {form.product_type === 'equipment' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Thương hiệu</label>
                    <input
                      value={getSpecValue('Thương hiệu')}
                      placeholder="VD: Tefal, Sunhouse"
                      onChange={e => setSpecValue('Thương hiệu', e.target.value)}
                      autoComplete="off"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Bảo hành</label>
                    <input
                      value={getSpecValue('Bảo hành')}
                      placeholder="VD: 12 tháng, 2 năm"
                      onChange={e => setSpecValue('Bảo hành', e.target.value)}
                      autoComplete="off"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* Product image */}
              <div>
                <label className={labelCls}>Ảnh sản phẩm</label>
                <label className={`${inputCls} cursor-pointer flex items-center justify-between gap-3`}>
                  <span className={`truncate ${imageName ? '' : 'text-gray-400 dark:text-gray-500'}`}>
                    {imageName || 'Chọn ảnh từ thiết bị'}
                  </span>
                  <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input type="file" accept="image/*" onChange={handleImageFileChange} className="sr-only" />
                </label>
                {form.image_url && (
                  <div className="mt-3 flex items-start gap-3">
                    <img
                      src={form.image_url}
                      alt="preview"
                      className="h-24 w-24 rounded-xl object-cover border border-gray-200 dark:border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        set('image_url', '');
                        setImageName('');
                      }}
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Mô tả</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} placeholder="Mô tả chi tiết sản phẩm..." className={inputCls + ' resize-none'} />
              </div>

              {/* Specs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls + ' mb-0'}>Thông số kỹ thuật</label>
                  <button onClick={() => setSpecs(s => [...s, { key: '', value: '' }])}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Thêm
                  </button>
                </div>
                {specs.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={s.key} onChange={e => { const n = [...specs]; n[i].key = e.target.value; setSpecs(n); }}
                      placeholder="Tên" className={inputCls + ' flex-1'} />
                    <input value={s.value} onChange={e => { const n = [...specs]; n[i].value = e.target.value; setSpecs(n); }}
                      placeholder="Giá trị" className={inputCls + ' flex-1'} />
                    <button onClick={() => setSpecs(s => s.filter((_, j) => j !== i))}
                      className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 px-6 py-4 flex justify-end gap-3 rounded-b-3xl z-10">
              <button onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                Hủy
              </button>
              <button onClick={() => void handleSubmit()} disabled={submitting}
                className="px-6 py-2.5 rounded-xl font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50">
                {submitting ? 'Đang xử lý...' : isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
