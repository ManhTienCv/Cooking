import { Link } from 'react-router-dom';
import { ChefHat, BookOpen, ArrowRight } from 'lucide-react';

/**
 * Banner hiển thị tại Cửa hàng KitchenCook -> Gợi ý khách ghé thăm Trang Công Thức ẩm thực
 */
export function KitchenToRecipeBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/90 border border-stone-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs font-vietnam">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-2xl shrink-0 shadow-md">
            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Vừa sắm đồ bếp xịn nhưng chưa biết tối nay nấu món gì?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Khám phá ngay hơn 500+ công thức nấu ăn độc quyền với hướng dẫn chi tiết từng bước, giúp bạn khai phá trọn vẹn công năng của chiếc nồi, chảo mới trổ tài cùng gia đình!
            </p>
          </div>
        </div>

        <Link
          to="/recipes"
          className="shrink-0 px-6 py-3.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          Khám phá Công Thức Nấu Ăn
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Banner hiển thị tại Trang Công Thức / Chi tiết Công Thức -> Gợi ý người xem mua đồ bếp tại KitchenCook
 */
export function RecipeToKitchenBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#FAF7F2] dark:bg-slate-800/90 border border-stone-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs font-vietnam">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-2xl shrink-0 shadow-md">
            <ChefHat className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Nấu ăn ngon cần dụng cụ chuẩn! Bạn muốn mua đồ bếp xịn?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Ghé thăm ngay <strong>KitchenCook</strong> để trang bị những bộ nồi niêu xoong chảo chống dính, dao kéo rèn sắc bén cao cấp, giúp từng thao tác chế biến của bạn mượt mà và chuẩn vị như bếp trưởng.
            </p>
          </div>
        </div>

        <Link
          to="/shop"
          className="shrink-0 px-6 py-3.5 rounded-full bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          Ghé thăm KitchenCook Store
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
