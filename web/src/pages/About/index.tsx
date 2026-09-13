import { Link } from 'react-router-dom';
import {
  Users,
  Heart,
  Award,
  Globe,
  ChefHat,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Utensils,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { HeroEnter, Reveal, RevealStaggerItem } from '../../components/motion/ScrollReveal';
import AboutFeedbackForm from '../../components/about/AboutFeedbackForm';

export default function About() {
  const statItems = [
    {
      icon: Users,
      value: '50,000+',
      label: 'Thành viên & Người yêu bếp',
      desc: 'Cộng đồng đam mê nấu nướng trên khắp cả nước',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-100 dark:border-blue-900/40',
    },
    {
      icon: Utensils,
      value: '1,200+',
      label: 'Công thức kiểm định chuẩn',
      desc: 'Được thử nghiệm định lượng chính xác từng gram',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      border: 'border-orange-100 dark:border-orange-900/40',
    },
    {
      icon: Award,
      value: '98.6%',
      label: 'Tỷ lệ nấu thành công',
      desc: 'Người dùng phản hồi tích cực ngay lần đầu thử nấu',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-100 dark:border-emerald-900/40',
    },
    {
      icon: Globe,
      value: '63/63',
      label: 'Tỉnh thành lan tỏa vị ngon',
      desc: 'Tôn vinh và bảo tồn ẩm thực ba miền Bắc - Trung - Nam',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      border: 'border-purple-100 dark:border-purple-900/40',
    },
  ];

  const coreValues = [
    {
      icon: CheckCircle2,
      title: 'Chuẩn xác & Dễ thực hiện',
      desc: 'Mọi công thức đều được đo lường chính xác bằng gram, ml và thời gian chuẩn, giúp người mới bắt đầu vẫn có thể tự tin vào bếp nấu ngon như nhà hàng.',
      badge: 'Chất lượng hàng đầu',
    },
    {
      icon: Heart,
      title: 'Dinh dưỡng & An lành',
      desc: 'Không chỉ dừng lại ở hương vị, CookingBoy chú trọng tính toán calo, giảm muối và dầu mỡ dư thừa, hỗ trợ các thực đơn Eat Clean, thực dưỡng và ăn chay lành mạnh.',
      badge: 'Vì sức khỏe',
    },
    {
      icon: ShieldCheck,
      title: 'Đồ bếp tuyển chọn KitchenCook',
      desc: 'Hợp tác chặt chẽ cùng KitchenCook để mang đến những dụng cụ làm bếp chuẩn inox 304, chống dính cao cấp không PFOA, được kiểm định nghiêm ngặt về độ bền và an toàn.',
      badge: 'Chính hãng 100%',
    },
    {
      icon: Users,
      title: 'Cộng đồng sẻ chia văn minh',
      desc: 'Nơi mỗi người nội trợ, bạn trẻ hay đầu bếp chuyên nghiệp đều có thể chia sẻ bí quyết gia truyền, tạo hồ sơ cá nhân và truyền cảm hứng yêu bếp cho hàng triệu người.',
      badge: 'Gắn kết bền chặt',
    },
  ];

  const teamMembers = [
    {
      name: 'Chef Mạnh Tiến',
      role: 'Bếp trưởng Điều hành (Executive Chef)',
      exp: '15 năm kinh nghiệm ẩm thực truyền thống & Fusion',
      image: '/assets/images/chef.jpg',
      quote: 'Mỗi món ăn là một câu chuyện tình cảm gia đình được kể bằng gia vị và sự kiên nhẫn.',
    },
    {
      name: 'ThS. Mạnh Tiến',
      role: 'Chuyên gia Dinh dưỡng Lâm sàng',
      exp: 'Cố vấn thực đơn sức khỏe & Dinh dưỡng gia đình',
      image: '/assets/images/chef.jpg',
      quote: 'Ăn ngon phải đi đôi với sống khỏe. Dinh dưỡng hợp lý là chìa khóa của hạnh phúc bền lâu.',
    },
    {
      name: 'Chef Mạnh Tiến',
      role: 'Chuyên gia Thiết bị Bếp KitchenCook',
      exp: 'Trưởng ban kiểm định & Thử nghiệm gia dụng nhà bếp',
      image: '/assets/images/chef.jpg',
      quote: 'Dụng cụ làm bếp tốt chính là trợ thủ đắc lực giúp người nấu tiết kiệm 50% thời gian và công sức.',
    },
    {
      name: 'Food Creator Mạnh Tiến',
      role: 'Trưởng ban Biên tập Nội dung',
      exp: 'Người sáng tạo nội dung ẩm thực với hơn 500 video hướng dẫn',
      image: '/assets/images/chef.jpg',
      quote: 'Vào bếp không phải là nghĩa vụ, đó là khoảng thời gian thư giãn và sáng tạo tuyệt vời nhất.',
    },
  ];

  const milestones = [
    {
      year: '2023',
      title: 'Khởi nguồn từ cuốn sổ tay của mẹ',
      desc: 'Ý tưởng số hóa các món ăn truyền thống được nhen nhóm, với mục tiêu giúp các bạn trẻ xa quê vẫn có thể tự tay nấu chuẩn vị cơm nhà.',
    },
    {
      year: '2024',
      title: 'Ra mắt Cổng Ẩm thực CookingBoy',
      desc: 'Đạt mốc 10.000 thành viên sau 3 tháng. Giới thiệu tính năng gợi ý món ăn theo nguyên liệu có sẵn trong tủ lạnh (Fridge Search).',
    },
    {
      year: '2025',
      title: 'Hợp nhất Thương hiệu KitchenCook',
      desc: 'Mở rộng hệ sinh thái với cửa hàng đồ bếp chuyên dụng: chảo gang, nồi áp suất, dao gọt chuyên nghiệp cùng chính sách bảo hành an tâm.',
    },
    {
      year: '2026',
      title: 'Hệ sinh thái ẩm thực toàn diện',
      desc: 'Hơn 50.000 người dùng tích cực, ứng dụng gợi ý dinh dưỡng thông minh và mạng lưới giao hàng đồ bếp hỏa tốc trên toàn quốc.',
    },
  ];

  return (
    <div className="font-vietnam min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* 1. HERO BANNER SANG TRỌNG */}
      <section className="relative pt-12 pb-20 overflow-hidden border-b border-slate-200/60 dark:border-slate-800/80">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeroEnter className="text-center max-w-4xl mx-auto">


            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-6">
              Kết Nối Triệu Gian Bếp,{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 bg-clip-text text-transparent">
                Lan Tỏa Tình Yêu
              </span>{' '}
              Ẩm Thực Việt
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl mx-auto mb-10">
              <strong>CookingBoy</strong> được sinh ra với mong muốn bảo tồn những hương vị truyền thống tinh tế,
              kết hợp cùng thế giới đồ bếp chuẩn mực <strong>KitchenCook</strong> — tạo nên một hệ sinh thái trọn vẹn,
              nơi bất kỳ ai cũng có thể tìm thấy niềm vui, sự thư thái và tự tin trong chính căn bếp của mình.
            </p>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/recipes"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <Utensils className="w-4 h-4" />
                <span>Khám phá công thức ngay</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>

              <Link
                to="/shop"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>Ghé Cửa hàng KitchenCook</span>
              </Link>
            </div>
          </HeroEnter>
        </div>
      </section>

      {/* 2. STATS SECTION - BENTO CARDS ẤN TƯỢNG */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <RevealStaggerItem key={item.label} index={idx} stagger={0.08}>
                  <div
                    className={`p-6 rounded-3xl bg-white dark:bg-slate-800/90 border ${item.border} shadow-xs hover:shadow-lg transition-all duration-300 group`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-2xs`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {item.value}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                      {item.label}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </RevealStaggerItem>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. CÂU CHUYỆN THƯƠNG HIỆU & BỨC TRANH NGHỆ THUẬT */}
      <section className="py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <Reveal y={24}>


                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mt-3">
                  Từ Bát Phở Của Mẹ Đến Khát Vọng Số Hóa Nền Ẩm Thực
                </h2>

                <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                  <p>
                    Ai trong chúng ta cũng mang trong mình ký ức về một mùi hương quen thuộc: mùi hành phi thơm lừng của bà, bát canh cua rau đay thanh mát của mẹ trong trưa hè, hay tiếng xèo xèo của chiếc chảo gang mỗi chiều tan làm.
                  </p>
                  <p>
                    Thế nhưng, khi cuộc sống ngày một hối hả, những công thức gia truyền thường chỉ được truyền miệng mơ hồ bằng khái niệm “nêm vừa ăn”, “đun đến khi tới”. Nhiều người trẻ muốn tái hiện lại mâm cơm tuổi thơ nhưng gặp khó khăn vì thiếu định lượng chính xác.
                  </p>
                  <p className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600 text-slate-800 dark:text-slate-200 text-sm italic font-medium">
                    “CookingBoy ra đời với một lời hứa: Định lượng từng hạt muối, số hóa từng ngọn lửa, để bất kỳ ai cũng có thể mang hương vị gia đình về ngay trong căn bếp hiện đại.”
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Right Image Showcase */}
            <div className="lg:col-span-6">
              <Reveal y={24} delay={0.1}>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-700">
                  <img
                    src="/assets/images/vechungtoi.jpg"
                    alt="Đội ngũ CookingBoy và tình yêu nấu nướng"
                    className="w-full h-[420px] object-cover hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SỨ MỆNH VÀ TẦM NHÌN (MISSION & VISION) */}
      <section className="py-16 bg-slate-100/60 dark:bg-slate-900/60 border-y border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              Sứ Mệnh & Tầm Nhìn Chiến Lược
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Chúng tôi không chỉ cung cấp giải pháp ẩm thực mà còn nuôi dưỡng phong cách sống khỏe mạnh, bền vững.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sứ mệnh */}
            <Reveal y={20}>
              <div className="h-full p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                    Sứ Mệnh Của Chúng Tôi
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                    Bảo tồn, chuẩn hóa và lan tỏa tình yêu ẩm thực Việt Nam tới mọi thế hệ. Tạo dựng một không gian trực tuyến bổ ích, nơi ai cũng có thể tự tin nấu cho bản thân và gia đình những bữa cơm thơm ngon, dinh dưỡng chỉ từ những nguyên liệu giản đơn nhất.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Tầm nhìn */}
            <Reveal y={20} delay={0.1}>
              <div className="h-full p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                    Tầm Nhìn 2030
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                    Trở thành hệ sinh thái Ẩm thực & Thiết bị gia dụng nhà bếp số 1 Việt Nam. Ứng dụng trí tuệ nhân tạo (AI) giúp tối ưu hóa thực đơn cá nhân theo thể trạng sức khỏe, đồng thời đồng hành cùng các xưởng sản xuất uy tín cung cấp thiết bị làm bếp đạt chuẩn quốc tế.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5. HỆ SINH THÁI KÉP: COOKINGBOY x KITCHENCOOK */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              Hai Mảnh Ghép Hoàn Hảo Cho Gian Bếp Của Bạn
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Kỹ năng nấu nướng tuyệt vời cần có những dụng cụ làm bếp chuẩn mực đồng hành.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cổng CookingBoy */}
            <Reveal y={20}>
              <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-50/70 to-white dark:from-slate-800 dark:to-slate-800/60 border border-emerald-200/80 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <ChefHat className="w-7 h-7" />
                  </div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                    Cổng Ẩm Thực
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                  CookingBoy — Nền Tảng Công Thức & Sức Khỏe
                </h3>

                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                  Kho tri thức với hơn 1.200 công thức ba miền, cẩm nang nấu ăn, giải pháp thực đơn dinh dưỡng theo mùa, và tính năng thông minh tìm kiếm món ngon từ nguyên liệu thừa trong tủ lạnh.
                </p>

                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-8 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hướng dẫn chi tiết từng bước (Step-by-Step) có hình ảnh</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tính năng "Hôm nay ăn gì" & Tìm kiếm món theo tủ lạnh thông minh</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Diễn đàn ẩm thực chia sẻ và thảo luận sôi nổi</span>
                  </li>
                </ul>

                <Link
                  to="/recipes"
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:gap-3 transition-all"
                >
                  <span>Khám phá kho công thức CookingBoy</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Reveal>

            {/* Cửa hàng KitchenCook */}
            <Reveal y={20} delay={0.1}>
              <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-50/70 to-white dark:from-slate-800 dark:to-slate-800/60 border border-amber-200/80 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                    Cửa Hàng Đồ Bếp
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                  KitchenCook — Dụng Cụ Bếp Chuẩn Chuyên Nghiệp
                </h3>

                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                  Cung cấp các dòng chảo chống dính cao cấp, nồi hầm áp suất, dao thớt kháng khuẩn và phụ kiện làm bếp tiêu chuẩn châu Âu, kèm chính sách bảo hành 30 ngày an tâm tuyệt đối.
                </p>

                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-8 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Chất liệu an toàn sức khỏe: Inox 304, chống dính không chứa PFOA</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Hỗ trợ thanh toán MoMo, VietQR và COD kiểm hàng trước khi nhận</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Giao hàng nhanh toàn quốc liên kết cùng bưu cục GHN Express</span>
                  </li>
                </ul>

                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 hover:gap-3 transition-all"
                >
                  <span>Ghé thăm gian hàng KitchenCook</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 6. 4 GIÁ TRỊ CỐT LÕI (CORE VALUES) */}
      <section className="py-16 bg-slate-100/60 dark:bg-slate-900/60 border-y border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              4 Giá Trị Cốt Lõi Của CookingBoy
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((val, idx) => {
              const Icon = val.icon;
              return (
                <RevealStaggerItem key={val.title} index={idx} stagger={0.08}>
                  <div className="h-full p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                        {val.badge}
                      </span>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        {val.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {val.desc}
                      </p>
                    </div>
                  </div>
                </RevealStaggerItem>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. ĐỘI NGŨ ĐẦU BẾP & CHUYÊN GIA ẨM THỰC */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              Những Người Thổi Hồn Cho Từng Món Ăn
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Đội ngũ đầu bếp, chuyên gia dinh dưỡng và những người đam mê ẩm thực đồng hành cùng CookingBoy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((m, idx) => (
              <RevealStaggerItem key={m.name} index={idx} stagger={0.08}>
                <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-lg transition-all overflow-hidden group flex flex-col justify-between h-full">
                  <div>
                    <div className="h-64 overflow-hidden relative">
                      <img
                        src={m.image}
                        alt={m.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <span className="text-xs font-medium text-slate-200 block truncate">
                          {m.exp}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        {m.name}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                        {m.role}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 italic leading-relaxed">
                        “{m.quote}”
                      </p>
                    </div>
                  </div>
                </div>
              </RevealStaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* 8. HÀNH TRÌNH PHÁT TRIỂN (TIMELINE MILESTONES) */}
      <section className="py-20 bg-slate-100/60 dark:bg-slate-900/60 border-y border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              Hành Trình Kiến Tạo & Trưởng Thành
            </h2>
          </div>

          <div className="space-y-6">
            {milestones.map((ms, idx) => (
              <Reveal key={ms.year} y={16} delay={idx * 0.08}>
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-black shrink-0 shadow-md shadow-blue-500/20">
                    <span className="text-xs opacity-80 uppercase tracking-wider">Năm</span>
                    <span className="text-2xl leading-none mt-0.5">{ms.year}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {ms.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {ms.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FORM GÓP Ý & PHẢN HỒI (ABOUT FEEDBACK FORM) */}
      <AboutFeedbackForm />
    </div>
  );
}
