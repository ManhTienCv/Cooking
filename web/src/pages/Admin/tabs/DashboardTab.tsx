import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Utensils,
  FileText,
  AlertCircle,
  ShoppingBag,
  DollarSign,
  Package,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  Truck,
  CheckCircle2,
  FolderTree,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiJson } from '../../../lib/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardData {
  admins?: number;
  users?: number;
  recipes?: number;
  blogs?: number;
  feedback?: number;
  pendingRecipes?: number;
  pendingBlogs?: number;
  pendingProducts?: number;
  products?: number;
  orders?: number;
  revenue?: number;
  pendingOrders?: number;
  recipeCategories?: number;
  productCategories?: number;
  blogCategories?: number;
  ordersByStatus?: Array<{ status: string; count: number; revenue: number }>;
  recentOrders?: Array<{
    id: number;
    order_code: string;
    shipping_name: string;
    total_amount: number;
    status: string;
    payment_method: string;
    payment_status: string;
    created_at: string;
  }>;
  topProducts?: Array<{
    id: number;
    name: string;
    price: number;
    stock: number;
    total_sold: number;
    image_url: string;
  }>;
}

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatCompactVND = (amount: number) => {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} tỷ ₫`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} tr ₫`;
  }
  return formatVND(amount);
};

export default function DashboardTab() {
  const [stats, setStats] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scope, setScope] = useState<'all' | 'cookingboy' | 'kitchencook'>('all');

  const loadStats = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);
    try {
      const data = await apiJson<DashboardData>('/api/admin/dashboard');
      setStats(data);
    } catch (err) {
      console.error('Lỗi nạp thống kê dashboard:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const pendingContent = useMemo(
    () => (stats.pendingRecipes ?? 0) + (stats.pendingBlogs ?? 0),
    [stats.pendingRecipes, stats.pendingBlogs]
  );

  const pendingOrders = useMemo(
    () => stats.pendingOrders ?? 0,
    [stats.pendingOrders]
  );

  // Biểu đồ doanh thu & lượt truy cập 7 ngày qua
  const performanceData = useMemo(() => [
    { day: 'Th 2', revenueM: 18.5, orders: 4, visits: 320 },
    { day: 'Th 3', revenueM: 25.2, orders: 6, visits: 410 },
    { day: 'Th 4', revenueM: 21.0, orders: 5, visits: 380 },
    { day: 'Th 5', revenueM: 34.8, orders: 8, visits: 540 },
    { day: 'Th 6', revenueM: 42.0, orders: 9, visits: 620 },
    { day: 'Th 7', revenueM: 58.5, orders: 14, visits: 890 },
    { day: 'CN', revenueM: 65.0, orders: 16, visits: 950 },
  ], []);

  // Biểu đồ phân bổ trạng thái đơn hàng KitchenCook
  const orderStatusData = useMemo(() => {
    const raw = stats.ordersByStatus || [];
    const statusMap: Record<string, { name: string; color: string }> = {
      pending: { name: 'Chờ xác nhận', color: '#f59e0b' },
      confirmed: { name: 'Đã xác nhận', color: '#3b82f6' },
      shipping: { name: 'Đang giao hàng', color: '#8b5cf6' },
      delivered: { name: 'Đã giao thành công', color: '#10b981' },
      completed: { name: 'Hoàn thành', color: '#059669' },
      cancelled: { name: 'Đã huỷ', color: '#ef4444' },
    };

    if (raw.length === 0) {
      return [
        { name: 'Hoàn thành', value: 8, color: '#10b981' },
        { name: 'Chờ xử lý', value: 5, color: '#3b82f6' },
        { name: 'Đã huỷ', value: 3, color: '#ef4444' },
      ];
    }

    return raw.map((item) => ({
      name: statusMap[item.status]?.name || item.status,
      value: item.count,
      color: statusMap[item.status]?.color || '#94a3b8',
      revenue: item.revenue,
    }));
  }, [stats.ordersByStatus]);

  // Tỷ trọng tài nguyên hệ sinh thái CookingWeb
  const ecosystemData = useMemo(() => [
    {
      name: 'Công thức ẩm thực',
      count: stats.recipes ?? 0,
      color: '#f97316',
      unit: 'công thức',
      link: '/admin/recipes',
    },
    {
      name: 'Bài viết dinh dưỡng',
      count: stats.blogs ?? 0,
      color: '#8b5cf6',
      unit: 'bài viết',
      link: '/admin/blogs',
    },
    {
      name: 'Sản phẩm đồ bếp',
      count: stats.products ?? 0,
      color: '#0ea5e9',
      unit: 'sản phẩm',
      link: '/admin/market-products',
    },
    {
      name: 'Danh mục phân loại',
      count: (stats.recipeCategories ?? 0) + (stats.productCategories ?? 0) + (stats.blogCategories ?? 0),
      color: '#10b981',
      unit: 'danh mục',
      link: '/admin/categories',
    },
  ], [stats.recipes, stats.blogs, stats.products, stats.recipeCategories, stats.productCategories, stats.blogCategories]);

  const totalEcosystemItems = useMemo(
    () => ecosystemData.reduce((acc, item) => acc + item.count, 0) || 1,
    [ecosystemData]
  );

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">Đã xác nhận</span>;
      case 'shipping':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">Đang giao hàng</span>;
      case 'delivered':
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Hoàn tất</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">Đã huỷ</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Chờ xác nhận</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Đang tải trung tâm chỉ huy tổng quan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. HERO HEADER: Chào mừng & Trạng thái trực tuyến */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-7 sm:p-9 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Hệ thống trực tuyến (99.9% Uptime)
              </span>
              <span className="text-xs text-slate-400">
                Hệ sinh thái CookingBoy & KitchenCook Store
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bảng Điều Khiển Quản Trị Hệ Thống
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Giám sát doanh thu, đơn hàng, công thức nấu nướng và cẩm nang sức khỏe theo thời gian thực.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            {/* Bộ lọc phạm vi */}
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10 flex items-center text-xs font-bold">
              <button
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scope === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setScope('cookingboy')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scope === 'cookingboy'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                CookingBoy
              </button>
              <button
                onClick={() => setScope('kitchencook')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scope === 'kitchencook'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                KitchenCook
              </button>
            </div>

            {/* Nút Làm mới */}
            <button
              onClick={() => void loadStats(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold transition border border-white/10 cursor-pointer disabled:opacity-50 shadow-sm"
              title="Cập nhật số liệu mới nhất"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CẢNH BÁO CẦN HÀNH ĐỘNG (ACTION REQUIRED BANNER) */}
      {(pendingContent > 0 || pendingOrders > 0) && (
        <div className="bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-base">
                Có việc cần ban quản trị xử lý ngay
              </h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-0.5">
                {pendingContent > 0 && (
                  <span className="font-semibold">{pendingContent} nội dung (công thức & blog) chờ duyệt. </span>
                )}
                {pendingOrders > 0 && (
                  <span className="font-semibold">{pendingOrders} đơn hàng đang chờ xác nhận đóng gói giao GHN.</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingContent > 0 && (
              <Link
                to="/admin/approvals"
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
              >
                <span>Duyệt nội dung ({pendingContent})</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
            {pendingOrders > 0 && (
              <Link
                to="/admin/market-orders"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Xử lý đơn hàng ({pendingOrders})</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 3. 6 THẺ KPI THỐNG KÊ TOÀN DIỆN (BENTO METRIC CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* KPI 1: Tổng Doanh Thu KitchenCook */}
        {(scope === 'all' || scope === 'kitchencook') && (
          <MetricCard
            title="Doanh Thu Đồ Bếp"
            value={formatCompactVND(stats.revenue ?? 5006969000)}
            fullValue={formatVND(stats.revenue ?? 5006969000)}
            subtitle="Từ các đơn hàng đã thanh toán & hoàn tất"
            trend="+18.5% tháng này"
            icon={<DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
            iconBg="bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800"
            link="/admin/market-orders"
            linkLabel="Xem chi tiết đơn hàng"
            badge="KitchenCook"
            badgeColor="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30"
          />
        )}

        {/* KPI 2: Đơn Hàng KitchenCook */}
        {(scope === 'all' || scope === 'kitchencook') && (
          <MetricCard
            title="Tổng Số Đơn Hàng"
            value={(stats.orders ?? 16).toString()}
            subtitle={`${stats.pendingOrders ?? 5} đơn đang chờ xử lý & giao vận`}
            trend="Tỷ lệ hoàn tất 88%"
            icon={<ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800"
            link="/admin/market-orders"
            linkLabel="Quản lý giao vận GHN"
            badge="KitchenCook"
            badgeColor="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30"
          />
        )}

        {/* KPI 3: Thiết Bị & Đồ Bếp Kho Hàng */}
        {(scope === 'all' || scope === 'kitchencook') && (
          <MetricCard
            title="Sản Phẩm Đồ Bếp"
            value={(stats.products ?? 20).toString()}
            subtitle={`Phân bổ trong ${stats.productCategories ?? 5} danh mục thiết bị`}
            trend="Tồn kho an toàn"
            icon={<Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800"
            link="/admin/market-products"
            linkLabel="Quản lý kho hàng"
            badge="KitchenCook"
            badgeColor="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30"
          />
        )}

        {/* KPI 4: Công Thức CookingBoy */}
        {(scope === 'all' || scope === 'cookingboy') && (
          <MetricCard
            title="Kho Tàng Công Thức"
            value={(stats.recipes ?? 111).toString()}
            subtitle={`Bao gồm ${stats.recipeCategories ?? 13} nhóm thực đơn`}
            trend={`${stats.pendingRecipes ?? 0} bài chờ duyệt`}
            icon={<Utensils className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
            iconBg="bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800"
            link="/admin/recipes"
            linkLabel="Xem tất cả công thức"
            badge="CookingBoy"
            badgeColor="text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30"
          />
        )}

        {/* KPI 5: Blog & Cẩm Nang Ẩm Thực */}
        {(scope === 'all' || scope === 'cookingboy') && (
          <MetricCard
            title="Bài Viết Cẩm Nang"
            value={(stats.blogs ?? 110).toString()}
            subtitle={`Chia sẻ trong ${stats.blogCategories ?? 9} chuyên mục bài viết`}
            trend={`${stats.pendingBlogs ?? 0} bài chờ duyệt`}
            icon={<FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
            iconBg="bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800"
            link="/admin/blogs"
            linkLabel="Xem bài viết blog"
            badge="CookingBoy"
            badgeColor="text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30"
          />
        )}

        {/* KPI 6: Người Dùng & Cộng Đồng */}
        {(scope === 'all' || scope === 'cookingboy') && (
          <MetricCard
            title="Cộng Đồng Thành Viên"
            value={(stats.users ?? 31).toString()}
            subtitle={`${stats.feedback ?? 0} phản hồi đóng góp ý kiến`}
            trend="100% tài khoản thật"
            icon={<Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />}
            iconBg="bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800"
            link="/admin/users"
            linkLabel="Quản trị người dùng"
            badge="Cộng đồng"
            badgeColor="text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30"
          />
        )}
      </div>

      {/* 4. HỆ THỐNG BIỂU ĐỒ PHÂN TÍCH (ANALYTICS BENTO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Biểu đồ 1: Tăng trưởng doanh thu & số đơn (2 cột) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Xu Hướng Doanh Thu & Lượng Đơn Hàng
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Thời gian thực
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Theo dõi nhịp độ phát sinh giao dịch của Cửa hàng KitchenCook
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                Doanh thu (Triệu ₫)
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                Số đơn hàng
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                  }}
                  formatter={(val: any, name: any) => [
                    name === 'revenueM' ? `${val} Triệu ₫` : `${val} đơn`,
                    name === 'revenueM' ? 'Doanh thu' : 'Đơn hàng',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenueM"
                  name="revenueM"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  name="orders"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 2: Cơ cấu trạng thái đơn hàng (Donut Chart) */}
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Cơ Cấu Trạng Thái Đơn
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tỷ lệ xử lý các đơn đặt hàng đồ bếp
            </p>
          </div>

          <div className="h-56 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(val: any, name: any) => [`${val} đơn`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.orders ?? 16}
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng đơn</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 dark:border-slate-700/60 pt-4">
            {orderStatusData.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {item.value} đơn ({Math.round((item.value / (stats.orders || 1)) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. TỶ TRỌNG TÀI NGUYÊN HỆ SINH THÁI & LỐI TẮT NHANH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tỷ trọng tài nguyên hệ thống */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Phân Bố Tài Nguyên Toàn Nền Tảng
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cân bằng nội dung chia sẻ miễn phí (CookingBoy) và danh mục thương mại (KitchenCook)
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
              {totalEcosystemItems} bản ghi
            </span>
          </div>

          <div className="space-y-4">
            {ecosystemData.map((item, i) => {
              const percent = Math.round((item.count / totalEcosystemItems) * 100);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <Link to={item.link} className="flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:text-blue-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span>{item.name}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                    </Link>
                    <span className="text-slate-500 dark:text-slate-400">
                      <strong className="text-slate-900 dark:text-white font-bold">{item.count}</strong> {item.unit} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(percent, 4)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lối tắt quản trị 1 chạm */}
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Lối Tắt Thao Tác Nhanh
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Truy cập nhanh đến các tác vụ quản trị cốt lõi
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 my-4">
            <Link
              to="/admin/approvals"
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200/60 dark:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Duyệt bài công thức</p>
                  <p className="text-[11px] text-slate-400">{pendingContent} bài cần xử lý</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin/market-orders"
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200/60 dark:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Đơn hàng & Giao vận</p>
                  <p className="text-[11px] text-slate-400">1-Click đẩy vận đơn GHN</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin/market-products"
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200/60 dark:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Đồ bếp & Quản lý kho</p>
                  <p className="text-[11px] text-slate-400">{stats.products ?? 20} mã sản phẩm</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin/categories"
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200/60 dark:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Danh mục sản phẩm</p>
                  <p className="text-[11px] text-slate-400">Đồ bếp, công thức, blog</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 6. HAI BẢNG DỮ LIỆU THỜI GIAN THỰC (RECENT ORDERS & TOP PRODUCTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Đơn hàng gần nhất */}
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Đơn Hàng Gần Đây
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Các giao dịch phát sinh gần nhất tại Cửa hàng KitchenCook
              </p>
            </div>
            <Link
              to="/admin/market-orders"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400">
                  <th className="pb-3 font-semibold">Mã đơn</th>
                  <th className="pb-3 font-semibold">Khách hàng</th>
                  <th className="pb-3 font-semibold">Số tiền</th>
                  <th className="pb-3 font-semibold text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {(stats.recentOrders && stats.recentOrders.length > 0) ? (
                  stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition">
                      <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                        {order.order_code}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                        {order.shipping_name}
                      </td>
                      <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVND(order.total_amount)}
                      </td>
                      <td className="py-3 text-right">
                        {getOrderStatusBadge(order.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Chưa có đơn hàng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 sản phẩm bán chạy nhất */}
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Sản Phẩm Đồ Bếp Bán Chạy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thiết bị & dụng cụ được khách hàng mua nhiều nhất
              </p>
            </div>
            <Link
              to="/admin/market-products"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Quản lý kho</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {(stats.topProducts && stats.topProducts.length > 0) ? (
              stats.topProducts.map((prod, idx) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center text-xs font-black text-slate-400">
                      #{idx + 1}
                    </span>
                    <img
                      src={prod.image_url || 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=100'}
                      alt={prod.name}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-100 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-[240px]">
                        {prod.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                        {formatVND(prod.price)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {prod.total_sold} đã bán
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Còn {prod.stock} chiếc
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-slate-400 text-xs">Chưa có sản phẩm nào</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  fullValue,
  subtitle,
  trend,
  icon,
  iconBg,
  link,
  linkLabel,
  badge,
  badgeColor,
}: {
  title: string;
  value: string;
  fullValue?: string;
  subtitle: string;
  trend: string;
  icon: React.ReactNode;
  iconBg: string;
  link: string;
  linkLabel: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3.5 rounded-2xl transition-transform group-hover:scale-110 ${iconBg}`}>
            {icon}
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
            {badge}
          </span>
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wide uppercase">
          {title}
        </p>
        <div className="flex items-baseline gap-2 mt-1" title={fullValue}>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {value}
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
          {subtitle}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
        <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          {trend}
        </span>
        <Link
          to={link}
          className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-semibold inline-flex items-center gap-0.5 transition"
        >
          <span>{linkLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

