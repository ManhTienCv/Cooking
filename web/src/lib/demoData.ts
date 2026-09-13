import type { Product, ProductCategory, CartItem, Order } from '../types/marketplace';

export const DEMO_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 6, name: 'Nồi & Chảo', slug: 'noi-chao', type: 'equipment', icon: 'CookingPot', sort_order: 1 },
  { id: 7, name: 'Dao & Thớt', slug: 'dao-thot', type: 'equipment', icon: 'Slice', sort_order: 2 },
  { id: 8, name: 'Máy xay & Máy ép', slug: 'may-xay-ep', type: 'equipment', icon: 'Cog', sort_order: 3 },
  { id: 9, name: 'Phụ kiện nhà bếp', slug: 'phu-kien-bep', type: 'equipment', icon: 'Wrench', sort_order: 4 },
  { id: 10, name: 'Bộ đồ ăn & Dụng cụ bàn', slug: 'bo-do-an', type: 'equipment', icon: 'Utensils', sort_order: 5 },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 101,
    seller_id: 1,
    category_id: 6,
    name: 'Chảo Gang Đúc Nguyên Khối Chống Dính Tự Nhiên Staub 26cm',
    slug: 'chao-gang-duc-nguyen-khoi-chong-dinh-staub-26cm',
    description: 'Chảo gang tráng men cao cấp Staub sản xuất theo công nghệ truyền thống của Pháp. Giữ nhiệt cực lâu, tỏa nhiệt đều hoàn hảo, lý tưởng cho các món bít tết (steak), áp chảo, nướng đút lò. An toàn tuyệt đối cho sức khỏe, tương thích mọi loại bếp kể cả bếp từ.',
    price: 1250000,
    sale_price: 990000,
    image_url: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80'
    ],
    product_type: 'equipment',
    specs: { 'Chất liệu': 'Gang đúc nguyên khối tráng men', 'Đường kính': '26 cm', 'Độ dày đáy': '4.5 mm', 'Xuất xứ': 'Pháp' },
    stock: 25,
    unit: 'cái',
    is_available: true,
    is_featured: true,
    rating: 4.9,
    total_reviews: 42,
    total_sold: 128,
    recipe_id: 1,
    status: 'approved',
    created_at: '2026-03-01T10:00:00Z',
    seller_name: 'KitchenCook Flagship Store',
    seller_avatar: '/assets/images/avatar1.jpg',
    store_name: 'KitchenCook Store',
    category_name: 'Nồi & Chảo',
    category_slug: 'noi-chao',
  },
  {
    id: 102,
    seller_id: 1,
    category_id: 6,
    name: 'Nồi Áp Suất Đa Năng Điện Tử Tefal Secure Neo 6L',
    slug: 'noi-ap-suat-da-nang-dien-tu-tefal-secure-neo-6l',
    description: 'Nồi áp suất dung tích 6L làm mềm thịt bò, ninh xương hầm chỉ trong 25 phút. Tiết kiệm 70% thời gian nấu và giữ trọn 90% dưỡng chất món ăn. Hệ thống 5 chốt van an toàn tự động xả áp.',
    price: 2190000,
    sale_price: 1850000,
    image_url: 'https://images.unsplash.com/photo-1584990347449-39965a363d35?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1584990347449-39965a363d35?auto=format&fit=crop&w=800&q=80'],
    product_type: 'equipment',
    specs: { 'Dung tích': '6 Lít', 'Chất liệu': 'Thép không gỉ 18/10', 'Bảo hành': '24 tháng' },
    stock: 18,
    unit: 'cái',
    is_available: true,
    is_featured: true,
    rating: 4.8,
    total_reviews: 35,
    total_sold: 95,
    recipe_id: 2,
    status: 'approved',
    created_at: '2026-03-02T10:00:00Z',
    seller_name: 'KitchenCook Flagship Store',
    seller_avatar: '/assets/images/avatar1.jpg',
    store_name: 'KitchenCook Store',
    category_name: 'Nồi & Chảo',
    category_slug: 'noi-chao',
  },
  {
    id: 103,
    seller_id: 1,
    category_id: 7,
    name: 'Bộ Dao Bếp Nhật Thép Damascus 67 Lớp Cao Cấp (5 Món)',
    slug: 'bo-dao-bep-nhat-thep-damascus-67-lop-5-mon',
    description: 'Tuyệt tác dao bếp Nhật Bản rèn từ 67 lớp thép Damascus hoa văn sóng nước tinh xảo. Lưỡi dao sắc bén đạt độ cứng HRC 60±2, cán gỗ nhựa Pakka nguyên khối cầm đầm tay chống mỏi khi thái lọc.',
    price: 1650000,
    sale_price: 1450000,
    image_url: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=800&q=80'],
    product_type: 'equipment',
    specs: { 'Chất liệu lõi': 'Thép VG-10', 'Số lớp': '67 lớp Damascus', 'Bao gồm': 'Dao Chef, Santoku, gọt, cắt bánh mì, dao lọc' },
    stock: 14,
    unit: 'bộ',
    is_available: true,
    is_featured: true,
    rating: 5.0,
    total_reviews: 58,
    total_sold: 160,
    recipe_id: null,
    status: 'approved',
    created_at: '2026-03-03T10:00:00Z',
    seller_name: 'KitchenCook Flagship Store',
    seller_avatar: '/assets/images/avatar1.jpg',
    store_name: 'KitchenCook Store',
    category_name: 'Dao & Thớt',
    category_slug: 'dao-thot',
  },
  {
    id: 104,
    seller_id: 1,
    category_id: 7,
    name: 'Thớt Gỗ Teak Tự Nhiên Kháng Khuẩn Xuất Khẩu (Size L)',
    slug: 'thot-go-teak-tu-nhien-khang-khuan-size-l',
    description: 'Thớt gỗ Teak nhập khẩu giàu tinh dầu tự nhiên chống ẩm mốc, hạn chế tối đa để lại vết cắt sâu. Rãnh chống tràn thông minh giữ nước thịt cá không chảy bẩn mặt bàn.',
    price: 450000,
    sale_price: 380000,
    image_url: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=800&q=80'],
    product_type: 'equipment',
    specs: { 'Chất liệu': 'Gỗ Teak già tự nhiên', 'Kích thước': '38 x 28 x 2.5 cm', 'Trọng lượng': '1.8 kg' },
    stock: 40,
    unit: 'cái',
    is_available: true,
    is_featured: false,
    rating: 4.7,
    total_reviews: 26,
    total_sold: 210,
    recipe_id: null,
    status: 'approved',
    created_at: '2026-03-04T10:00:00Z',
    seller_name: 'KitchenCook Flagship Store',
    seller_avatar: '/assets/images/avatar1.jpg',
    store_name: 'KitchenCook Store',
    category_name: 'Dao & Thớt',
    category_slug: 'dao-thot',
  },
  {
    id: 105,
    seller_id: 1,
    category_id: 8,
    name: 'Nồi Chiên Không Dầu Điện Tử Philips Rapid Air 4.1L',
    slug: 'noi-chien-khong-dau-dien-tu-philips-rapid-air-4-1l',
    description: 'Công nghệ Rapid Air lốc xoáy độc quyền giúp thực phẩm chín đều ngoài giòn rụm trong mọng nước, giảm tới 90% lượng dầu mỡ thừa. Bảng điều khiển cảm ứng 7 chương trình cài sẵn.',
    price: 2890000,
    sale_price: 2390000,
    image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'],
    product_type: 'equipment',
    specs: { 'Công suất': '1400W', 'Dung tích lòng nồi': '4.1 Lít (0.8kg khoai tây)', 'Nhiệt độ': '80 - 200°C' },
    stock: 12,
    unit: 'cái',
    is_available: true,
    is_featured: true,
    rating: 4.9,
    total_reviews: 64,
    total_sold: 185,
    recipe_id: null,
    status: 'approved',
    created_at: '2026-03-05T10:00:00Z',
    seller_name: 'KitchenCook Flagship Store',
    seller_avatar: '/assets/images/avatar1.jpg',
    store_name: 'KitchenCook Store',
    category_name: 'Máy xay & Máy ép',
    category_slug: 'may-xay-ep',
  },
  {
    id: 106,
    seller_id: 1,
    category_id: 8,
    name: 'Máy Xay Cầm Tay Đa Năng Braun Multiquick 9 Công Suất 1200W',
    slug: 'may-xay-cam-tay-da-nang-braun-multiquick-9-1200w',
    description: 'Dòng máy xay cầm tay hàng đầu thế giới từ Đức. Lưỡi dao ActiveBlade chuyển động lên xuống thông minh, xay nhuyễn súp nóng, sinh tố, đánh trứng và xay thịt tiện lợi.',
    price: 2450000,
    sale_price: 2190000,
    image_url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80'],
    product_type: 'equipment',
    specs: { 'Công suất': '1200W', 'Công nghệ': 'ActiveBlade Đức', 'Phụ kiện': 'Cối xay thịt 500ml, que đánh trứng, cốc đong' },
    stock: 15,
    unit: 'bộ',
    is_available: true,
    is_featured: false,
    rating: 4.9,
    total_reviews: 31,
    total_sold: 88,
    recipe_id: null,
    status: 'approved',
    created_at: '2026-03-06T10:00:00Z',
    seller_name: 'KitchenCook Flagship Store',
    seller_avatar: '/assets/images/avatar1.jpg',
    store_name: 'KitchenCook Store',
    category_name: 'Máy xay & Máy ép',
    category_slug: 'may-xay-ep',
  },
  {
    id: 107,
    seller_id: 1,
    category_id: 9,
    name: 'Bộ Hộp Thủy Tinh Chịu Nhiệt Lock&Lock Borosilicate (4 Hộp)',
    slug: 'bo-hop-thuy-tinh-chiu-nhiet-lock-lock-borosilicate-4-hop',
    description: 'Bộ hộp bảo quản thực phẩm bằng thủy tinh Borosilicate chịu nhiệt lên đến 400°C, an toàn dùng trong lò nướng và lò vi sóng. Nắp khóa 4 cạnh kín khí chống bay mùi tủ lạnh.',
    price: 520000,
    sale_price: 420000,
    image_url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80'],
    product_type: 'equipment',
    specs: { 'Chất liệu': 'Thủy tinh chịu nhiệt Borosilicate', 'Dung tích': '380ml, 630ml, 1000ml, 1500ml', 'Chịu nhiệt': '-20°C đến 400°C' },
    stock: 50,
    unit: 'bộ',
    is_available: true,
    is_featured: false,
    rating: 4.8,
    total_reviews: 39,
    total_sold: 340,
    recipe_id: null,
    status: 'approved',
    created_at: '2026-03-07T10:00:00Z',
    seller_name: 'KitchenCook Flagship Store',
    seller_avatar: '/assets/images/avatar1.jpg',
    store_name: 'KitchenCook Store',
    category_name: 'Phụ kiện nhà bếp',
    category_slug: 'phu-kien-bep',
  },
  {
    id: 108,
    seller_id: 1,
    category_id: 9,
    name: 'Cân Điện Tử Nhà Bếp Độ Chính Xác 0.1g Định Lượng Gia Vị',
    slug: 'can-dien-tu-nha-bep-chinh-xac-0-1g',
    description: 'Trợ thủ đắc lực làm bánh và nấu ăn chuẩn công thức. Mặt inox 304 xước mờ sang trọng, màn hình LCD LED xanh sắc nét, chức năng trừ bì Tare tiện lợi.',
    price: 220000,
    sale_price: 180000,
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'],
    product_type: 'equipment',
    specs: { 'Độ chia nhỏ nhất': '0.1g', 'Tải trọng tối đa': '5 kg', 'Nguồn điện': '2 Pin AAA đi kèm' },
    stock: 65,
    unit: 'cái',
    is_available: true,
    is_featured: false,
    rating: 4.6,
    total_reviews: 18,
    total_sold: 410,
    recipe_id: null,
    status: 'approved',
    created_at: '2026-03-08T10:00:00Z',
    seller_name: 'KitchenCook Flagship Store',
    seller_avatar: '/assets/images/avatar1.jpg',
    store_name: 'KitchenCook Store',
    category_name: 'Phụ kiện nhà bếp',
    category_slug: 'phu-kien-bep',
  },
];

