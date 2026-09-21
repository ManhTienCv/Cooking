import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  Eye,
  X,
  XCircle,
  ExternalLink,
  BookOpen,
  Filter,
  Check,
  Heart,
  Eye as ViewsIcon,
} from 'lucide-react';
import { apiJson } from '../../../lib/api';
import AdminConfirmModal from '../components/AdminConfirmModal';
import Pagination from '../../../components/ui/Pagination';

export interface AdminBlogItem {
  id: number;
  title: string;
  slug?: string | null;
  status: 'approved' | 'pending' | 'rejected' | string;
  created_at: string;
  category_name?: string | null;
  author_name?: string | null;
  author_email?: string | null;
  image_url?: string | null;
  views?: number | null;
  likes?: number | null;
  excerpt?: string | null;
}

export default function BlogsTab() {
  const [blogs, setBlogs] = useState<AdminBlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedBlog, setSelectedBlog] = useState<AdminBlogItem | null>(null);

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

  const loadBlogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiJson<{ blogs: AdminBlogItem[] }>('/api/admin/blogs?status=all');
      setBlogs(data.blogs ?? []);
    } catch (err) {
      console.error(err);
      if (!silent) {
        toast.error('Lỗi khi tải danh sách bài viết blog', { id: 'admin-load-blogs-error' });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlogs();
  }, [loadBlogs]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const b of blogs) {
      if (b.category_name) set.add(b.category_name);
    }
    return Array.from(set).sort();
  }, [blogs]);

  // Thống kê KPI
  const stats = useMemo(() => {
    const total = blogs.length;
    const approved = blogs.filter((b) => b.status === 'approved').length;
    const pending = blogs.filter((b) => b.status === 'pending').length;
    const rejected = blogs.filter((b) => b.status === 'rejected').length;
    return { total, approved, pending, rejected };
  }, [blogs]);

  // Bộ lọc dữ liệu
  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.title?.toLowerCase().includes(q) ||
        b.author_name?.toLowerCase().includes(q) ||
        String(b.id).includes(q);

      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchCat = categoryFilter === 'all' || b.category_name === categoryFilter;

      return matchSearch && matchStatus && matchCat;
    });
  }, [blogs, searchQuery, statusFilter, categoryFilter]);

  // Reset trang khi lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  // Dữ liệu phân trang
  const paginatedBlogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBlogs.slice(start, start + PAGE_SIZE);
  }, [filteredBlogs, currentPage]);

  const triggerBlogAction = useCallback(
    (id: number, action: 'approve' | 'reject' | 'delete', title: string) => {
      const isDelete = action === 'delete';
      const isApprove = action === 'approve';

      let modalTitle = 'Xóa bài viết';
      let type: 'approve' | 'danger' | 'warning' | 'info' = 'danger';
      let confirmText = 'Đồng ý xóa';
      let desc = (
        <span>
          Bạn có chắc chắn muốn <strong>xóa vĩnh viễn</strong> bài viết <strong>"{title}"</strong> (ID #{id}) không?
          Hành động này không thể hoàn tác.
        </span>
      );

      if (isApprove) {
        modalTitle = 'Duyệt bài viết';
        type = 'approve';
        confirmText = 'Đồng ý duyệt';
        desc = (
          <span>
            Bạn có chắc chắn muốn <strong>duyệt</strong> và xuất bản bài viết <strong>"{title}"</strong> không?
          </span>
        );
      } else if (action === 'reject') {
        modalTitle = 'Từ chối bài viết';
        type = 'warning';
        confirmText = 'Đồng ý từ chối';
        desc = (
          <span>
            Bạn có chắc chắn muốn <strong>từ chối</strong> bài viết <strong>"{title}"</strong> không?
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
              await apiJson(`/api/admin/blogs/${id}`, { method: 'DELETE' });
              toast.success(`Đã xóa bài viết #${id} thành công!`);
              if (selectedBlog?.id === id) setSelectedBlog(null);
            } catch {
              toast.error('Lỗi khi xóa bài viết');
            }
          } else {
            try {
              await apiJson(`/api/admin/blogs/${id}/${action}`, { method: 'POST' });
              toast.success(`Đã ${isApprove ? 'duyệt' : 'từ chối'} bài viết thành công!`);
              if (selectedBlog?.id === id) {
                setSelectedBlog((prev) => (prev ? { ...prev, status: isApprove ? 'approved' : 'rejected' } : null));
              }
            } catch {
              toast.error('Lỗi khi cập nhật trạng thái');
            }
          }
          void loadBlogs(true);
        },
      });
    },
    [loadBlogs, selectedBlog]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <div className="w-9 h-9 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-xs">Đang tải danh sách bài viết...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng số bài viết */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng bài viết</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
        </div>

        {/* Đã xuất bản */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đã xuất bản</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.approved}</p>
          </div>
        </div>

        {/* Chờ duyệt */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chờ duyệt bài</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.pending}</p>
          </div>
        </div>

        {/* Đã từ chối */}
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
              placeholder="Tìm theo tiêu đề blog, tác giả, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
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
                ? blogs.length
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
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
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
                <th className="px-5 py-4">Bài viết Blog</th>
                <th className="px-5 py-4">Tác giả</th>
                <th className="px-5 py-4">Chuyên mục</th>
                <th className="px-5 py-4">Tương tác</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {paginatedBlogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">Không tìm thấy bài viết nào</p>
                    <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa hoặc bộ lọc chuyên mục.</p>
                  </td>
                </tr>
              ) : (
                paginatedBlogs.map((b) => {
                  const isApproved = b.status === 'approved';
                  const isPending = b.status === 'pending';

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group"
                    >
                      {/* ID */}
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-400">
                        #{b.id}
                      </td>

                      {/* Title & Cover Image */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600">
                            {b.image_url ? (
                              <img
                                src={b.image_url}
                                alt={b.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <BookOpen className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <button
                              type="button"
                              onClick={() => setSelectedBlog(b)}
                              className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left line-clamp-1 cursor-pointer transition-colors"
                            >
                              {b.title}
                            </button>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(b.created_at).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {b.author_name ? b.author_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {b.author_name || 'Tác giả'}
                            </p>
                            {b.author_email && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{b.author_email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                          {b.category_name || 'Blog chung'}
                        </span>
                      </td>

                      {/* Views & Likes */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <ViewsIcon className="w-3 h-3 text-blue-500" />
                            {b.views || 0} lượt xem
                          </span>
                          {b.likes !== undefined && b.likes !== null && (
                            <span className="flex items-center gap-1 text-[11px] text-rose-500">
                              <Heart className="w-3 h-3 fill-rose-500" />
                              {b.likes} thích
                            </span>
                          )}
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
                            onClick={() => setSelectedBlog(b)}
                            title="Xem chi tiết"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Approve button if pending */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => triggerBlogAction(b.id, 'approve', b.title)}
                                title="Duyệt bài viết"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerBlogAction(b.id, 'reject', b.title)}
                                title="Từ chối bài viết"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => triggerBlogAction(b.id, 'delete', b.title)}
                            title="Xóa bài viết"
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
        {filteredBlogs.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hiển thị{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredBlogs.length)}
              </strong>{' '}
              -{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.min(currentPage * PAGE_SIZE, filteredBlogs.length)}
              </strong>{' '}
              trên tổng số{' '}
              <strong className="text-slate-800 dark:text-slate-200">{filteredBlogs.length}</strong> bài viết
            </p>

            <div className="scale-90 sm:scale-95 origin-center sm:origin-right">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredBlogs.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                autoScrollTop={false}
                className=""
                activeClassName="bg-blue-600 text-white shadow-md border-blue-600 dark:bg-blue-600 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal Xem Chi Tiết Bài Viết Blog */}
      {selectedBlog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="relative h-48 bg-slate-100 dark:bg-slate-700">
              {selectedBlog.image_url ? (
                <img
                  src={selectedBlog.image_url}
                  alt={selectedBlog.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <BookOpen className="w-12 h-12 opacity-40" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedBlog(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                    {selectedBlog.category_name || 'Blog ẩm thực'}
                  </span>
                  <span className="text-xs text-slate-400">ID #{selectedBlog.id}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedBlog.title}</h3>
                {selectedBlog.excerpt && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {selectedBlog.excerpt}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block">Tác giả:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedBlog.author_name || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Ngày tạo:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {new Date(selectedBlog.created_at).toLocaleDateString('vi-VN')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Trạng thái:</span>
                  <strong className="text-slate-800 dark:text-slate-200 capitalize">{selectedBlog.status}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Lượt xem / Thích:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedBlog.views || 0} xem • {selectedBlog.likes || 0} thích
                  </strong>
                </div>
              </div>

              {/* Actions inside modal */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <a
                  href={`/blog/detail/${selectedBlog.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Xem trang bài viết <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div className="flex items-center gap-2">
                  {selectedBlog.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => triggerBlogAction(selectedBlog.id, 'approve', selectedBlog.title)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Duyệt bài
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerBlogAction(selectedBlog.id, 'delete', selectedBlog.title)}
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
