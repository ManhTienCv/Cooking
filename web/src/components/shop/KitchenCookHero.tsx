import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface KitchenCookHeroProps {
  onExploreClick: () => void;
  onCookwareClick: () => void;
  totalProducts?: number;
}

export default function KitchenCookHero({
  onExploreClick,
  onCookwareClick,
}: KitchenCookHeroProps) {
  return (
    <div className="w-full bg-[#FAF7F2] dark:bg-slate-900 border-b border-stone-200/80 dark:border-slate-800 transition-colors duration-300 font-vietnam">
      {/* Hero Section chuẩn theo form ảnh mẫu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Cột trái: Typography nghệ thuật Châu Âu & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-vietnam font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Nâng tầm căn bếp, <br />
              <span className="text-stone-600 dark:text-stone-300 font-serif italic">tạo nên nghệ thuật</span>
            </h1>

            <p className="font-vietnam text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
              Bộ sưu tập nồi niêu xoong chảo, dao kéo và phụ kiện đồ bếp cao cấp chính hãng. Bền bỉ, tinh xảo và an toàn cho sức khỏe gia đình bạn.
            </p>

            {/* Cặp nút hành động */}
            <div className="flex items-center gap-3.5 pt-2 flex-wrap">
              <button
                type="button"
                onClick={onExploreClick}
                className="px-6 py-3.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-vietnam font-bold text-sm flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Khám phá sản phẩm
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onCookwareClick}
                className="px-6 py-3.5 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300/80 dark:border-slate-700 font-vietnam font-bold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all hover:border-slate-400 cursor-pointer"
              >
                Bộ sưu tập Nồi & Chảo
              </button>
            </div>
          </div>

          {/* Cột phải: Khung ảnh bo cong lớn phong cách Châu Âu */}
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 bg-slate-900 aspect-[4/3] sm:aspect-[16/12] group"
            >
              <img
                src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
                alt="KitchenCook Premium Cookware"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

              {/* Badge góc ảnh */}
              <div className="absolute bottom-5 left-5 right-5 text-white">
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