export const DEMO_RECIPES = [
  {
    id: 1,
    title: 'Phở Bò Tái Lăn Hà Nội Truyền Thống',
    description: 'Bát phở thơm nức mùi gừng nướng, hoa hồi và thảo quả. Thịt bò tái xào lăn trên chảo lửa lớn thơm nồng, nước dùng trong vắt ngọt thanh từ xương ống hầm kỹ 8 tiếng.',
    cooking_time: 45,
    servings: 4,
    difficulty: 'Trung bình',
    category_id: 1,
    category_name: 'Món chính',
    image_url: '/assets/images/phobo.jpg',
    is_featured: true,
    calories: 485,
    protein: 32,
    carbs: 58,
    fat: 14,
    views: 1420,
    status: 'approved',
    author_name: 'Chef Hoàng Minh',
    author_avatar: '/assets/images/chef1.jpg',
    ingredients: 'Bánh phở tươi 500g, Thịt thăn bò 300g, Xương ống bò 1kg, Hành tây, Gừng nướng, Hành hoa, Rau mùi, Hồi, Quế, Thảo quả',
    instructions: '1. Hầm xương bò cùng gừng nướng và thảo mộc trong 6-8 tiếng lấy nước dùng trong ngọt.\n2. Thịt bò thái mỏng, ướp tỏi gừng và tiêu.\n3. Phi thơm tỏi trên chảo lửa to, cho thịt bò vào đảo nhanh tay 1 phút rồi trút ra.\n4. Chần bánh phở, xếp thịt bò và hành hoa lên trên, chan nước dùng sôi sùng sục và thưởng thức.',
  },
  {
    id: 2,
    title: 'Bò Sốt Tiêu Đen Kèm Bánh Mì Nóng Giòn',
    description: 'Thịt bò mềm mọng quyện sốt tiêu đen thơm cay ấm bụng, ớt chuông giòn ngọt chuẩn vị nhà hàng, chấm cùng bánh mì nướng giòn rụm.',
    cooking_time: 30,
    servings: 3,
    difficulty: 'Dễ',
    category_id: 1,
    category_name: 'Món chính',
    image_url: '/assets/images/monchinh.jpg',
    is_featured: true,
    calories: 520,
    protein: 36,
    carbs: 45,
    fat: 18,
    views: 980,
    status: 'approved',
    author_name: 'Bếp Trưởng Tuấn Anh',
    author_avatar: '/assets/images/chef2.jpg',
    ingredients: 'Thịt bò mềm 400g, Tiêu đen giã dập 20g, Ớt chuông xanh đỏ 2 quả, Hành tây 1 củ, Dầu hào, Xì dầu, Bơ lạt 20g',
    instructions: '1. Thịt bò cắt khối vuông vừa ăn, ướp dầu hào và 1 nửa tiêu đen trong 15 phút.\n2. Cắt ớt chuông và hành tây thành miếng vuông.\n3. Làm nóng chảo gang, cho bơ lạt vào xào săn thịt bò, cho rau củ và sốt tiêu vào đảo đều trong 3 phút rồi dọn ra đĩa nóng.',
  },
  {
    id: 3,
    title: 'Cá Hồi Áp Chảo Sốt Bơ Chanh Măng Tây',
    description: 'Miếng cá hồi Na Uy da giòn rụm, thịt bên trong mềm ngọt béo ngậy kết hợp hoàn hảo cùng sốt bơ chanh vàng thơm dịu và măng tây xào bơ tỏi.',
    cooking_time: 20,
    servings: 2,
    difficulty: 'Dễ',
    category_id: 1,
    category_name: 'Món chính',
    image_url: '/assets/images/vietnam1.jpg',
    is_featured: true,
    calories: 410,
    protein: 34,
    carbs: 12,
    fat: 26,
    views: 890,
    status: 'approved',
    author_name: 'Chef Jenny Lê',
    author_avatar: '/assets/images/chef3.jpg',
    ingredients: 'File cá hồi Na Uy 300g, Bơ lạt 30g, Chanh vàng 1 quả, Măng tây tươi 200g, Tỏi băm, Muối hồng, Tiêu xay',
    instructions: '1. Thấm khô cá hồi, rắc chút muối tiêu lên hai mặt.\n2. Đặt chảo gang lên bếp, áp chảo mặt da 3 phút cho giòn rụm rồi lật mặt thịt áp thêm 2 phút.\n3. Nấu tan bơ, vắt nước chanh và chút muối làm sốt bơ chanh rưới lên cá khi thưởng thức.',
  },
  {
    id: 4,
    title: 'Salad Ức Gà Xé Sốt Mè Rang Giảm Cân',
    description: 'Món salad thanh mát giàu đạm tự nhiên, xà lách giòn mát, cà chua bi, trứng luộc lòng đào và sốt mè rang béo bùi dành cho tín đồ Eat Clean & Gym.',
    cooking_time: 15,
    servings: 2,
    difficulty: 'Rất dễ',
    category_id: 2,
    category_name: 'Nhanh & Gọn',
    image_url: '/assets/images/nguyenlieutuoi.jpg',
    is_featured: true,
    calories: 285,
    protein: 38,
    carbs: 14,
    fat: 9,
    views: 1650,
    status: 'approved',
    author_name: 'HLV Dinh Dưỡng Mai Anh',
    author_avatar: '/assets/images/chef4.jpg',
    ingredients: 'Ức gà tươi 250g, Xà lách Romaine, Cà chua bi 100g, Dưa leo 1 quả, Trứng gà 2 quả, Sốt mè rang Kewpie 30ml',
    instructions: '1. Luộc chín ức gà với chút gừng, vớt ra xé sợi vừa ăn.\n2. Trứng gà luộc 6 phút lòng đào bóc vỏ cắt đôi.\n3. Rửa sạch rau củ, bày ra đĩa lớn, xếp ức gà và trứng lên trên, rưới sốt mè rang trước khi dùng.',
  },
  {
    id: 5,
    title: 'Bánh Mì Kẹp Thịt Nướng Giòn Rụm Sài Gòn',
    description: 'Ổ bánh mì vỏ giòn tan, nhân pate béo ngậy, thịt nướng thơm lừng mùi sả ớt, đồ chua cà rốt củ cải giòn ngọt và ngò rí đậm chất ẩm thực đường phố Việt Nam.',
    cooking_time: 25,
    servings: 3,
    difficulty: 'Dễ',
    category_id: 2,
    category_name: 'Nhanh & Gọn',
    image_url: '/assets/images/banhmi.jpg',
    is_featured: true,
    calories: 460,
    protein: 24,
    carbs: 52,
    fat: 16,
    views: 1150,
    status: 'approved',
    author_name: 'Chef Hoàng Minh',
    author_avatar: '/assets/images/chef1.jpg',
    ingredients: 'Bánh mì 3 ổ, Thịt nạc vai nướng sả 300g, Pate gan 100g, Đồ chua, Dưa leo, Ớt hiểm, Nước tương',
    instructions: '1. Nướng nóng giòn vỏ bánh mì.\n2. Rạch thân bánh, phết đều pate và sốt bơ trứng.\n3. Kẹp thịt nướng, dưa leo, đồ chua và rắc ngò rí cùng vài lát ớt tươi.',
  },
  {
    id: 6,
    title: 'Chè Hạt Sen Long Nhãn Thanh Nhiệt',
    description: 'Món tráng miệng cung đình thanh nhã, hạt sen bùi béo bọc trong từng múi long nhãn mọng nước nấu cùng đường phèn thanh mát.',
    cooking_time: 40,
    servings: 4,
    difficulty: 'Trung bình',
    category_id: 4,
    category_name: 'Tráng miệng',
    image_url: '/assets/images/che.jpg',
    is_featured: true,
    calories: 220,
    protein: 6,
    carbs: 48,
    fat: 2,
    views: 780,
    status: 'approved',
    author_name: 'Bếp Trưởng Tuấn Anh',
    author_avatar: '/assets/images/chef2.jpg',
    ingredients: 'Hạt sen tươi 200g, Long nhãn tươi hoặc khô 150g, Đường phèn 120g, Lá dứa 2 nhánh',
    instructions: '1. Hạt sen hấp chín mềm bùi.\n2. Lồng từng hạt sen vào trong múi long nhãn.\n3. Nấu nước đường phèn với lá dứa cho thơm, thả long nhãn bọc sen vào đun sôi nhẹ 2 phút rồi tắt bếp, dùng lạnh.',
  },
];

