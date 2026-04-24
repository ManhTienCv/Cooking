import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';

export default function HomeCategories() {
  useEffect(() => {
    // Kept for consistency if needed, but tilt is removed from elements
  }, []);

  return (
    <section className="py-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-t border-b border-white/60 dark:border-slate-800/60 transition-colors duration-300 categories-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <h2 className="text-5xl font-serif text-black dark:text-white mb-4">Các Danh Mục Chính</h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto font-medium">
            Khám phá nguồn cảm hứng nấu nướng thông qua các lựa chọn phổ biến nhất.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="category-grid">
          {['Món khai vị', 'Món chính', 'Tráng miệng', 'Đồ uống'].map((cat, idx) => {
            const imgMap: Record<string, string> = {
              'Món khai vị': 'monkhaivi.jpg',
              'Món chính': 'monchinh.jpg',
              'Tráng miệng': 'montrangmieng.jpg',
              'Đồ uống': 'douong.jpg',
            };
            return (
              <RevealStaggerItem key={cat} index={idx} stagger={0.07} y={22}>
                <div className="h-64">
                  <Link
                    to={`/recipes?category=${encodeURIComponent(cat)}`}
                    className="block w-full h-full group relative overflow-hidden rounded-sm transition-all duration-500 shadow-sm hover:shadow-xl"
                  >
                    <img
                      src={`/assets/images/${imgMap[cat]}`}
                      alt={cat}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-300"></div>
                    <div className="absolute inset-0 flex flex-col justify-center items-center p-6">
                      <h3 className="text-white text-2xl font-serif font-bold tracking-widest uppercase mb-2 group-hover:-translate-y-1 transition-transform duration-500">
                        {cat}
                      </h3>
                      <div className="w-8 h-1 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 mt-2"></div>
                    </div>
                  </Link>
                </div>
              </RevealStaggerItem>
            );
          })}
        </div>
      </div>
    </section>
  );
}
