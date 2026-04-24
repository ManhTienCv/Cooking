import { Users, Heart, Award, Globe } from 'lucide-react';
import { HeroEnter, Reveal, RevealStaggerItem } from '../../components/motion/ScrollReveal';
import AboutFeedbackForm from '../../components/about/AboutFeedbackForm';

export default function About() {
  const statItems = [
    { icon: Users, value: '1+', label: 'Người dùng' },
    { icon: Heart, value: '1+', label: 'Công thức' },
    { icon: Award, value: '1+', label: 'Đầu bếp' },
    { icon: Globe, value: '1+', label: 'Quốc gia' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeroEnter className="text-center">
            <h1 className="text-5xl md:text-6xl font-serif italic font-black mb-6 text-black dark:text-white">
              Về <span className="text-gradient-live">CookingBoy</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Nơi kết nối những người yêu thích nấu ăn, chia sẻ công thức và lan tỏa tình yêu ẩm thực Việt Nam
            </p>
          </HeroEnter>
        </div>
      </section>

      <section id="stats-section" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <RevealStaggerItem key={item.label} index={idx} stagger={0.07}>
                  <div className="text-center group">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300 border border-white/20 dark:border-slate-700/20">
                      <div className="bg-black dark:bg-white p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-8 w-8 text-white dark:text-black mx-auto" />
                      </div>
                      <div className="text-3xl font-bold text-black dark:text-white mb-2">{item.value}</div>
                      <div className="text-gray-600 dark:text-gray-400">{item.label}</div>
                    </div>
                  </div>
                </RevealStaggerItem>
              );
            })}
          </div>
        </div>
      </section>

      <section id="story-section" className="py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Reveal className="text-left" y={24}>
              <h2 className="text-4xl font-bold text-black dark:text-white mb-6">Câu Chuyện Của Chúng Tôi</h2>
              <div className="space-y-4 text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                <p>
                  CookingBoy được sinh ra từ tình yêu với ẩm thực Việt Nam và mong muốn chia sẻ những công thức nấu ăn truyền thống quý báu với thế hệ trẻ.
                </p>
                <p>
                  Chúng tôi tin rằng mỗi món ăn đều chứa đựng một câu chuyện, một ký ức và là cầu nối kết nối mọi người lại gần nhau hơn.
                </p>
                <p>
                  Với đội ngũ đầu bếp giàu kinh nghiệm và đam mê, chúng tôi cam kết mang đến những công thức chất lượng, dễ hiểu và dễ thực hiện.
                </p>
              </div>
            </Reveal>
            <Reveal className="relative" y={24} delay={0.08}>
              <img
                src="/assets/images/vechungtoi.jpg"
                alt="Về chúng tôi"
                className="w-full h-96 object-cover rounded-2xl shadow-lg"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl pointer-events-none" />
            </Reveal>
          </div>
        </div>
      </section>

      <section id="team-section" className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black dark:text-white mb-4">Đội Ngũ Của Chúng Tôi</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Những đầu bếp tài năng và đam mê, luôn sẵn sàng chia sẻ kiến thức
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <RevealStaggerItem index={0} stagger={0.08}>
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 group border border-white/20 dark:border-slate-700/20">
                <div className="relative overflow-hidden">
                  <img
                    src="/assets/images/chef1.jpg"
                    alt="Chef"
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-bold text-black dark:text-white mb-1">Nguyễn Minh Đức</h3>
                  <p className="text-yellow-600 dark:text-yellow-500 font-medium mb-3">Chef A</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Chuyên gia về Cooking</p>
                </div>
              </div>
            </RevealStaggerItem>
          </div>
        </div>
      </section>

      <section id="mission-section" className="py-32">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <Reveal y={28}>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-3xl p-12 shadow-xl border border-white/20 dark:border-slate-700/20">
              <h2 className="text-4xl md:text-5xl font-serif italic font-black text-black dark:text-white mb-6">Sứ Mệnh Của Chúng Tôi</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Bảo tồn và phát triển nền ẩm thực Việt Nam, đồng thời tạo ra một cộng đồng những người yêu thích nấu ăn có thể học hỏi, chia sẻ và cùng nhau sáng tạo những món ăn ngon miệng.
              </p>
              <div className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-semibold text-lg inline-block shadow-lg">
                Cùng nhau nấu ăn, cùng nhau yêu thương
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <AboutFeedbackForm />
    </main>
  );
}
