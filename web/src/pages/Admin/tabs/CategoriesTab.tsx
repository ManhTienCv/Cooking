import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  Package,
  Sparkles,
  Utensils,
  FileText,
  ShoppingBag,
  CookingPot,
  ChefHat,
  Coffee,
  Flame,
  Heart,
  Wrench,
  Cpu,
  Search,
  X,
  Check,
  Loader2,
  Tag,
  BookOpen
} from 'lucide-react';
import { apiJson } from '../../../lib/api';
import toast from 'react-hot-toast';
import AdminConfirmModal from '../components/AdminConfirmModal';
import Pagination from '../../../components/ui/Pagination';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  item_count?: number;
  created_at?: string;
}

type CategoryType = 'product' | 'recipe' | 'blog';

interface CategoryStats {
  totalCategories: number;
  totalItems: number;
  activeRate: string;
}

interface CacheData {
  categories: Category[];
  stats: CategoryStats;
}

// Bảng màu cho từng Card danh mục giống ảnh mẫu CameraHub
const CARD_PALETTES = [
  {
    iconBg: 'bg-blue-50 dark:bg-blue-950/40',
    iconBorder: 'border-blue-200/70 dark:border-blue-800/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
  },
  {
    iconBg: 'bg-orange-50 dark:bg-orange-950/40',
    iconBorder: 'border-orange-200/70 dark:border-orange-800/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-700',
  },
  {
    iconBg: 'bg-purple-50 dark:bg-purple-950/40',
    iconBorder: 'border-purple-200/70 dark:border-purple-800/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-700',
  },
  {
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconBorder: 'border-emerald-200/70 dark:border-emerald-800/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
  },
  {
    iconBg: 'bg-amber-50 dark:bg-amber-950/40',
    iconBorder: 'border-amber-200/70 dark:border-amber-800/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
  },
  {
    iconBg: 'bg-rose-50 dark:bg-rose-950/40',
    iconBorder: 'border-rose-200/70 dark:border-rose-800/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700',
  },
];

// Danh mục các Icon hỗ trợ lựa chọn
const AVAILABLE_ICONS = [
  { name: 'CookingPot', label: 'Nồi & Chảo', icon: CookingPot },
  { name: 'Utensils', label: 'Dao & Dụng cụ', icon: Utensils },
  { name: 'Cpu', label: 'Thiết bị điện', icon: Cpu },
  { name: 'Wrench', label: 'Phụ kiện bếp', icon: Wrench },
  { name: 'Coffee', label: 'Đồ uống & Cà phê', icon: Coffee },
  { name: 'ChefHat', label: 'Đầu bếp', icon: ChefHat },
  { name: 'Flame', label: 'Món nướng / Lửa', icon: Flame },
  { name: 'Heart', label: 'Yêu thích / Healthy', icon: Heart },
  { name: 'ShoppingBag', label: 'Sản phẩm', icon: ShoppingBag },
  { name: 'BookOpen', label: 'Cẩm nang / Sách', icon: BookOpen },
  { name: 'Tag', label: 'Phân loại', icon: Tag },
  { name: 'Sparkles', label: 'Đặc sắc', icon: Sparkles },
];

