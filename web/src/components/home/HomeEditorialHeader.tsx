import { Link } from 'react-router-dom';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';
import ImageWithFallback from '../../lib/ImageWithFallback';

const FEATURED_TALL_CATEGORIES = [
  { name: 'Bữa Tối', image: '/assets/images/monchinh.jpg' },
  { name: 'Nhanh & Gọn', image: '/assets/images/monkhaivi.jpg' },
  { name: 'Món Salad', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=2070&auto=format&fit=crop' },
  { name: 'Eat Clean', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=2053&auto=format&fit=crop' },
];

const CIRCLE_CATEGORIES = [
  { name: 'Nhanh & Gọn', image: '/assets/images/monkhaivi.jpg' },
  { name: 'Bữa Tối', image: '/assets/images/monchinh.jpg' },
  { name: 'Món Chay', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1968&auto=format&fit=crop' },
  { name: 'Eat Clean', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=2053&auto=format&fit=crop' },
  { name: 'Nồi Áp Suất', image: '/assets/images/vietnam1.jpg' },
  { name: 'Thuần Chay', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=2070&auto=format&fit=crop' },
  { name: 'Thực đơn bận rộn', image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=2070&auto=format&fit=crop' },
  { name: 'Súp & Canh', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=2071&auto=format&fit=crop' },
  { name: 'Món Salad', image: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=1990&auto=format&fit=crop' },
];

export default function HomeEditorialHeader() {
  return (
    <section className="pt-2 pb-4 sm:pt-16 sm:pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Typographic hero */}
        <Reveal className="mb-6 flex flex-col items-center justify-center border-b border-gray-100 py-4 text-center dark:border-slate-800 sm:mb-12 sm:py-16">
          <span className="mx-auto mb-3 block max-w-[22rem] break-words text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] text-gray-400 sm:mb-6 sm:max-w-[36rem] sm:text-base sm:tracking-[0.3em] md:text-xl">
            Công thức nấu ăn đơn giản dành cho
          </span>
          <h1 className="mx-auto max-w-[24rem] break-words font-serif text-xl italic leading-snug tracking-tight text-gray-900 dark:text-white sm:max-w-[42rem] sm:text-5xl sm:leading-[1.1] md:text-7xl">
            cuộc sống đời thực mỗi ngày.
          </h1>
        </Reveal>

        {/* Category cards — 2 cột mobile, nhãn overlay trong ảnh (không bị cắt) */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:mb-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {FEATURED_TALL_CATEGORIES.map((cat, idx) => (
            <RevealStaggerItem key={cat.name} index={idx} stagger={0.06} y={16} className="h-full">
              <Link
                to={`/recipes?category=${encodeURIComponent(cat.name)}`}
                className="group relative block h-full overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg dark:ring-white/10 dark:hover:shadow-amber-900/20"
              >
                <div className="relative aspect-[3/4] w-full">
                  <ImageWithFallback
                    src={cat.image}
                    alt={cat.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading={idx < 2 ? 'eager' : 'lazy'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
                    <p className="text-center font-serif text-[11px] font-bold uppercase tracking-[0.18em] text-white drop-shadow-sm sm:text-sm sm:tracking-[0.22em]">
                      {cat.name}
                    </p>
                  </div>
                </div>
              </Link>
            </RevealStaggerItem>
          ))}
        </div>

        {/* Circle categories — cuộn ngang mượt trên mobile */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-min snap-x snap-mandatory justify-center gap-4 sm:gap-6 md:gap-8">
            {CIRCLE_CATEGORIES.map((cat, idx) => (
              <RevealStaggerItem
                key={cat.name}
                index={idx}
                stagger={0.04}
                y={12}
                className="w-[4.75rem] shrink-0 snap-start sm:w-24"
              >
                <Link
                  to={`/recipes?category=${encodeURIComponent(cat.name)}`}
                  className="group flex flex-col items-center"
                >
                  <div className="mb-2 h-16 w-16 overflow-hidden rounded-full border-2 border-gray-200 p-0.5 transition-colors group-hover:border-gray-900 dark:border-slate-600 dark:group-hover:border-white sm:mb-3 sm:h-20 sm:w-20">
                    <ImageWithFallback
                      src={cat.image}
                      alt={cat.name}
                      className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <span className="line-clamp-2 min-h-[2.25rem] text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white sm:min-h-[2.5rem] sm:text-xs">
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
