import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Utensils, Trash2, Sunrise, Sun, Moon, Plus, Zap, Droplet, Wheat, Flame } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiJson } from '../../lib/api';
import { HeroEnter, Reveal, RevealStaggerItem } from '../../components/motion/ScrollReveal';

interface HealthPlanRow {
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  meal_count?: number | null;
  diet_type?: string | null;
}

export default function HealthDetail() {
  const { id } = useParams();

  const [plan, setPlan] = useState<HealthPlanRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await apiJson<{ plan: HealthPlanRow }>(`/api/health/plans/${id}`);
      setPlan(data.plan);
    } catch {
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const days = [
    { date: '01/11/2023', day: 'Thứ 2' },
    { date: '02/11/2023', day: 'Thứ 3' },
    { date: '03/11/2023', day: 'Thứ 4' },
    { date: '04/11/2023', day: 'Thứ 5' },
    { date: '05/11/2023', day: 'Thứ 6' },
  ];

  if (isLoading) {
    return (
      <main className="min-h-screen pt-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-6 w-32 mb-6" />
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
             <Skeleton className="h-10 w-1/3 mb-4" />
             <Skeleton className="h-6 w-1/2 mb-6" />
             <div className="flex gap-6">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
             </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
             <Skeleton className="h-10 w-1/4 mb-6" />
             <div className="space-y-4">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
             </div>
          </div>
        </div>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="min-h-screen pt-32 pb-20 bg-gray-50 flex flex-col items-center justify-center text-center">
        <Calendar className="h-24 w-24 text-gray-300 mb-6 drop-shadow-md" />
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Không tìm thấy kế hoạch</h2>
        <p className="text-gray-500 mb-8 max-w-md">Kế hoạch này có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link to="/health" className="bg-black text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors inline-flex items-center space-x-2 font-medium">
          <ArrowLeft className="h-5 w-5" />
          <span>Quay lại trang Sức Khỏe</span>
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal className="mb-6" y={12}>
          <Link to="/health" className="inline-flex items-center text-gray-600 hover:text-black transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Quay lại danh sách kế hoạch
          </Link>
        </Reveal>

        {/* Plan Header */}
        <HeroEnter className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-black mb-4">{plan.name}</h1>
              <p className="text-xl text-gray-600 mb-6">{plan.description}</p>
              <div className="flex flex-wrap gap-6 text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>{plan.start_date} - {plan.end_date}</span>
                </div>
                <div className="flex items-center">
                  <Utensils className="h-5 w-5 mr-2" />
                  <span>{plan.meal_count} bữa ăn</span>
                </div>
                <div className="flex items-center">
                  <span className="bg-black text-white px-4 py-1 rounded-full text-sm">{plan.diet_type}</span>
                </div>
              </div>
            </div>
            <div className="ml-6">
              <button className="bg-red-500 text-white px-6 py-2 rounded-full hover:bg-red-600 transition-colors duration-300 flex items-center">
                <Trash2 className="h-5 w-5 mr-2" />
                Xóa kế hoạch
              </button>
            </div>
          </div>
        </HeroEnter>

        {/* Weekly Meal Plan */}
        <Reveal y={20}>
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-3xl font-bold text-black mb-6">Thực đơn trong tuần</h2>
          <div className="space-y-6">
            {days.map((item, idx) => (
              <RevealStaggerItem key={idx} index={idx} stagger={0.06} maxStaggerIndex={8}>
              <div className="border-l-4 border-black pl-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center mb-3">
                  <h3 className="text-xl font-bold text-black">{item.day}</h3>
                  <span className="ml-4 text-gray-600">{item.date}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Sunrise className="h-5 w-5 text-yellow-600 mr-2" />
                        <h4 className="font-semibold text-gray-700">Sáng</h4>
                      </div>
                      <button className="bg-yellow-600 text-white px-3 py-1 rounded-full hover:bg-yellow-700 transition-colors text-sm flex items-center">
                        <Plus className="h-4 w-4 mr-1" /> Thêm món
                      </button>
                    </div>
                    <div className="space-y-2 min-h-[60px]">
                      <p className="text-gray-400 text-sm italic">Chưa có món ăn</p>
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Sun className="h-5 w-5 text-orange-600 mr-2" />
                        <h4 className="font-semibold text-gray-700">Trưa</h4>
                      </div>
                      <button className="bg-orange-600 text-white px-3 py-1 rounded-full hover:bg-orange-700 transition-colors text-sm flex items-center">
                        <Plus className="h-4 w-4 mr-1" /> Thêm món
                      </button>
                    </div>
                    <div className="space-y-2 min-h-[60px]">
                      <p className="text-gray-400 text-sm italic">Chưa có món ăn</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Moon className="h-5 w-5 text-blue-600 mr-2" />
                        <h4 className="font-semibold text-gray-700">Tối</h4>
                      </div>
                      <button className="bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors text-sm flex items-center">
                        <Plus className="h-4 w-4 mr-1" /> Thêm món
                      </button>
                    </div>
                    <div className="space-y-2 min-h-[60px]">
                      <p className="text-gray-400 text-sm italic">Chưa có món ăn</p>
                    </div>
                  </div>
                </div>
              </div>
              </RevealStaggerItem>
            ))}
          </div>
        </div>
        </Reveal>

        {/* Nutrition Summary */}
        <Reveal y={22}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-8">
            <h2 className="text-3xl font-bold text-black mb-6">Tổng quan dinh dưỡng</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { bg: 'bg-green-50', Icon: Zap, iconClass: 'text-green-600', val: '0', label: 'Calories/ngày' },
                { bg: 'bg-blue-50', Icon: Droplet, iconClass: 'text-blue-600', val: '0g', label: 'Protein/ngày' },
                { bg: 'bg-yellow-50', Icon: Wheat, iconClass: 'text-yellow-600', val: '0g', label: 'Carbs/ngày' },
                { bg: 'bg-red-50', Icon: Flame, iconClass: 'text-red-600', val: '0g', label: 'Fat/ngày' },
              ].map((box, idx) => {
                const StatIcon = box.Icon;
                return (
                  <RevealStaggerItem key={box.label} index={idx} stagger={0.05}>
                    <div className={`${box.bg} rounded-lg p-6 text-center`}>
                      <StatIcon className={`h-12 w-12 ${box.iconClass} mx-auto mb-3`} />
                      <h3 className="text-2xl font-bold text-black mb-2">{box.val}</h3>
                      <p className="text-gray-600">{box.label}</p>
                    </div>
                  </RevealStaggerItem>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center">
            <h3 className="text-xl font-bold text-black mb-4">Tỉ lệ dinh dưỡng</h3>
            <div className="w-full max-w-xs h-64 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
              Biểu đồ (Chart.js)
            </div>
          </div>
        </div>
        </Reveal>

        {/* Shopping List */}
        <Reveal y={20}>
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-3xl font-bold text-black">Danh sách mua sắm</h2>
          </div>
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <input type="text" placeholder="Tên nguyên liệu (VD: Thịt gà, Rau xanh...)" className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent transition-all" />
              </div>
              <div className="w-40">
                <input type="text" placeholder="Số lượng" className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent transition-all" />
              </div>
              <button className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 whitespace-nowrap">
                <Plus className="h-5 w-5" /> Thêm
              </button>
            </div>
          </div>
          <div className="space-y-3">
             <p className="text-gray-400 text-center py-8 italic">Chưa có nguyên liệu nào. Hãy thêm nguyên liệu bạn cần mua!</p>
          </div>
        </div>
        </Reveal>
      </div>
    </main>
  );
}