const TABS: { key: CategoryType; label: string; icon: typeof ShoppingBag }[] = [
  { key: 'product', label: 'Đồ bếp KitchenCook', icon: ShoppingBag },
  { key: 'recipe', label: 'Công thức ẩm thực', icon: Utensils },
  { key: 'blog', label: 'Bài viết & Blog', icon: FileText },
];

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function CategoriesTab() {
  const [type, setType] = useState<CategoryType>('product');
  // Cache lưu dữ liệu cả 3 tab để chuyển đổi mượt mà 100% không nháy, không nẩy
  const [dataCache, setDataCache] = useState<Partial<Record<CategoryType, CacheData>>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal State (Thêm & Chỉnh Sửa)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'CookingPot',
  });
  const [busy, setBusy] = useState(false);

  // Confirm Delete Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: React.ReactNode;
    type: 'approve' | 'danger' | 'warning' | 'info';
    confirmText: string;
    onConfirm: () => Promise<void> | void;
  }>({
    open: false,
    title: '',
    description: '',
    type: 'info',
    confirmText: '',
    onConfirm: () => {},
  });

  // Tải dữ liệu cho 1 tab cụ thể
  const fetchTabData = useCallback(async (targetType: CategoryType): Promise<CacheData> => {
    const res = await apiJson<{
      categories: Category[];
      stats?: CategoryStats;
    }>(`/api/admin/categories/${targetType}`);

    const list = res.categories ?? [];
    const totalCats = res.stats?.totalCategories ?? list.length;
    const totalItms = res.stats?.totalItems ?? list.reduce((acc, c) => acc + (Number(c.item_count) || 0), 0);

    return {
      categories: list,
      stats: {
        totalCategories: totalCats,
        totalItems: totalItms,
        activeRate: res.stats?.activeRate ?? '100%',
      },
    };
  }, []);

  // Khởi tạo: Nạp trước cả 3 tab trong background để khi bấm chuyển trang lập tức hiển thị ngay (0ms)
  useEffect(() => {
    let isMounted = true;
    const prefetchAll = async () => {
      try {
        // Tải tab hiện tại trước để người dùng thấy ngay
        const currentData = await fetchTabData('product');
        if (!isMounted) return;
        setDataCache((prev) => ({ ...prev, product: currentData }));
        setInitialLoading(false);

        // Tải tiếp 2 tab còn lại vào bộ nhớ đệm
        const [recipeData, blogData] = await Promise.all([
          fetchTabData('recipe'),
          fetchTabData('blog'),
        ]);
        if (!isMounted) return;
        setDataCache((prev) => ({
          ...prev,
          recipe: recipeData,
          blog: blogData,
        }));
      } catch {
        if (isMounted) {
          toast.error('Không thể tải danh mục');
          setInitialLoading(false);
        }
      }
    };

    void prefetchAll();
    return () => {
      isMounted = false;
    };
  }, [fetchTabData]);

  // Làm mới tab hiện tại sau khi thêm / sửa / xóa
  const refreshCurrentTab = useCallback(async () => {
    try {
      const freshData = await fetchTabData(type);
      setDataCache((prev) => ({ ...prev, [type]: freshData }));
    } catch {
      toast.error('Không thể cập nhật danh sách');
    }
  }, [fetchTabData, type]);

  // Dữ liệu hiện tại lấy từ cache
  const activeData = dataCache[type];
  const categories = useMemo(() => activeData?.categories ?? [], [activeData]);
  const stats = useMemo(
    () => activeData?.stats ?? { totalCategories: 0, totalItems: 0, activeRate: '100%' },
    [activeData]
  );

  // Cấu hình metadata cho từng tab
  const tabConfig = useMemo(() => {
    switch (type) {
      case 'product':
        return {
          title: 'Quản lý Danh mục Hàng hóa & Đồ bếp',
          subtitle: 'Phân loại nồi niêu, chảo, dao thớt, thiết bị máy xay và phụ kiện nhà bếp độc quyền KitchenCook',
          itemUnit: 'sản phẩm',
          itemLabel: 'sản phẩm',
          iconKpi: Package,
          defaultIcon: 'CookingPot',
        };
      case 'recipe':
        return {
          title: 'Quản lý Danh mục Công thức Nấu ăn',
          subtitle: 'Phân loại công thức theo bữa ăn, chế độ dinh dưỡng, nguyên liệu và phong vị ẩm thực CookingBoy',
          itemUnit: 'công thức',
          itemLabel: 'công thức',
          iconKpi: Utensils,
          defaultIcon: 'ChefHat',
        };
      case 'blog':
        return {
          title: 'Quản lý Danh mục Bài viết & Cẩm nang',
          subtitle: 'Phân loại các bài viết chia sẻ mẹo vặt nhà bếp, kinh nghiệm chọn đồ gia dụng và kiến thức ẩm thực',
          itemUnit: 'bài viết',
          itemLabel: 'bài viết',
          iconKpi: FileText,
          defaultIcon: 'BookOpen',
        };
    }
  }, [type]);

  // Lọc danh mục theo tìm kiếm
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // Reset về trang 1 khi chuyển tab loại danh mục hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [type, searchQuery]);

  // Điều chỉnh trang nếu số lượng danh mục giảm
  useEffect(() => {
    if (currentPage > 1 && (currentPage - 1) * PAGE_SIZE >= filteredCategories.length) {
      setCurrentPage(Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE)));
    }
  }, [filteredCategories.length, currentPage]);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCategories.slice(start, start + PAGE_SIZE);
  }, [filteredCategories, currentPage]);

  const totalPages = Math.ceil(filteredCategories.length / PAGE_SIZE);

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setModalForm({
      name: '',
      slug: '',
      description: '',
      icon: tabConfig.defaultIcon,
    });
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setModalForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || tabConfig.defaultIcon,
    });
    setIsModalOpen(true);
  };

  // Đóng modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  // Lưu tạo mới / cập nhật
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = modalForm.name.trim();
    if (!trimmedName) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    const trimmedSlug = modalForm.slug.trim() ? toSlug(modalForm.slug) : toSlug(trimmedName);

    setBusy(true);
    try {
      if (editingCategory) {
        // Cập nhật
        await apiJson(`/api/admin/categories/${type}/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: trimmedName,
            slug: trimmedSlug,
            description: modalForm.description.trim() || undefined,
            icon: modalForm.icon,
          }),
        });
        toast.success('Đã cập nhật danh mục thành công!');
      } else {
        // Tạo mới
        await apiJson(`/api/admin/categories/${type}`, {
          method: 'POST',
          body: JSON.stringify({
            name: trimmedName,
            slug: trimmedSlug,
            description: modalForm.description.trim() || undefined,
            icon: modalForm.icon,
          }),
        });
        toast.success('Đã thêm danh mục mới thành công!');
      }

      setIsModalOpen(false);
      void refreshCurrentTab();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  // Xóa danh mục
  const triggerDelete = (cat: Category) => {
    const count = cat.item_count || 0;
    setConfirmModal({
      open: true,
      title: 'Xóa danh mục',
      type: 'danger',
      confirmText: 'Đồng ý xóa',
      description: (
        <div className="space-y-2 text-sm">
          <p>
            Bạn có chắc chắn muốn xóa danh mục <strong>{cat.name}</strong> không?
          </p>
          {count > 0 ? (
            <p className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs">
              ⚠️ Danh mục này hiện có <strong>{count} {tabConfig.itemUnit}</strong> liên kết. Hệ thống sẽ từ chối xóa nếu các mục chưa được chuyển sang danh mục khác.
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Hành động này sẽ gỡ bỏ phân loại vĩnh viễn khỏi hệ thống.
            </p>
          )}
        </div>
      ),
      onConfirm: async () => {
        try {
          await apiJson(`/api/admin/categories/${type}/${cat.id}`, { method: 'DELETE' });
          toast.success('Đã xóa danh mục thành công!');
          void refreshCurrentTab();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa danh mục');
        }
      },
    });
  };

  // Helper render icon động
  const renderCardIcon = (iconName: string | null | undefined, idx: number) => {
    const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
    const match = AVAILABLE_ICONS.find((item) => item.name === iconName);
    const IconComp = match ? match.icon : type === 'product' ? CookingPot : type === 'recipe' ? ChefHat : BookOpen;

    return (
      <div
        className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-2xs ${palette.iconBg} ${palette.iconBorder} ${palette.iconColor}`}
      >
        <IconComp className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="w-full space-y-8 font-vietnam">
      {/* 1. Header & Nút Thêm Mới Màu Xanh Chuẩn Hệ Thống Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/50">
              Quản lý phân loại
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {tabConfig.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {tabConfig.subtitle}
          </p>
        </div>

        {/* Nút Thêm mới chuyển sang màu Xanh (blue-600) theo yêu cầu */}
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm danh mục mới</span>
        </button>
      </div>

      {/* 2. Switcher 3 Nhóm Danh Mục — Xử lý triệt để bug nháy và nẩy bằng Framer Motion layoutId & In-memory cache */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl gap-1 border border-slate-200/60 dark:border-slate-700/80 shadow-2xs relative">
          {TABS.map((tab) => {
            const isActive = type === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (type !== tab.key) {
                    setType(tab.key);
                    setSearchQuery('');
                  }
                }}
                className={`relative isolate flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-200 border border-transparent cursor-pointer ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {/* Pill nền trắng trượt êm mượt mà không làm nẩy khung hình */}
                {isActive && (
                  <motion.div
                    layoutId="active-category-tab-pill"
                    className="absolute inset-0 rounded-xl bg-white dark:bg-slate-700 shadow-xs border border-slate-200/60 dark:border-slate-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10 shrink-0" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Thanh tìm kiếm nhanh */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Tìm nhanh danh mục...`}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all"
          />
        </div>
      </div>

      {/* 3. Khối 3 Thẻ Thống Kê KPI (Tổng danh mục, Đã phân loại, Trạng thái) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* KPI 1: Tổng Danh Mục */}
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Tổng danh mục
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {stats.totalCategories} phân loại
            </div>
          </div>
        </div>

        {/* KPI 2: Sản phẩm / Công thức / Bài viết đã phân loại */}
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <tabConfig.iconKpi className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              {tabConfig.itemLabel.toUpperCase()} đã phân loại
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {stats.totalItems} {tabConfig.itemUnit}
            </div>
          </div>
        </div>

        {/* KPI 3: Trạng Thái Danh Mục */}
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Trạng thái danh mục
            </span>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight mt-0.5">
              {stats.activeRate} Hoạt động
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lưới Card Danh Mục 3 Cột (Hiển thị mượt mà tức thì, không bị nhấp nháy skeleton khi chuyển tab) */}
      {initialLoading && !activeData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800/70 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-700 animate-pulse space-y-4 min-h-[220px]"
            >
              <div className="flex justify-between items-center">
                <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                <div className="w-20 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCategories.map((cat, idx) => {
            const overallIdx = (currentPage - 1) * PAGE_SIZE + idx;
            const palette = CARD_PALETTES[overallIdx % CARD_PALETTES.length];
            const fallbackDesc =
              type === 'product'
                ? `Bộ sưu tập đồ gia dụng và phụ kiện ${cat.name.toLowerCase()} tiêu chuẩn cao cấp tại KitchenCook.`
                : type === 'recipe'
                ? `Tổng hợp những công thức ${cat.name.toLowerCase()} ngon miệng, dễ nấu dành cho mọi gia đình.`
                : `Cẩm nang chia sẻ những mẹo và kiến thức hữu ích xoay quanh chủ đề ${cat.name.toLowerCase()}.`;

            return (
              <div
                key={cat.id}
                className={`bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${palette.hoverBorder}`}
              >
                <div>
                  {/* Hàng trên: Icon + Huy hiệu số lượng */}
                  <div className="flex items-center justify-between gap-2">
                    {renderCardIcon(cat.icon, overallIdx)}
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600/60">
                      {cat.item_count ?? 0} {tabConfig.itemUnit}
                    </span>
                  </div>

                  {/* Tên danh mục */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-4 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {cat.name}
                  </h3>

                  {/* Mô tả danh mục */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2 min-h-[34px]">
                    {cat.description || fallbackDesc}
                  </p>
                </div>

                {/* Hàng dưới: Slug tag bên trái + Nút Sửa & Xóa bên phải */}
                <div className="flex items-center justify-between pt-4 mt-5 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 max-w-[60%] overflow-hidden">
                    <span className="font-mono text-[11px] text-slate-400 shrink-0">slug:</span>
                    <code className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-mono text-[11px] truncate">
                      {cat.slug}
                    </code>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Chỉnh sửa danh mục"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => triggerDelete(cat)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Xóa danh mục"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Card Thêm Danh Mục Mới (Dashed card ở cuối trang cuối cùng hoặc khi ít hơn 10 mục) */}
          {(currentPage === totalPages || totalPages <= 1) && (
            <div
              onClick={handleOpenCreate}
              className="rounded-3xl p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/80 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] group shadow-2xs"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-600 shadow-2xs transition-all group-hover:scale-110 mb-3">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Thêm danh mục mới
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] mt-1 leading-relaxed">
                Tạo mới phân loại {tabConfig.itemLabel} hoặc thiết bị phụ trợ
              </p>
            </div>
          )}
        </div>
      )}

      {/* Phân trang khi vượt quá 10 danh mục */}
      {filteredCategories.length > PAGE_SIZE && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Hiển thị <strong className="text-slate-700 dark:text-slate-200">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredCategories.length)}</strong> -{' '}
            <strong className="text-slate-700 dark:text-slate-200">{Math.min(currentPage * PAGE_SIZE, filteredCategories.length)}</strong> trên tổng số{' '}
            <strong className="text-slate-700 dark:text-slate-200">{filteredCategories.length}</strong> danh mục
          </p>
          <div className="scale-90 sm:scale-95 origin-center sm:origin-right">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredCategories.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              autoScrollTop={false}
              activeClassName="bg-blue-600 text-white shadow-md border-blue-600 dark:bg-blue-600 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* 5. Modal Thêm / Chỉnh Sửa Danh Mục Hiện Đại Với Nút Xanh */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40">
                    {editingCategory ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">
                      {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Thuộc nhóm {type === 'product' ? 'Đồ bếp KitchenCook' : type === 'recipe' ? 'Công thức CookingBoy' : 'Bài viết Blog'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Form */}
              <form onSubmit={handleSaveCategory} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Tên danh mục */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Tên danh mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={modalForm.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setModalForm((prev) => ({
                        ...prev,
                        name: newName,
                        slug: !editingCategory ? toSlug(newName) : prev.slug,
                      }));
                    }}
                    placeholder="Ví dụ: Nồi gang đúc, Chảo chống dính..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-sm"
                  />
                </div>

                {/* Đường dẫn tĩnh (Slug) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Đường dẫn (Slug)
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">Tự động sinh từ tên</span>
                  </div>
                  <input
                    type="text"
                    value={modalForm.slug}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, slug: toSlug(e.target.value) }))}
                    placeholder="noi-gang-duc"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                  />
                </div>

                {/* Mô tả ngắn */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Mô tả danh mục
                  </label>
                  <textarea
                    rows={3}
                    value={modalForm.description}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Mô tả tóm tắt về phân loại này (1 - 2 câu)..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 text-sm resize-none"
                  />
                </div>

                {/* Chọn biểu tượng / Icon */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Biểu tượng đại diện
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {AVAILABLE_ICONS.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = modalForm.icon === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setModalForm((prev) => ({ ...prev, icon: item.name }))}
                          className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
                          }`}
                          title={item.label}
                        >
                          <IconComp className="w-5 h-5" />
                          <span className="text-[9px] truncate max-w-full font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !modalForm.name.trim()}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingCategory ? 'Lưu cập nhật' : 'Tạo danh mục'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Modal Xác Nhận Xóa */}
      <AdminConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
