import { ChefHat, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white text-gray-600 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-black p-2 rounded-full"><ChefHat className="h-6 w-6 text-white" /></div>
              <span className="text-xl font-bold text-gray-900">CookingBoy</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">Khám phá thế giới ẩm thực với những công thức nấu ăn đa dạng, từ món truyền thống đến hiện đại, giúp bạn tạo ra những bữa ăn ngon miệng.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li><Link to="/recipes" className="hover:text-yellow-600 transition-colors duration-300">Công thức</Link></li>
              <li><Link to="/blog" className="hover:text-yellow-600 transition-colors duration-300">Diễn đàn</Link></li>
              <li><Link to="/health" className="hover:text-yellow-600 transition-colors duration-300">Sức khỏe</Link></li>
              <li><Link to="/about" className="hover:text-yellow-600 transition-colors duration-300">Về chúng tôi</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Danh mục</h3>
            <ul className="space-y-2">
              <li><Link to="/recipes?category=Món khai vị" className="hover:text-yellow-600 transition-colors duration-300">Món khai vị</Link></li>
              <li><Link to="/recipes?category=Món chính" className="hover:text-yellow-600 transition-colors duration-300">Món chính</Link></li>
              <li><Link to="/recipes?category=Tráng miệng" className="hover:text-yellow-600 transition-colors duration-300">Tráng miệng</Link></li>
              <li><Link to="/recipes?category=Đồ uống" className="hover:text-yellow-600 transition-colors duration-300">Đồ uống</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Liên hệ</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3"><Mail className="h-4 w-4 text-gray-400"/><span className="text-sm">Cookingboy@gmail.com</span></div>
              <div className="flex items-center space-x-3"><Phone className="h-4 w-4 text-gray-400"/><span className="text-sm">+84 123 456 789</span></div>
              <div className="flex items-center space-x-3"><MapPin className="h-4 w-4 text-gray-400"/><span className="text-sm">Hà Nội, Việt Nam</span></div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} CookingWeb</p>
        </div>
      </div>
    </footer>
  );
}