export const DEMO_BLOGS = [
  {
    id: 1,
    title: 'Bí Quyết Chọn Và Tôi Chảo Gang Đúng Cách Giữ Độ Bền Trăm Năm',
    slug: 'bi-quyet-chon-va-toi-chao-gang-dung-cach',
    excerpt: 'Hướng dẫn chi tiết từ chuyên gia đồ bếp giúp bạn tạo lớp chống dính tự nhiên hoàn hảo cho chảo gang mà không cần hóa chất.',
    content: '<p>Chảo gang là biểu tượng của căn bếp chuyên nghiệp. Nhờ khả năng giữ nhiệt vô song và độ bền vĩnh cửu, chảo gang có thể đồng hành cùng gia đình qua nhiều thế hệ nếu được tôi dầu (seasoning) đúng chuẩn...</p>',
    image_url: '/assets/images/meonauan.jpg',
    category_name: 'Mẹo Vặt Nhà Bếp',
    created_at: '2026-03-01T08:00:00Z',
    author_name: 'Admin KitchenCook',
    views: 2450,
  },
  {
    id: 2,
    title: 'Nghệ Thuật Bảo Quản Thực Phẩm Tươi Sống Trong Tủ Lạnh Gia Đình',
    slug: 'nghe-thuat-bao-quan-thuc-pham-tuoi-song',
    excerpt: 'Phân loại nhiệt độ ngăn mát, ngăn đông và mẹo hút chân không giúp thực phẩm luôn tươi ngon, nguyên vẹn vitamin.',
    content: '<p>Nhiệt độ tủ lạnh đóng vai trò quyết định đến độ tươi của nguyên liệu. Hãy cùng tìm hiểu nguyên lý sắp xếp thực phẩm thông minh...</p>',
    image_url: '/assets/images/baoquan.jpg',
    category_name: 'Kiến Thức Dinh Dưỡng',
    created_at: '2026-03-03T08:00:00Z',
    author_name: 'Chef Hoàng Minh',
    views: 1820,
  },
];

