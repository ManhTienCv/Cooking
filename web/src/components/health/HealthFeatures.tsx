import { Calendar, LineChart, HeartPulse, ShoppingBag } from 'lucide-react';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';

export default function HealthFeatures() {
  const features = [
    { Icon: Calendar, title: 'Lập kế hoạch hàng ngày/tuần', desc: 'Tạo và quản lý kế hoạch bữa ăn theo ngày hoặc tuần một cách dễ dàng' },
    { Icon: LineChart, title: 'Biểu đồ dinh dưỡng', desc: 'Theo dõi và phân tích dinh dưỡng qua biểu đồ trực quan' },
    { Icon: HeartPulse, title: 'Chế độ ăn uống', desc: 'Chọn và theo dõi các chế độ ăn phù hợp với mục tiêu sức khỏe' },
    { Icon: ShoppingBag, title: 'Danh sách mua sắm', desc: 'Lên danh sách mua sắm từ kế hoạch bữa ăn của bạn' },
  ];

  return (
    <div className="mb-12 cursor-default">
      <Reveal y={18}>
        <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-6">Tính năng chính</h2>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {features.map((f, idx) => (
          <RevealStaggerItem key={f.title} index={idx} stagger={0.065}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300 h-full border border-gray-100 dark:border-slate-700 flex flex-col">
              <div className="w-12 h-12 flex items-center justify-start mb-4">
                <f.Icon className="w-6 h-6 text-black dark:text-white" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{f.desc}</p>
            </div>
          </RevealStaggerItem>
        ))}
      </div>
    </div>
  );
}
