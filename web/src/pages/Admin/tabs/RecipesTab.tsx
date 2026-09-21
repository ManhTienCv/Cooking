import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Utensils,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  Eye,
  X,
  XCircle,
  ExternalLink,
  ChefHat,
  Filter,
  Check,
  Eye as ViewsIcon,
} from 'lucide-react';
import { apiJson } from '../../../lib/api';
import AdminConfirmModal from '../components/AdminConfirmModal';
import Pagination from '../../../components/ui/Pagination';

export interface AdminRecipeItem {
  id: number;
  title: string;
  status: 'approved' | 'pending' | 'rejected' | string;
  created_at: string;
  category_name?: string | null;
  author_name?: string | null;
  author_email?: string | null;
  image_url?: string | null;
  cooking_time?: number | null;
  difficulty?: string | null;
  views?: number | null;
  description?: string | null;
}

export default function RecipesTab() {
  const [recipes, setRecipes] = useState<AdminRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<AdminRecipeItem | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const loadRecipes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiJson<{ recipes: AdminRecipeItem[] }>('/api/admin/recipes?status=all');
      setRecipes(data.recipes ?? []);
    } catch (err) {
      console.error(err);
      if (!silent) {
        toast.error('Lỗi khi tải danh sách công thức', { id: 'admin-load-recipes-error' });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of recipes) {
      if (r.category_name) set.add(r.category_name);
    }
    return Array.from(set).sort();
  }, [recipes]);

  // Thống kê nhanh KPI
  const stats = useMemo(() => {
    const total = recipes.length;
    const approved = recipes.filter((r) => r.status === 'approved').length;
    const pending = recipes.filter((r) => r.status === 'pending').length;
    const rejected = recipes.filter((r) => r.status === 'rejected').length;
    return { total, approved, pending, rejected };
  }, [recipes]);

  // Bộ lọc dữ liệu
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.title?.toLowerCase().includes(q) ||
        r.author_name?.toLowerCase().includes(q) ||
        String(r.id).includes(q);

      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchCat = categoryFilter === 'all' || r.category_name === categoryFilter;

      return matchSearch && matchStatus && matchCat;
    });
  }, [recipes, searchQuery, statusFilter, categoryFilter]);

  // Reset trang khi lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  // Dữ liệu phân trang
  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecipes.slice(start, start + PAGE_SIZE);
  }, [filteredRecipes, currentPage]);

  const triggerRecipeAction = useCallback(
    (id: number, action: 'approve' | 'reject' | 'delete', title: string) => {
      const isDelete = action === 'delete';
      const isApprove = action === 'approve';

      let modalTitle = 'Xóa công thức';
      let type: 'approve' | 'danger' | 'warning' | 'info' = 'danger';
      let confirmText = 'Đồng ý xóa';
      let desc = (
        <span>
          Bạn có chắc chắn muốn <strong>xóa vĩnh viễn</strong> công thức <strong>"{title}"</strong> (ID #{id}) không?
          Hành động này không thể hoàn tác.
        </span>
      );

      if (isApprove) {
        modalTitle = 'Duyệt công thức';
        type = 'approve';
        confirmText = 'Đồng ý duyệt';
        desc = (
          <span>
            Bạn có chắc chắn muốn <strong>duyệt</strong> và phát hành công thức <strong>"{title}"</strong> không?
          </span>
        );
      } else if (action === 'reject') {
        modalTitle = 'Từ chối công thức';
        type = 'warning';
        confirmText = 'Đồng ý từ chối';
        desc = (
          <span>
            Bạn có chắc chắn muốn <strong>từ chối</strong> công thức <strong>"{title}"</strong> không?
          </span>
        );
      }

      setConfirmModal({
        open: true,
        title: modalTitle,
        type,
        confirmText,
        description: desc,
        onConfirm: async () => {
          if (isDelete) {
            try {
              await apiJson(`/api/admin/recipes/${id}`, { method: 'DELETE' });
              toast.success(`Đã xóa công thức #${id} thành công!`);
              if (selectedRecipe?.id === id) setSelectedRecipe(null);
            } catch {
              toast.error('Lỗi khi xóa công thức');
            }
          } else {
            try {
              await apiJson(`/api/admin/recipes/${id}/${action}`, { method: 'POST' });
              toast.success(`Đã ${isApprove ? 'duyệt' : 'từ chối'} công thức thành công!`);
              if (selectedRecipe?.id === id) {
                setSelectedRecipe((prev) => (prev ? { ...prev, status: isApprove ? 'approved' : 'rejected' } : null));
              }
            } catch {
              toast.error('Lỗi khi cập nhật trạng thái');
            }
          }
          void loadRecipes(true);
        },
      });
    },
    [loadRecipes, selectedRecipe]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <div className="w-9 h-9 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-xs">Đang tải danh sách công thức...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng số */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng công thức</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
        </div>

        {/* Đã duyệt */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đã phê duyệt</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.approved}</p>
          </div>
        </div>

        {/* Chờ duyệt */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chờ kiểm duyệt</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.pending}</p>
          </div>
        </div>

        {/* Từ chối */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đã từ chối</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.rejected}</p>
          </div>
        </div>
      </div>

      {/* 2. Control Bar: Search, Category & Status Tabs */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên công thức, tác giả, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="all">Tất cả danh mục ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-4 flex-wrap">
          <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider">Trạng thái:</span>
          {(['all', 'approved', 'pending', 'rejected'] as const).map((st) => {
            const active = statusFilter === st;
            const count =
              st === 'all'
                ? recipes.length
                : st === 'approved'
                ? stats.approved
                : st === 'pending'
                ? stats.pending
                : stats.rejected;

            const label =
              st === 'all' ? 'Tất cả' : st === 'approved' ? 'Đã duyệt' : st === 'pending' ? 'Chờ duyệt' : 'Từ chối';

            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-5 py-4 w-16">ID</th>
                <th className="px-5 py-4">Món ăn / Công thức</th>
                <th className="px-5 py-4">Tác giả</th>
                <th className="px-5 py-4">Danh mục</th>
                <th className="px-5 py-4">Thông số</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {paginatedRecipes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">Không tìm thấy công thức nào</p>
                    <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa hoặc bộ lọc danh mục.</p>
                  </td>
                </tr>
              ) : (
                paginatedRecipes.map((r) => {
                  const isApproved = r.status === 'approved';
                  const isPending = r.status === 'pending';

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group"
                    >
                      {/* ID */}
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-400">
                        #{r.id}
                      </td>

                      {/* Title & Image */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600">
                            {r.image_url ? (
                              <img
                                src={r.image_url}
                                alt={r.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <ChefHat className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <button
                              type="button"
                              onClick={() => setSelectedRecipe(r)}
                              className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-left line-clamp-1 cursor-pointer transition-colors"
                            >
                              {r.title}
                            </button>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(r.created_at).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {r.author_name ? r.author_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {r.author_name || 'Người dùng'}
                            </p>
                            {r.author_email && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{r.author_email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          {r.category_name || 'Chưa phân loại'}
                        </span>
                      </td>

                      {/* Stats / Cooking time / Views */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                          {r.cooking_time ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              {r.cooking_time} phút
                            </span>
                          ) : null}
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <ViewsIcon className="w-3 h-3" />
                            {r.views || 0} lượt xem
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isApproved ? 'bg-emerald-500' : isPending ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          {isApproved ? 'Đã duyệt' : isPending ? 'Chờ duyệt' : 'Từ chối'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Preview */}
                          <button
                            type="button"
                            onClick={() => setSelectedRecipe(r)}
                            title="Xem chi tiết"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Approve button if pending */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => triggerRecipeAction(r.id, 'approve', r.title)}
                                title="Duyệt bài"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerRecipeAction(r.id, 'reject', r.title)}
                                title="Từ chối bài"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => triggerRecipeAction(r.id, 'delete', r.title)}
                            title="Xóa công thức"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Thanh Phân Trang Ngang Ở Dưới Cùng (Prominent Horizontal Pagination Bar) */}
        {filteredRecipes.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hiển thị{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredRecipes.length)}
              </strong>{' '}
              -{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.min(currentPage * PAGE_SIZE, filteredRecipes.length)}
              </strong>{' '}
              trên tổng số{' '}
              <strong className="text-slate-800 dark:text-slate-200">{filteredRecipes.length}</strong> công thức
            </p>

            <div className="scale-90 sm:scale-95 origin-center sm:origin-right">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredRecipes.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                autoScrollTop={false}
                className=""
                activeClassName="bg-emerald-600 text-white shadow-md border-emerald-600 dark:bg-emerald-600 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal Xem Chi Tiết Công Thức */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="relative h-48 bg-slate-100 dark:bg-slate-700">
              {selectedRecipe.image_url ? (
                <img
                  src={selectedRecipe.image_url}
                  alt={selectedRecipe.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <ChefHat className="w-12 h-12 opacity-40" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    {selectedRecipe.category_name || 'Chưa phân loại'}
                  </span>
                  <span className="text-xs text-slate-400">ID #{selectedRecipe.id}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedRecipe.title}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block">Tác giả:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedRecipe.author_name || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Thời gian nấu:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedRecipe.cooking_time ? `${selectedRecipe.cooking_time} phút` : 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Trạng thái:</span>
                  <strong className="text-slate-800 dark:text-slate-200 capitalize">{selectedRecipe.status}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Lượt xem:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedRecipe.views || 0} lượt</strong>
                </div>
              </div>

              {/* Actions inside modal */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <a
                  href={`/recipes/detail/${selectedRecipe.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  Xem trang công khai <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div className="flex items-center gap-2">
                  {selectedRecipe.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => triggerRecipeAction(selectedRecipe.id, 'approve', selectedRecipe.title)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Duyệt bài
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerRecipeAction(selectedRecipe.id, 'delete', selectedRecipe.title)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Xóa bài
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Confirm Modal */}
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
