import React, { useState } from 'react';
import { Users, Heart, Award, Globe } from 'lucide-react';
import { HeroEnter, Reveal, RevealStaggerItem } from '../../components/motion/ScrollReveal';

export default function About() {
  const [feedback, setFeedback] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.name || !feedback.message) {
      setStatus({ type: 'error', message: 'Vui lòng điền đầy đủ tên và nội dung phản hồi.' });
      return;
    }
    setTimeout(() => {
      setStatus({ type: 'success', message: 'Cảm ơn bạn đã gửi phản hồi! Chúng tôi đã ghi nhận ý kiến của bạn.' });
      setFeedback({ name: '', email: '', message: '' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    }, 500);
  };

  const statItems = [
    { icon: Users, value: '1+', label: 'Người dùng' },
    { icon: Heart, value: '1+', label: 'Công thức' },
    { icon: Award, value: '1+', label: 'Đầu bếp' },
    { icon: Globe, value: '1+', label: 'Quốc gia' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeroEnter className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-black">
              Về <span className="text-gradient-live">CookingBoy</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
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
                    <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300 border border-white/20">
                      <div className="bg-black p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-8 w-8 text-white mx-auto" />
                      </div>
                      <div className="text-3xl font-bold text-black mb-2">{item.value}</div>
                      <div className="text-gray-600">{item.label}</div>
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
              <h2 className="text-4xl font-bold text-black mb-6">Câu Chuyện Của Chúng Tôi</h2>
              <div className="space-y-4 text-gray-700 text-lg leading-relaxed">
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
            <h2 className="text-4xl font-bold text-black mb-4">Đội Ngũ Của Chúng Tôi</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Những đầu bếp tài năng và đam mê, luôn sẵn sàng chia sẻ kiến thức
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <RevealStaggerItem index={0} stagger={0.08}>
              <div className="bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 group border border-white/20">
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
                  <h3 className="text-xl font-bold text-black mb-1">Nguyễn Minh Đức</h3>
                  <p className="text-yellow-600 font-medium mb-3">Chef A</p>
                  <p className="text-gray-600 text-sm leading-relaxed">Chuyên gia về Cooking</p>
                </div>
              </div>
            </RevealStaggerItem>
          </div>
        </div>
      </section>

      <section id="mission-section" className="py-32">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <Reveal y={28}>
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-12 shadow-xl border border-white/20">
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">Sứ Mệnh Của Chúng Tôi</h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Bảo tồn và phát triển nền ẩm thực Việt Nam, đồng thời tạo ra một cộng đồng những người yêu thích nấu ăn có thể học hỏi, chia sẻ và cùng nhau sáng tạo những món ăn ngon miệng.
              </p>
              <div className="bg-black text-white px-8 py-4 rounded-full font-semibold text-lg inline-block shadow-lg">
                Cùng nhau nấu ăn, cùng nhau yêu thương
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal y={20}>
            <h3 className="text-3xl font-bold text-black mb-4">Phản hồi</h3>
            <p className="text-gray-600 mb-6">Hãy cho chúng tôi biết trải nghiệm của bạn.</p>

            {status.message && (
              <div
                className={`border rounded-xl p-4 mb-4 transition-all duration-500 ${
                  status.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <p>{status.message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Tên của bạn"
                value={feedback.name}
                onChange={(e) => setFeedback({ ...feedback, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-0"
              />
              <input
                type="email"
                placeholder="Email (tùy chọn)"
                value={feedback.email}
                onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-0"
              />
              <textarea
                rows={4}
                placeholder="Nội dung phản hồi"
                value={feedback.message}
                onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-0"
              />
              <button type="submit" className="px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-900">
                Gửi phản hồi
              </button>
            </form>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
