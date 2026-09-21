import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  ShieldCheck,
  UserCheck,
  Search,
  Trash2,
  Eye,
  X,
  Calendar,
  ShoppingBag,
  DollarSign,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { apiJson } from '../../../lib/api';
import AdminConfirmModal from '../components/AdminConfirmModal';
import Pagination from '../../../components/ui/Pagination';

interface SystemUser {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  role: 'admin' | 'customer';
  created_at: string;
  total_orders?: number;
  total_spent?: number;
}

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function UsersTab() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'customer'>('all');
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

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

  const loadUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiJson<{ users: SystemUser[] }>('/api/admin/users');
      // Normalize role to strictly 'admin' or 'customer'
      const normalized = (data.users ?? []).map((u) => ({
        ...u,
        role: (u.role === 'admin' ? 'admin' : 'customer') as 'admin' | 'customer',
        total_orders: Number(u.total_orders || 0),
        total_spent: Number(u.total_spent || 0),
      }));
      setUsers(normalized);
    } catch (err) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
      toast.error('Không thể nạp dữ liệu người dùng', { id: 'admin-load-users-error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const triggerDeleteUser = useCallback(
    (user: SystemUser) => {
      if (user.role === 'admin') {
        toast.error('Không thể xóa tài khoản Super Admin!', { icon: '🔒' });
        return;
      }

      setConfirmModal({
        open: true,
        title: 'Xóa tài khoản khách hàng',
        type: 'danger',
        confirmText: 'Đồng ý xóa',
        description: (
          <span>
            Bạn có chắc chắn muốn xóa tài khoản khách hàng <strong>{user.full_name}</strong> ({user.email})? Hành
            động này sẽ vô hiệu hóa tài khoản và gỡ bỏ dữ liệu liên quan.
          </span>
        ),
        onConfirm: async () => {
          try {
            await apiJson(`/api/admin/users/${user.id}`, { method: 'DELETE' });
            toast.success(`Đã xóa tài khoản "${user.full_name}" thành công!`);
            void loadUsers(true);
          } catch {
            toast.error('Lỗi khi xóa người dùng');
          }
        },
      });
    },
    [loadUsers]
  );

  // Thống kê nhanh KPI
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((u) => u.role === 'admin').length;
    const customerCount = users.filter((u) => u.role === 'customer').length;
    const totalCustomerGMV = users.reduce((acc, u) => acc + (u.total_spent || 0), 0);
    return { total, adminCount, customerCount, totalCustomerGMV };
  }, [users]);

  // Bộ lọc theo từ khóa & Role
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchQuery =
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(user.id).includes(searchQuery);

      const matchRole =
        roleFilter === 'all'
          ? true
          : roleFilter === 'admin'
          ? user.role === 'admin'
          : user.role === 'customer';

      return matchQuery && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Phân trang danh sách người dùng
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <div className="w-9 h-9 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs">Đang tải danh sách người dùng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TIÊU ĐỀ & MÔ TẢ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Quản Lý Người Dùng & Phân Quyền</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống phân quyền 2 cấp độ chuẩn hóa: <strong>Super Admin</strong> (Quản trị toàn diện) và <strong>Khách hàng</strong> (Mua sắm & Cộng đồng).
          </p>
        </div>
      </div>

      {/* 2. 4 THẺ KPI TỔNG QUAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Tài Khoản</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Tài khoản hoạt động</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Super Admin</p>
            <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.adminCount}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Ban quản trị hệ thống</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khách Hàng</p>
            <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.customerCount}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Người dùng mua sắm</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doanh Thu Khách Hàng</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {formatVND(stats.totalCustomerGMV)}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Tổng giá trị đơn hàng</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. THANH TÌM KIẾM & BỘ LỌC ROLE */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Input Tìm Kiếm */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email hoặc mã ID..."
            className="w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nút Lọc Theo Role */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              roleFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              roleFilter === 'admin'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin ({stats.adminCount})</span>
          </button>
          <button
            onClick={() => setRoleFilter('customer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              roleFilter === 'customer'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Khách hàng ({stats.customerCount})</span>
          </button>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH NGƯỜI DÙNG CHUẨN HÓA */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-5">Thành viên</th>
                <th className="py-3.5 px-4">Vai trò (Role)</th>
                <th className="py-3.5 px-4">Đơn hàng & Mua sắm</th>
                <th className="py-3.5 px-4">Ngày tham gia</th>
                <th className="py-3.5 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => {
                  const isAdmin = user.role === 'admin';
                  const initials = user.full_name
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(-2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={`${user.role}-${user.id}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition duration-150"
                    >
                      {/* Cột 1: Thông tin người dùng */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 text-white shadow-xs ${
                              isAdmin
                                ? 'bg-linear-to-tr from-indigo-600 to-purple-500'
                                : 'bg-linear-to-tr from-emerald-600 to-teal-500'
                            }`}
                          >
                            {initials || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                                {user.full_name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">#{user.id}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Vai trò phân quyền */}
                      <td className="py-4 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Super Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Khách hàng</span>
                          </span>
                        )}
                      </td>

                      {/* Cột 3: Đơn hàng & Chi tiêu */}
                      <td className="py-4 px-4">
                        {isAdmin ? (
                          <span className="text-xs text-slate-400 italic">Quản trị viên hệ thống</span>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {user.total_orders || 0} đơn hàng
                            </span>
                            {(user.total_spent ?? 0) > 0 && (
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatVND(user.total_spent || 0)}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Cột 4: Ngày tham gia */}
                      <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(user.created_at).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Cột 5: Nút hành động */}
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition cursor-pointer"
                            title="Xem chi tiết tài khoản"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isAdmin ? (
                            <span
                              className="p-2 rounded-xl text-slate-300 dark:text-slate-600 cursor-not-allowed inline-flex items-center"
                              title="Tài khoản Super Admin được bảo vệ"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          ) : (
                            <button
                              onClick={() => triggerDeleteUser(user)}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition cursor-pointer"
                              title="Xóa tài khoản khách hàng"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">Không tìm thấy người dùng phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh phân trang ngang ở dưới cùng */}
        {filteredUsers.length > PAGE_SIZE && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hiển thị <strong className="text-slate-800 dark:text-slate-200">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredUsers.length)}</strong> - <strong className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)}</strong> trên tổng số <strong className="text-slate-800 dark:text-slate-200">{filteredUsers.length}</strong> người dùng
            </p>
            <div className="scale-90 sm:scale-95 origin-center sm:origin-right">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredUsers.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                autoScrollTop={false}
                className=""
                activeClassName="bg-indigo-600 text-white shadow-md border-indigo-600 dark:bg-indigo-600 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. MODAL XEM CHI TIẾT NGƯỜI DÙNG (USER DETAIL MODAL) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Modal */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md ${
                  selectedUser.role === 'admin'
                    ? 'bg-linear-to-tr from-indigo-600 to-purple-500'
                    : 'bg-linear-to-tr from-emerald-600 to-teal-500'
                }`}
              >
                {selectedUser.full_name
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(-2)
                  .join('')
                  .toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                  {selectedUser.full_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedUser.email}</p>
                <div className="mt-1">
                  {selectedUser.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      <ShieldCheck className="w-3 h-3" />
                      Super Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      <UserCheck className="w-3 h-3" />
                      Khách hàng
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Thông Tin Chi Tiết */}
            <div className="space-y-3 py-3 border-y border-slate-100 dark:border-slate-700 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Ngày đăng ký:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(selectedUser.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>

              {selectedUser.role === 'customer' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Tổng đơn hàng:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedUser.total_orders || 0} đơn
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      Tổng tiền đã chi:
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {formatVND(selectedUser.total_spent || 0)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Trạng thái tài khoản:
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Đang hoạt động</span>
              </div>
            </div>

            {/* Quyền Hạn Hệ Thống */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
              <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">
                Phân quyền truy cập ({selectedUser.role === 'admin' ? 'Super Admin' : 'Customer'}):
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {selectedUser.role === 'admin'
                  ? 'Toàn quyền kiểm soát hệ thống KitchenCook: Quản lý sản phẩm, đơn hàng, duyệt hoàn tiền 1-click, quản lý người dùng và duyệt nội dung công thức/blog.'
                  : 'Mua sắm thiết bị đồ bếp, chọn biến thể kích thước/màu sắc, thanh toán MoMo/VietQR/COD, theo dõi vận đơn GHN, gửi yêu cầu hoàn tiền và trò chuyện trực tiếp với CSKH.'}
              </p>
            </div>

            {/* Nút Đóng */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                Đóng thông tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL XÁC NHẬN XÓA */}
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
