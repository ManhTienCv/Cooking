import { ChefHat, ShieldCheck, Truck, RefreshCw, Award, Mail, Phone, MapPin } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function KitchenCookFooter() {
  const location = useLocation();
  const isHomeOrProducts = location.pathname === '/shop' || location.pathname === '/shop/products';

  return (
    <footer className="w-full bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-slate-800 transition-colors duration-300 font-vietnam">
      {/* 1. Thanh 4 Giá Trị Cam Kết - Chỉ hiển thị tại Trang Chủ (/shop) và Trang Sản Phẩm (/shop/products) */}
      {isHomeOrProducts && (
        <div className="border-b border-gray-200/80 dark:border-slate-800 bg-[#FBF9F5] dark:bg-slate-900/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-white shadow-xs shrink-0">
                  <ShieldCheck className="w-6 h-6 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white text-sm font-bold">100% Chính Hãng</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Đạt chuẩn chất lượng an toàn</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white text-sm font-bold">Giao Hàng GHN Express</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Đóng gói chuẩn, giao toàn quốc</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs shrink-0">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white text-sm font-bold">Đổi Trả 7 Ngày</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">1 đổi 1 nếu lỗi sản xuất</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white text-sm font-bold">Bảo Hành 2 Tháng</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bảo hành chính hãng uy tín</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Nội dung chính Footer 4 cột chuẩn theo mẫu CookingBoy (Ảnh 1) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Cột 1: Thương hiệu KitchenCook */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-black dark:bg-white p-2 rounded-full">
                <ChefHat className="h-6 w-6 text-white dark:text-black" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">KitchenCook</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Dụng cụ nhà bếp và thiết bị gia dụng cao cấp, đồng hành cùng cảm hứng nấu nướng và bữa cơm gia đình mỗi ngày.
            </p>
          </div>

          {/* Cột 2: Liên kết nhanh */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Liên kết nhanh</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/shop" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-300">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/shop/products" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-300">
                  Sản phẩm
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-300">
                  Giỏ hàng
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-300">
                  Đơn hàng
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Danh mục */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Danh mục</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/shop/products?category=noi-chao" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-300">
                  Nồi & Chảo gang
                </Link>
              </li>
              <li>
                <Link to="/shop/products?category=dao-keo" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-300">
                  Bộ dao làm bếp
                </Link>
              </li>
              <li>
                <Link to="/shop/products?category=phu-kien" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-300">
                  Dụng cụ & Phụ kiện
                </Link>
              </li>
              <li>
                <Link to="/shop/products?sort=popular" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-300">
                  Bán chạy nhất
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 4: Liên hệ */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Liên hệ</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <span>support@kitchencook.vn</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <span>1900 8888 (8h - 21h)</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <span>Hà Nội, Việt Nam</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Dòng bản quyền chuẩn theo ảnh 1 */}
        <div className="border-t border-gray-200 dark:border-slate-800 mt-8 pt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} KitchenCook
          </p>
        </div>
      </div>
    </footer>
  );
}
