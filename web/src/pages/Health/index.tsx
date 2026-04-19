import React, { useState, useEffect } from 'react';
import { Calendar, ShoppingBag, Activity, Plus, X, ArrowRight, HeartPulse, LineChart } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Link } from 'react-router-dom';
import AuthModal from '../../components/AuthModal';
import { apiJson } from '../../lib/api';
import { Reveal, RevealStaggerItem } from '../../components/motion/ScrollReveal';

interface HealthPlanCard {
  id: number;
  name: string;
  description?: string;
  dateRange: string;
  tag: string;
}

export default function Health() {
  const [activeTab, setActiveTab] = useState('plans');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  const [plans, setPlans] = useState<HealthPlanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadPlans = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await apiJson<{ authenticated?: boolean }>('/api/auth/me');
      if (!me.authenticated) {
        setIsAuthenticated(false);
        setPlans([]);
        return;
      }
      setIsAuthenticated(true);
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
          dateRange:
            p.start_date && p.end_date
              ? `${String(p.start_date)} → ${String(p.end_date)}`
              : '',
          tag: String(p.diet_type ?? ''),
        }))
      );
    } catch {
      setPlans([]);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-white/60 backdrop-blur-md shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Reveal className="text-center" y={20}>
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Quản lý Sức khỏe và Lập kế hoạch</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Lập kế hoạch bữa ăn, theo dõi dinh dưỡng và quản lý sức khỏe một cách thông minh
            </p>
          </Reveal>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Features Preview */}
        <div className="mb-12 cursor-default">
          <Reveal y={18}>
            <h2 className="text-2xl md:text-3xl font-bold text-black mb-6">Tính năng chính</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              { Icon: Calendar, title: 'Lập kế hoạch hàng ngày/tuần', desc: 'Tạo và quản lý kế hoạch bữa ăn theo ngày hoặc tuần một cách dễ dàng' },
              { Icon: LineChart, title: 'Biểu đồ dinh dưỡng', desc: 'Theo dõi và phân tích dinh dưỡng qua biểu đồ trực quan' },
              { Icon: HeartPulse, title: 'Chế độ ăn uống', desc: 'Chọn và theo dõi các chế độ ăn phù hợp với mục tiêu sức khỏe' },
              { Icon: ShoppingBag, title: 'Danh sách mua sắm', desc: 'Lên danh sách mua sắm từ kế hoạch bữa ăn của bạn' },
            ].map((f, idx) => (
              <RevealStaggerItem key={f.title} index={idx} stagger={0.065}>
                <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300 h-full border border-gray-100 flex flex-col">
                  <div className="w-12 h-12 flex items-center justify-start mb-4">
                    <f.Icon className="w-6 h-6 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm">{f.desc}</p>
                </div>
              </RevealStaggerItem>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-md mb-12 border border-white/20 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap">
              <button 
                onClick={() => setActiveTab('plans')}
                className={`px-6 py-4 text-sm font-medium ${activeTab === 'plans' ? 'text-black border-b-2 border-black' : 'text-gray-600 hover:text-black'}`}
              >
                Kế hoạch của tôi
              </button>
              <button 
                onClick={() => setActiveTab('shopping')}
                className={`px-6 py-4 text-sm font-medium ${activeTab === 'shopping' ? 'text-black border-b-2 border-black' : 'text-gray-600 hover:text-black'}`}
              >
                Danh sách mua sắm
              </button>
              <button 
                onClick={() => setActiveTab('nutrition')}
                className={`px-6 py-4 text-sm font-medium ${activeTab === 'nutrition' ? 'text-black border-b-2 border-black' : 'text-gray-600 hover:text-black'}`}
              >
                Dinh dưỡng
              </button>
            </nav>
          </div>

          <div className="p-6 min-h-[300px]">
            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-black">Kế hoạch bữa ăn</h3>
                  <button onClick={() => {
                    if (!isAuthenticated) setIsAuthOpen(true);
                    else setIsModalOpen(true);
                  }} className="bg-black text-white px-5 py-2.5 rounded-full font-semibold hover:bg-gray-800 transition-colors inline-flex items-center space-x-2 text-sm">
                    <Plus className="w-4 h-4"/>
                    <span>Tạo kế hoạch mới</span>
                  </button>
                </div>
                
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  key={`plans-${activeTab}-${plans.length}-${isLoading ? 1 : 0}`}
                >
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-4" />
                        <div className="mt-auto flex items-center justify-between">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </div>
                    ))
                  ) : plans.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-bold mb-2">Chưa có kế hoạch nào</h3>
                      <p className="text-gray-500">Hãy tạo kế hoạch đầu tiên của bạn để bắt đầu.</p>
                    </div>
                  ) : (
                    plans.map((plan, idx) => (
                      <RevealStaggerItem key={plan.id} index={idx} stagger={0.055} maxStaggerIndex={9} className="h-full">
                        <Link
                          to={`/health/detail/${plan.id}`}
                          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100 flex flex-col group h-full"
                        >
                          <h4 className="text-xl font-bold text-black group-hover:text-yellow-600 transition-colors mb-2">
                            {plan.name}
                          </h4>
                          <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                          <div className="mt-auto flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{plan.dateRange}</span>
                            </div>
                            <span className="bg-gray-100 text-black px-2 py-1 rounded text-xs">{plan.tag}</span>
                          </div>
                        </Link>
                      </RevealStaggerItem>
                    ))
                  )}
                </div>
              </div>
            )}
            {activeTab === 'shopping' && (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-2xl font-bold mb-2">Danh sách trống</h3>
                <p className="text-gray-500">Danh sách mua sắm sẽ được tự động tạo khi bạn có kế hoạch bữa ăn.</p>
              </div>
            )}
            {activeTab === 'nutrition' && (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-2xl font-bold mb-2">Biểu đồ dinh dưỡng</h3>
                <p className="text-gray-500">Thêm công thức vào kế hoạch để xem phân tích dinh dưỡng tại đây.</p>
              </div>
            )}
          </div>
        </div>

        {/* Call to Action */}
        <Reveal y={24}>
          <div className="bg-white/60 backdrop-blur-md text-black rounded-2xl shadow-md p-8 md:p-12 text-center border border-white/20">
            <HeartPulse className="w-16 h-16 mx-auto mb-6 text-red-500 animate-pulse" />
            <h2 className="text-3xl font-bold mb-4">Bắt đầu hành trình sức khỏe của bạn ngay hôm nay</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              Trải nghiệm sự tiện lợi của việc lập kế hoạch bữa ăn và để chúng tôi giúp bạn đạt được mục tiêu sức khỏe.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                onClick={() => {
                  if (!isAuthenticated) setIsAuthOpen(true);
                  else setIsModalOpen(true);
                }}
                className="w-full sm:w-auto bg-black text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300"
              >
                Tạo kế hoạch ngay
              </button>
              <Link
                to="/about"
                className="w-full sm:w-auto px-8 py-3 rounded-full bg-white text-black border border-gray-200 hover:bg-gray-50 transition-all duration-300 font-medium shadow-sm hover:shadow-md inline-flex items-center justify-center"
              >
                Tìm hiểu về chúng tôi <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col my-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-black">Tạo kế hoạch mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên kế hoạch</label>
                  <input type="text" required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-black focus:ring-0" placeholder="VD: Kế hoạch tuần 1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày bắt đầu</label>
                  <input type="date" required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-black focus:ring-0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mục tiêu dinh dưỡng</label>
                  <select className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-black focus:ring-0">
                    <option>Giảm cân</option>
                    <option>Giữ dáng</option>
                    <option>Tăng cơ</option>
                    <option>Ăn uống lành mạnh</option>
                  </select>
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors">Lưu kế hoạch</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={loadPlans} />
    </main>
  );
}
