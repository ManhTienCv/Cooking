import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';

export default function HomeCategories() {
  useEffect(() => {
    // Kept for consistency if needed, but tilt is removed from elements
  }, []);

  return (
    <section className="py-12 sm:py-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-t border-b border-white/60 dark:border-slate-800/60 transition-colors duration-300 categories-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10 sm:mb-16">
          <h2 className="text-3xl sm:text-5xl font-serif text-black dark:text-white mb-3 sm:mb-4">Các Danh Mục Chính</h2>
          <p className="text-base sm:text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto font-medium">
            Khám phá nguồn cảm hứng nấu nướng thông qua các lựa chọn phổ biến nhất.
          </p>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6" id="category-grid">
          {['Món khai vị', 'Món chính', 'Tráng miệng', 'Đồ uống'].map((cat, idx) => {
            const imgMap: Record<string, string> = {
              'Món khai vị': 'monkhaivi.jpg',
              'Món chính': 'monchinh.jpg',
              'Tráng miệng': 'montrangmieng.jpg',
              'Đồ uống': 'douong.jpg',
            };
            return (
              <RevealStaggerItem key={cat} index={idx} stagger={0.07} y={22} className="h-full">
                <Link
                  to={`/recipes?category=${encodeURIComponent(cat)}`}
                  className="group relative block h-full overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg dark:ring-white/10 dark:hover:shadow-amber-900/20"
                >
                  <div className="relative aspect-[3/4] w-full">
                    <img
                      src={`/assets/images/${imgMap[cat]}`}
                      alt={cat}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-center sm:p-6">
                      <h3 className="font-serif text-sm font-bold uppercase tracking-[0.2em] text-white drop-shadow-sm sm:text-base sm:tracking-[0.25em]">
                        {cat}
                      </h3>
                    </div>
                  </div>
                </Link>
              </RevealStaggerItem>
            );
          })}
        </div>
      </div>
    </section>
  );
}
