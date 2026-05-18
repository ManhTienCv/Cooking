import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageBackBarProps {
  /** Đường dẫn dự phòng khi không có lịch sử trình duyệt */
  fallbackTo?: string;
  label?: string;
  className?: string;
}

export default function PageBackBar({
  fallbackTo = '/',
  label = 'Quay lại',
  className = '',
}: PageBackBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const fromState = (location.state as { from?: string } | null)?.from;

  const handleBack = () => {
    if (fromState) {
      navigate(fromState);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`group inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm backdrop-blur transition hover:border-amber-300 hover:text-gray-900 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-amber-600/50 dark:hover:text-white ${className}`}
    >
      <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
      {label}
    </button>
  );
}
