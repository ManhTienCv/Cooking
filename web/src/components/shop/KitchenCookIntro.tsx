import { ShieldCheck, Flame, Truck, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const CORE_VALUES = [
  {
    icon: ShieldCheck,
    title: 'An Toàn Sức Khỏe',
    desc: 'Inox 304 & gang đúc nguyên khối, 100% không chứa PFOA',
  },
  {
    icon: Flame,
    title: 'Gia Nhiệt Hoàn Hảo',
    desc: 'Đáy đa lớp bắt từ nhạy bén, tỏa nhiệt đều, giữ trọn dưỡng chất',
  },
  {
    icon: Truck,
    title: 'Giao Nhanh GHN',
    desc: 'Đóng gói chuẩn chống va đập, theo dõi đơn hàng thời gian thực',
  },
  {
    icon: Award,
    title: 'Bảo Hành 2 Tháng',
    desc: '100% chính hãng, hỗ trợ 1 đổi 1 trong 7 ngày nếu lỗi sản xuất',
  },
];

export default function KitchenCookIntro() {
  return (
    <section className="py-6 sm:py-8 font-vietnam">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-stone-200/90 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-stone-100 dark:divide-slate-700/60">
            {CORE_VALUES.map((val, idx) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={val.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className={`flex items-center gap-3.5 ${idx > 0 ? 'pt-3 sm:pt-0 sm:pl-4 lg:pl-6' : ''}`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-center shrink-0 border border-stone-200 dark:border-slate-600 shadow-xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {val.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal line-clamp-1">
                      {val.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
