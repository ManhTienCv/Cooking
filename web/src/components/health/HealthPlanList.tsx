import { Link } from 'react-router-dom';
import { Calendar, Trash2 } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { RevealStaggerItem } from '../motion/ScrollReveal';
import type { HealthPlanCard } from './types';

interface HealthPlanListProps {
  isLoading: boolean;
  plans: HealthPlanCard[];
  onDeletePlan?: (id: number) => void;
}

export default function HealthPlanList({ isLoading, plans, onDeletePlan }: HealthPlanListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-4" />
            <div className="mt-auto flex items-center justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold mb-2">Chưa có kế hoạch nào</h3>
        <p className="text-gray-500">Hãy tạo kế hoạch đầu tiên của bạn để bắt đầu.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan, idx) => (
        <RevealStaggerItem key={plan.id} index={idx} stagger={0.055} maxStaggerIndex={9} className="h-full">
          <Link
            to={`/health/detail/${plan.id}`}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100 dark:border-slate-700 flex flex-col group h-full relative"
          >
            {onDeletePlan && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeletePlan(plan.id);
                }}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-full transition-colors"
                title="Xóa kế hoạch"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <h4 className="text-xl font-bold text-black dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors mb-2 pr-8">
              {plan.name}
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{plan.description}</p>
            <div className="mt-auto flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{plan.dateRange}</span>
              </div>
              <span className="bg-gray-100 dark:bg-slate-700 text-black dark:text-white px-2 py-1 rounded text-xs">{plan.tag}</span>
            </div>
          </Link>
        </RevealStaggerItem>
      ))}
    </div>
  );
}
