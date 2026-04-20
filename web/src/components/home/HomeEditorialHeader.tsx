import { Link } from 'react-router-dom';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';


const FEATURED_TALL_CATEGORIES = [
  { name: 'BỮA TỐI', image: '/assets/images/monchinh.jpg' },
  { name: 'NHANH CHÓNG VÀ DỄ DÀNG', image: '/assets/images/monkhaivi.jpg' },
  { name: 'SALAD', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop' },
  { name: 'KHỎE MẠNH', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2053&auto=format&fit=crop' },
];

const CIRCLE_CATEGORIES = [
  { name: 'NHANH CHÓNG VÀ DỄ DÀNG', image: '/assets/images/monkhaivi.jpg' },
  { name: 'BỮA TỐI', image: '/assets/images/monchinh.jpg' },
  { name: 'NGƯỜI ĂN CHAY', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=1968&auto=format&fit=crop' },
  { name: 'KHỎE MẠNH', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2053&auto=format&fit=crop' },
  { name: 'NỒI ÁP SUẤT', image: 'https://images.unsplash.com/photo-1585931668832-6a695dbbf77c?q=80&w=1928&auto=format&fit=crop' },
  { name: 'THUẦN CHAY', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop' },
  { name: 'CHUẨN BỊ BỮA ĂN', image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=2070&auto=format&fit=crop' },
  { name: 'SÚP', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=2071&auto=format&fit=crop' },
  { name: 'SALAD', image: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?q=80&w=1990&auto=format&fit=crop' },
];

export default function HomeEditorialHeader() {
  return (
    <section className="pt-24 pb-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Typographic Top */}
        <Reveal className="text-center py-10 mb-8 border-b border-gray-100 flex flex-col md:flex-row items-center justify-center gap-2">
          <span className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-[0.2em]">CÔNG THỨC NẤU ĂN ĐƠN GIẢN DÀNH CHO</span> 
          <span className="font-serif italic text-2xl md:text-3xl text-gray-400 lowercase tracking-wide">cuộc sống đời thực mỗi ngày.</span>
        </Reveal>

        {/* 4 Tall Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {FEATURED_TALL_CATEGORIES.map((cat, idx) => (
            <RevealStaggerItem key={idx} index={idx} stagger={0.08} y={20}>
              <Link to={`/recipes?category=${encodeURIComponent(cat.name)}`} className="group block relative w-full h-[32rem] md:h-[28rem] lg:h-[24rem] xl:h-[28rem] rounded-sm overflow-hidden mb-8 md:mb-0">
                <img 
                  src={cat.image} 
                  alt={cat.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                />
                {/* Overlay gradients just slightly for text readability if needed, but the ref has labels partly outside */}
                <div className="absolute inset-x-0 bottom-0 flex justify-center translate-y-1/2 z-10 p-4">
                  <div className="bg-white/95 backdrop-blur font-serif text-sm tracking-widest font-bold uppercase py-3 px-6 shadow-md text-amber-600 border border-amber-100 min-w-[70%] text-center group-hover:text-amber-700 transition-colors">
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
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-black transition-colors duration-300 p-1 mb-3">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <span className="text-xs font-bold uppercase text-center text-gray-800 tracking-wider h-10 group-hover:text-black">
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