export const DEMO_ADMIN_ORDERS: Order[] = [];

export const DEMO_ADMIN_DASHBOARD = {
  revenue: 0,
  orders: 0,
  pendingOrders: 0,
  totalUsers: 0,
  totalProducts: DEMO_PRODUCTS.length,
  totalRecipes: 0,
  pendingRecipes: 0,
  pendingBlogs: 0,
  recentOrders: [] as Order[],
  topProducts: DEMO_PRODUCTS.slice(0, 5).map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    total_sold: 0,
    image_url: p.image_url || '',
  })),
};

/** LocalStorage Cart persistence for demo interaction on Vercel */
function getLocalDemoCart(): CartItem[] {
  try {
    const raw = localStorage.getItem('demo_cart_items');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDemoCart(items: CartItem[]) {
  try {
    localStorage.setItem('demo_cart_items', JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Intercept and resolve demo fallback data when running on Vercel or when backend is unreachable
 */
export function handleDemoFallback<T>(path: string, init: RequestInit = {}): T | undefined {
  const method = (init.method || 'GET').toUpperCase();

  // 1. Marketplace Products List, Filter & Search
  if (path.startsWith('/api/marketplace/products')) {
    if (path.includes('/products/featured')) {
      return DEMO_PRODUCTS.slice(0, 6) as unknown as T;
    }
    const matchDetail = path.match(/\/products\/([a-zA-Z0-9_-]+)/);
    if (matchDetail && !path.includes('?')) {
      const slugOrId = matchDetail[1];
      const prod = DEMO_PRODUCTS.find(p => p.id === Number(slugOrId) || p.slug === slugOrId) || DEMO_PRODUCTS[0];
      return { success: true, product: prod } as unknown as T;
    }

    // Filter & Sort for shop listing
    let filtered = [...DEMO_PRODUCTS];
    try {
      const url = new URL(path, 'http://localhost');
      const q = url.searchParams.get('q') || url.searchParams.get('search');
      const cat = url.searchParams.get('category');
      const sort = url.searchParams.get('sort');

      if (q) {
        const queryLower = q.toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(queryLower) || 
          Boolean(p.description && p.description.toLowerCase().includes(queryLower))
        );
      }
      if (cat) {
        filtered = filtered.filter(p => p.category_slug === cat);
      }
      if (sort === 'popular') {
        filtered.sort((a, b) => b.total_sold - a.total_sold);
      } else if (sort === 'price_asc') {
        filtered.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
      } else if (sort === 'price_desc') {
        filtered.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));
      }
    } catch {
      // fallback to unparsed
    }

    return {
      success: true,
      products: filtered,
      total: filtered.length,
      limit: 20,
      offset: 0,
    } as unknown as T;
  }

  // 2. Marketplace Categories & Shipping
  if (path.startsWith('/api/marketplace/categories')) {
    return {
      success: true,
      categories: DEMO_PRODUCT_CATEGORIES,
    } as unknown as T;
  }

  if (path.startsWith('/api/marketplace/shipping/ghn/fee')) {
    return {
      success: true,
      data: { total: 29000 },
    } as unknown as T;
  }

  // 3. Recipes (Featured & Search)
  if (path.startsWith('/api/recipes/featured')) {
    return {
      recipes: DEMO_RECIPES,
    } as unknown as T;
  }
  if (path.startsWith('/api/recipes/search')) {
    return {
      recipes: DEMO_RECIPES,
      total: DEMO_RECIPES.length,
    } as unknown as T;
  }
  if (path.startsWith('/api/recipes/categories')) {
    return {
      categories: [
        { id: 1, name: 'Món chính', slug: 'mon-chinh' },
        { id: 2, name: 'Nhanh & Gọn', slug: 'nhanh-gon' },
        { id: 3, name: 'Món chay', slug: 'mon-chay' },
        { id: 4, name: 'Tráng miệng', slug: 'trang-mieng' },
      ],
    } as unknown as T;
  }
  if (path.includes('/api/recipes/')) {
    const matchId = path.match(/\/recipes\/(\d+)/);
    const id = matchId ? Number(matchId[1]) : 1;
    const r = DEMO_RECIPES.find(item => item.id === id) || DEMO_RECIPES[0];
    return { recipe: r } as unknown as T;
  }

  // 4. Blog Posts
  if (path.startsWith('/api/blog/categories')) {
    return {
      categories: [
        { id: 1, name: 'Mẹo Vặt', slug: 'meo-vat' },
        { id: 2, name: 'Dinh Dưỡng', slug: 'dinh-duong' },
        { id: 3, name: 'Bếp & Đời Sống', slug: 'bep-va-doi-song' },
      ],
    } as unknown as T;
  }
  if (path.startsWith('/api/blog')) {
    return {
      blogs: DEMO_BLOGS,
      posts: DEMO_BLOGS,
      total: DEMO_BLOGS.length,
    } as unknown as T;
  }

  // 5. Cart Management (Interactive in Demo Mode!)
  if (path === '/api/marketplace/cart' || path.startsWith('/api/marketplace/cart/')) {
    const currentCart = getLocalDemoCart();
    if (method === 'GET') {
      const total = currentCart.reduce((sum, item) => sum + (item.product_sale_price ?? item.product_price) * item.quantity, 0);
      return {
        success: true,
        items: currentCart,
        count: currentCart.reduce((s, i) => s + i.quantity, 0),
        total,
      } as unknown as T;
    }

    if (method === 'POST') {
      let body: any = {};
      try { body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body; } catch {}
      const pId = Number(body?.product_id || 101);
      const qty = Number(body?.quantity || 1);
      const product = DEMO_PRODUCTS.find(p => p.id === pId) || DEMO_PRODUCTS[0];

      const existIdx = currentCart.findIndex(i => i.product_id === pId);
      if (existIdx >= 0) {
        currentCart[existIdx].quantity += qty;
      } else {
        currentCart.push({
          id: Date.now(),
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          product_price: product.price,
          product_sale_price: product.sale_price,
          product_stock: product.stock,
          product_unit: product.unit,
          quantity: qty,
          seller_id: product.seller_id,
          store_name: product.store_name,
        });
      }
      saveLocalDemoCart(currentCart);
      return { success: true, cart_id: Date.now() } as unknown as T;
    }

    if (method === 'DELETE') {
      if (path === '/api/marketplace/cart') {
        saveLocalDemoCart([]);
      } else {
        const idMatch = path.match(/\/cart\/(\d+)/);
        const itemId = idMatch ? Number(idMatch[1]) : 0;
        const filtered = currentCart.filter(i => i.id !== itemId && i.product_id !== itemId);
        saveLocalDemoCart(filtered);
      }
      return { success: true } as unknown as T;
    }
  }

  // 6. Orders Creation, Listing, Detail & Tracking (Interactive Demo Checkout!)
  if (path.startsWith('/api/marketplace/orders')) {
    // 6a. Create order (POST)
    if (method === 'POST') {
      let body: any = {};
      try { body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body; } catch {}
      const orderId = 1000 + Math.floor(Math.random() * 9000);
      const randomCode = `CAM-${Math.floor(100000 + Math.random() * 900000)}`;
      const cartItems = getLocalDemoCart();
      const demoOrder: Order = {
        id: orderId,
        order_code: randomCode,
        buyer_id: 1,
        total_amount: cartItems.reduce((s, i) => s + (i.product_sale_price ?? i.product_price) * i.quantity, 0) || 1250000,
        status: 'pending',
        shipping_name: body?.shipping_name || 'Khách Hàng Tuyển Dụng Demo',
        shipping_phone: body?.shipping_phone || '0901234567',
        shipping_address: body?.shipping_address || 'Tòa Landmark 81, TP.HCM',
        payment_method: body?.payment_method || 'bank_transfer',
        payment_status: 'unpaid',
        note: null,
        shipping_partner: 'GHN Express',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: cartItems.length > 0 ? cartItems.map(c => ({
          id: c.id,
          order_id: orderId,
          product_id: c.product_id,
          product_name: c.product_name,
          product_image: c.product_image,
          quantity: c.quantity,
          unit_price: c.product_sale_price ?? c.product_price,
          subtotal: (c.product_sale_price ?? c.product_price) * c.quantity,
          seller_id: c.seller_id,
        })) : [
          {
            id: 1,
            order_id: orderId,
            product_id: DEMO_PRODUCTS[0].id,
            product_name: DEMO_PRODUCTS[0].name,
            product_image: DEMO_PRODUCTS[0].image_url,
            quantity: 1,
            unit_price: DEMO_PRODUCTS[0].sale_price || DEMO_PRODUCTS[0].price,
            subtotal: DEMO_PRODUCTS[0].sale_price || DEMO_PRODUCTS[0].price,
            seller_id: DEMO_PRODUCTS[0].seller_id,
          }
        ],
      };
      // Save newly created order to localStorage for session persistence
      try {
        localStorage.setItem(`demo_order_${orderId}`, JSON.stringify(demoOrder));
        const listRaw = localStorage.getItem('demo_user_order_ids') || '[]';
        const list = JSON.parse(listRaw);
        list.unshift(orderId);
        localStorage.setItem('demo_user_order_ids', JSON.stringify(list));
      } catch {}

      saveLocalDemoCart([]); // Clear cart
      return { success: true, order_id: orderId, order: demoOrder } as unknown as T;
    }

    // 6b. Transit logs tracking
    if (path.includes('/transit-logs')) {
      return {
        status: 'in_transit',
        carrier_name: 'Giao Hàng Nhanh (GHN Express)',
        tracking_number: 'GHN-88392109VN',
        estimated_delivery_at: new Date(Date.now() + 86400000 * 2).toISOString(),
        actual_delivery_at: null,
        delay_resolution: '',
        is_delayed: false,
        eligible: true,
        logs: [
          {
            id: '1',
            status: 'confirmed',
            current_location: 'Tổng kho KitchenCook Quận 7, TP.HCM',
            description: 'Đơn hàng đã được xác nhận và đóng gói cẩn thận',
            created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          },
          {
            id: '2',
            status: 'in_transit',
            current_location: 'Bưu cục trung chuyển GHN Tân Bình',
            description: 'Kiện hàng đang trên đường vận chuyển tới người nhận',
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
      } as unknown as T;
    }

    // 6c. Cancel or complete order
    if (path.includes('/cancel') || path.includes('/complete')) {
      return { success: true } as unknown as T;
    }

    // 6d. Order Detail
    const matchId = path.match(/\/api\/marketplace\/orders\/(\d+)/);
    if (matchId) {
      const oId = Number(matchId[1]);
      let orderObj: Order | undefined;
      try {
        const saved = localStorage.getItem(`demo_order_${oId}`);
        if (saved) orderObj = JSON.parse(saved);
      } catch {}
      if (!orderObj) {
        orderObj = DEMO_ADMIN_ORDERS.find(o => o.id === oId) || DEMO_ADMIN_ORDERS[0];
      }
      return { order: orderObj, success: true } as unknown as T;
    }

    // 6e. Orders list (GET /api/marketplace/orders)
    let userOrders: Order[] = [];
    try {
      const listRaw = localStorage.getItem('demo_user_order_ids') || '[]';
      const list: number[] = JSON.parse(listRaw);
      for (const id of list) {
        const saved = localStorage.getItem(`demo_order_${id}`);
        if (saved) userOrders.push(JSON.parse(saved));
      }
    } catch {}
    return {
      orders: userOrders,
      total: userOrders.length,
    } as unknown as T;
  }

  // Reviews
  if (path.startsWith('/api/marketplace/reviews')) {
    return { success: true, reviews: [] } as unknown as T;
  }

  // 7. Admin Portal Demo Data
  if (path === '/api/admin/me') {
    const isDemoAdmin = localStorage.getItem('demo_admin_logged_in') === 'true';
    return {
      authenticated: isDemoAdmin,
      admin: isDemoAdmin ? { id: 1, email: 'admin@cook.local', full_name: 'Quản trị viên CookingWeb' } : undefined,
    } as unknown as T;
  }

  if (path === '/api/admin/login') {
    let body: any = {};
    try { body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body; } catch {}
    const email = String(body?.email || '').trim().toLowerCase();
    const pass = String(body?.password || '');
    if (email === 'admin@cook.local' && (pass === '123456678' || pass === '12345678')) {
      localStorage.setItem('demo_admin_logged_in', 'true');
      return {
        success: true,
        message: 'Đăng nhập thành công',
        admin: { id: 1, email: 'admin@cook.local', full_name: 'Quản trị viên CookingWeb' },
      } as unknown as T;
    }
    return undefined;
  }

  if (path === '/api/admin/logout') {
    localStorage.removeItem('demo_admin_logged_in');
    return { success: true } as unknown as T;
  }

  if (path === '/api/admin/dashboard') {
    let sessionOrders: Order[] = [];
    try {
      const listRaw = localStorage.getItem('demo_user_order_ids') || '[]';
      const list: number[] = JSON.parse(listRaw);
      for (const id of list) {
        const saved = localStorage.getItem(`demo_order_${id}`);
        if (saved) sessionOrders.push(JSON.parse(saved));
      }
    } catch {}
    const rev = sessionOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    return {
      revenue: rev,
      orders: sessionOrders.length,
      pendingOrders: sessionOrders.filter(o => o.status === 'pending').length,
      totalUsers: 0,
      totalProducts: DEMO_PRODUCTS.length,
      totalRecipes: 0,
      pendingRecipes: 0,
      pendingBlogs: 0,
      recentOrders: sessionOrders,
      topProducts: [],
    } as unknown as T;
  }

  if (path.startsWith('/api/admin/categories')) {
    return {
      categories: DEMO_PRODUCT_CATEGORIES,
      success: true,
    } as unknown as T;
  }

  if (path === '/api/admin/marketplace/stats') {
    let sessionOrders: Order[] = [];
    try {
      const listRaw = localStorage.getItem('demo_user_order_ids') || '[]';
      const list: number[] = JSON.parse(listRaw);
      for (const id of list) {
        const saved = localStorage.getItem(`demo_order_${id}`);
        if (saved) sessionOrders.push(JSON.parse(saved));
      }
    } catch {}
    const rev = sessionOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    return {
      totalProducts: DEMO_PRODUCTS.length,
      totalOrders: sessionOrders.length,
      totalRevenue: rev,
      totalReviews: 0,
    } as unknown as T;
  }

  if (path === '/api/admin/marketplace/orders') {
    let sessionOrders: Order[] = [];
    try {
      const listRaw = localStorage.getItem('demo_user_order_ids') || '[]';
      const list: number[] = JSON.parse(listRaw);
      for (const id of list) {
        const saved = localStorage.getItem(`demo_order_${id}`);
        if (saved) sessionOrders.push(JSON.parse(saved));
      }
    } catch {}
    return {
      orders: sessionOrders,
      total: sessionOrders.length,
      limit: 20,
      offset: 0,
    } as unknown as T;
  }

  if (path.startsWith('/api/admin/marketplace/orders/')) {
    return { success: true, tracking_code: 'GHN88392109' } as unknown as T;
  }

  if (path === '/api/admin/marketplace/products') {
    return {
      products: DEMO_PRODUCTS,
      total: DEMO_PRODUCTS.length,
      limit: 20,
      offset: 0,
    } as unknown as T;
  }

  if (path.startsWith('/api/admin/recipes')) {
    return {
      recipes: [],
      total: 0,
    } as unknown as T;
  }

  if (path.startsWith('/api/admin/blogs')) {
    return {
      blogs: [],
      total: 0,
    } as unknown as T;
  }

  if (path.startsWith('/api/admin/users')) {
    return {
      users: [],
      total: 0,
    } as unknown as T;
  }

  if (path.startsWith('/api/admin/comments')) {
    return {
      comments: [],
      total: 0,
    } as unknown as T;
  }

  if (path.startsWith('/api/admin/feedback')) {
    return {
      feedback: [],
      total: 0,
    } as unknown as T;
  }

  // 8. Auth CSRF & Profile
  if (path === '/api/auth/csrf') {
    return { csrfToken: 'demo-csrf-token-vercel' } as unknown as T;
  }

  if (path === '/api/auth/login') {
    return undefined;
  }

  if (path === '/api/auth/logout') {
    localStorage.removeItem('demo_user_logged_in');
    localStorage.removeItem('demo_admin_logged_in');
    return { success: true } as unknown as T;
  }

  if (path === '/api/auth/me') {
    return { authenticated: false } as unknown as T;
  }

  return undefined;
}
