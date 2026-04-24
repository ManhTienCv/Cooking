import { Link } from 'react-router-dom';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';


const FEATURED_TALL_CATEGORIES = [
  { name: 'Bữa Tối', image: '/assets/images/monchinh.jpg' },
  { name: 'Nhanh & Gọn', image: '/assets/images/monkhaivi.jpg' },
  { name: 'Món Salad', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop' },
  { name: 'Eat Clean', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2053&auto=format&fit=crop' },
];

const CIRCLE_CATEGORIES = [
  { name: 'Nhanh & Gọn', image: '/assets/images/monkhaivi.jpg' },
  { name: 'Bữa Tối', image: '/assets/images/monchinh.jpg' },
  { name: 'Món Chay', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=1968&auto=format&fit=crop' },
  { name: 'Eat Clean', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2053&auto=format&fit=crop' },
  { name: 'Nồi Áp Suất', image: 'https://images.unsplash.com/photo-1585931668832-6a695dbbf77c?q=80&w=1928&auto=format&fit=crop' },
  { name: 'Thuần Chay', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop' },
  { name: 'Thực đơn bận rộn', image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=2070&auto=format&fit=crop' },
  { name: 'Súp & Canh', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=2071&auto=format&fit=crop' },
  { name: 'Món Salad', image: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?q=80&w=1990&auto=format&fit=crop' },
];

export default function HomeEditorialHeader() {
  return (
    <section className="pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Typographic Top */}
        <Reveal className="text-center py-20 mb-12 border-b border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center">
          {/* Dòng này đã được tăng size lên text-base và md:text-xl */}
          <span className="text-base md:text-xl font-bold text-gray-400 uppercase tracking-[0.3em] mb-6">
            Công thức nấu ăn đơn giản dành cho
          </span>

          <h1 className="font-serif italic text-5xl md:text-7xl text-gray-900 dark:text-white leading-[1.1] tracking-tight">
            cuộc sống đời thực mỗi ngày.
          </h1>
        </Reveal>

        {/* 4 Tall Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {FEATURED_TALL_CATEGORIES.map((cat, idx) => (
            <RevealStaggerItem key={idx} index={idx} stagger={0.08} y={20}>
              <Link to={`/recipes?category=${encodeURIComponent(cat.name)}`} className="group block relative w-full h-[32rem] md:h-[28rem] lg:h-[24rem] xl:h-[28rem] rounded-sm mb-8 md:mb-0">
                <div className="w-full h-full overflow-hidden rounded-sm">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="eager"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex justify-center translate-y-1/2 z-10 px-4">
                  <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur font-serif text-sm tracking-widest font-bold uppercase py-3 px-6 shadow-md text-black dark:text-white border border-gray-200 dark:border-slate-800 min-w-[70%] text-center group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                    {cat.name}
                  </div>
                </div>
              </Link>
            </RevealStaggerItem>
          ))}
        </div>

        {/* Circle Categories */}
        <div className="pt-8 overflow-x-auto pb-4 hide-scrollbar">
          <div className="flex items-start md:justify-center space-x-6 md:space-x-8 px-2 min-w-max">
            {CIRCLE_CATEGORIES.map((cat, idx) => (
              <RevealStaggerItem key={idx} index={idx} stagger={0.05} y={15} className="flex flex-col items-center group w-24">
                <Link to={`/recipes?category=${encodeURIComponent(cat.name)}`} className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-black dark:group-hover:border-white transition-colors duration-300 p-1 mb-3">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <span className="text-xs font-bold uppercase text-center text-gray-800 dark:text-gray-300 tracking-wider h-10 group-hover:text-black dark:group-hover:text-white">
                    {cat.name}
                  </span>
                </Link>
              </RevealStaggerItem>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
