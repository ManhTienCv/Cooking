import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { scrollWindowToTop } from '../../lib/scroll';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  autoScrollTop?: boolean;
  scrollBehavior?: ScrollBehavior;
  activeClassName?: string;
}

function getPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  autoScrollTop = true,
  scrollBehavior = 'smooth',
  activeClassName,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const pageItems = getPageItems(currentPage, totalPages);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const handlePageChange = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === currentPage) return;
    onPageChange(targetPage);
    if (autoScrollTop) {
      scrollWindowToTop(scrollBehavior);
    }
  };

  const buttonClass =
    'flex h-10 min-w-10 items-center justify-center rounded-full border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 cursor-pointer';

  const defaultActiveClass = 'bg-black text-white shadow-sm dark:bg-white dark:text-slate-950';

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang">
      <button
        type="button"
        className={buttonClass}
        onClick={() => handlePageChange(1)}
        disabled={isFirstPage}
        aria-label="Trang đầu"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={isFirstPage}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageItems.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-10 min-w-10 items-center justify-center text-sm font-bold text-gray-400 dark:text-slate-500"
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={
              item === currentPage
                ? `flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold ${activeClassName || defaultActiveClass}`
                : buttonClass
            }
            onClick={() => handlePageChange(item)}
            aria-current={item === currentPage ? 'page' : undefined}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        className={buttonClass}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={isLastPage}
        aria-label="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => handlePageChange(totalPages)}
        disabled={isLastPage}
        aria-label="Trang cuối"
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
