import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, HeartPulse, ShoppingBag, Activity } from 'lucide-react';
import AuthModal from '../../components/AuthModal';
import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';

import HealthFeatures from '../../components/health/HealthFeatures';
import HealthTabs from '../../components/health/HealthTabs';
import HealthPlanList from '../../components/health/HealthPlanList';
import CreatePlanModal from '../../components/health/CreatePlanModal';
import type { HealthPlanCard } from '../../components/health/types';

export default function Health() {
  const [activeTab, setActiveTab] = useState('plans');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  const [plans, setPlans] = useState<HealthPlanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [defaultDates] = useState(() => {
    const base = new Date();
    const today = base.toISOString().slice(0, 10);
    const end = new Date(base);
    end.setDate(end.getDate() + 7);
    const nextWeek = end.toISOString().slice(0, 10);
    return { today, nextWeek };
  });

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await apiJson<{ authenticated?: boolean }>('/api/auth/me');
      if (!me.authenticated) {
        setPlans([]);
        return;
      }
      const data = await apiJson<{
        plans: {
          id: number;
          name: string;
          description?: string;
          start_date?: string;
          end_date?: string;
          diet_type?: string;
        }[];
      }>('/api/health/plans');
      const raw = data.plans ?? [];
      setPlans(
        raw.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          dateRange: p.start_date && p.end_date ? `${String(p.start_date)} → ${String(p.end_date)}` : '',
          tag: String(p.diet_type ?? ''),
        }))
      );
    } catch {
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  // Lock scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '8px';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isModalOpen]);

  const openCreatePlanModal = async () => {
    try {
      const me = await apiJson<{ authenticated?: boolean }>('/api/auth/me');
      if (!me.authenticated) {
        setIsAuthOpen(true);
        return;
      }
      setIsModalOpen(true);
    } catch {
      setIsAuthOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-sm border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Reveal className="text-center" y={20}>
            <h1 className="text-4xl md:text-5xl font-serif italic font-bold text-black dark:text-white mb-4">Quản lý Sức khỏe và Lập kế hoạch</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 font-serif max-w-2xl mx-auto">
              Lập kế hoạch bữa ăn, theo dõi dinh dưỡng và quản lý sức khỏe một cách thông minh
            </p>
          </Reveal>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HealthFeatures />

        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-md mb-12 border border-white/20 dark:border-slate-700/20 overflow-hidden">
          <HealthTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="p-6 min-h-[300px]">
            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-serif font-bold text-black dark:text-white">Kế hoạch bữa ăn</h3>
                  <button onClick={() => void openCreatePlanModal()} className="bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors inline-flex items-center space-x-2 text-sm">
                    <Plus className="w-4 h-4"/>
                    <span>Tạo kế hoạch mới</span>
                  </button>
                </div>
                <HealthPlanList isLoading={isLoading} plans={plans} />
              </div>
            )}
            {activeTab === 'shopping' && (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                <h3 className="text-2xl font-bold mb-2 dark:text-white">Danh sách trống</h3>
                <p className="text-gray-500 dark:text-gray-400">Danh sách mua sắm sẽ được tự động tạo khi bạn có kế hoạch bữa ăn.</p>
              </div>
            )}
            {activeTab === 'nutrition' && (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
                <h3 className="text-2xl font-bold mb-2 dark:text-white">Biểu đồ dinh dưỡng</h3>
                <p className="text-gray-500 dark:text-gray-400">Thêm công thức vào kế hoạch để xem phân tích dinh dưỡng tại đây.</p>
              </div>
            )}
          </div>
        </div>

        <Reveal y={24}>
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-black dark:text-white rounded-2xl shadow-md p-8 md:p-12 text-center border border-white/20 dark:border-slate-700/20">
            <HeartPulse className="w-16 h-16 mx-auto mb-6 text-red-500 animate-pulse" />
            <h2 className="text-3xl font-serif font-bold mb-4">Bắt đầu hành trình sức khỏe của bạn ngay hôm nay</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto">
              Trải nghiệm sự tiện lợi của việc lập kế hoạch bữa ăn và để chúng tôi giúp bạn đạt được mục tiêu sức khỏe.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button onClick={() => void openCreatePlanModal()} className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300">
                Tạo kế hoạch ngay
              </button>
              <Link to="/about" className="w-full sm:w-auto px-8 py-3 rounded-full bg-white dark:bg-slate-800 text-black dark:text-white border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-300 font-medium shadow-sm hover:shadow-md inline-flex items-center justify-center">
                Tìm hiểu về chúng tôi <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      <CreatePlanModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={async () => {
          setIsModalOpen(false);
          await loadPlans();
        }} 
        defaultDates={defaultDates}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={loadPlans} />
    </div>
  );
}
