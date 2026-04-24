import { useEffect, useState } from 'react';
import { Users, Utensils, FileText, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiJson } from '../../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardTab() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await apiJson<Record<string, number>>('/api/admin/dashboard');
        setStats(d);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  const pendingCount = (stats.pendingRecipes ?? 0) + (stats.pendingBlogs ?? 0);

  // Fake growth data
  const growthData = [
    { name: 'Th 2', access: 12, newUsers: 2 },
    { name: 'Th 3', access: 19, newUsers: 5 },
    { name: 'Th 4', access: 15, newUsers: 3 },
    { name: 'Th 5', access: 25, newUsers: 8 },
    { name: 'Th 6', access: 22, newUsers: 5 },
    { name: 'Th 7', access: 30, newUsers: 10 },
    { name: 'CN', access: 45, newUsers: 15 },
  ];

  const contentData = [
    { name: 'Công thức', value: stats.recipes ?? 0, color: '#f97316' },
    { name: 'Bài viết', value: stats.blogs ?? 0, color: '#a855f7' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Tổng quan</h2>
        <p className="text-slate-500 dark:text-slate-400">Chào mừng trở lại, đây là tình hình hoạt động hôm nay.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        <StatCard icon={<Users className="w-8 h-8" />} label="Người dùng" value={stats.users ?? 0} color="blue" />
        <StatCard icon={<Utensils className="w-8 h-8" />} label="Công thức" value={stats.recipes ?? 0} color="orange" />
        <StatCard icon={<FileText className="w-8 h-8" />} label="Bài viết" value={stats.blogs ?? 0} color="purple" />
        <StatCard icon={<Clock className="w-8 h-8" />} label="Chờ duyệt" value={pendingCount} color="red" />
      </div>

      {pendingCount > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-6 flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-full">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-orange-800 dark:text-orange-200">Cần hành động ngay</h3>
              <p className="text-orange-600 dark:text-orange-300 text-sm">Có {pendingCount} nội dung đang chờ bạn phê duyệt.</p>
            </div>
          </div>
          <Link
            to="/admin/approvals"
            className="px-5 py-2.5 bg-orange-600 dark:bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-700 dark:hover:bg-orange-600 transition shadow-sm"
          >
            Xử lý ngay
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors duration-300">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Thống kê tăng trưởng</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="access" name="Truy cập" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="newUsers" name="Đăng ký mới" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors duration-300">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Tỷ lệ nội dung</h3>
          <div className="h-64 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={contentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {contentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'blue' | 'orange' | 'purple' | 'red' }) {
  const colorStyles = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-6 group hover:-translate-y-1">
      <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${colorStyles[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-base font-semibold">{label}</p>
        <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1">{value}</h3>
      </div>
    </div>
  );
}
