import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Calendar, Bell } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

export default function AdminHeader({ pendingCount }: { pendingCount: number }) {
  const [time, setTime] = useState('');
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    // Clock
    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateString = now.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
      setTime(`${dateString} - ${timeString}`);
    };
    const timer = setInterval(updateClock, 1000);
    updateClock();

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          Xin chào, Admin
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Chúc bạn một ngày làm việc hiệu quả!</p>
      </div>
      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          )}
        </button>

        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-mono">
            {time}
          </span>
        </div>

        <Link
          to="/admin/approvals"
          className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          {pendingCount > 0 && (
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800" />
          )}
        </Link>
      </div>
    </header>
  );
}
