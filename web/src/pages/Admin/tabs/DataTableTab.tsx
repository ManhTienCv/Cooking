import { useState, useMemo, useEffect, type ReactNode } from 'react';
import Pagination from '../../../components/ui/Pagination';

interface DataTableProps {
  title: string;
  rows: Record<string, unknown>[];
  columns: { key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => ReactNode }[];
  actions?: (row: Record<string, unknown>) => ReactNode;
  pageSize?: number;
}

export default function DataTableTab({ title, rows, columns, actions, pageSize = 10 }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Tự động điều chỉnh trang nếu dữ liệu thay đổi hoặc xóa bớt
  useEffect(() => {
    if (currentPage > 1 && (currentPage - 1) * pageSize >= rows.length) {
      setCurrentPage(Math.max(1, Math.ceil(rows.length / pageSize)));
    }
  }, [rows.length, currentPage, pageSize]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const startIdx = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, rows.length);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
        {rows.length > 0 && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-3 py-1 rounded-full">
            Tổng số: {rows.length}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-6 py-4 font-semibold">
                  {c.label}
                </th>
              ))}
              {actions && <th className="px-6 py-4 font-semibold text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-8 text-center text-slate-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={String(row.id)} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className="px-6 py-4 text-slate-700 dark:text-slate-300 align-middle">
                      {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? '')}
                    </td>
                  ))}
                  {actions && <td className="px-6 py-4 text-right align-middle">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > pageSize && (
        <div className="p-5 border-t border-slate-100 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Hiển thị <strong className="text-slate-700 dark:text-slate-200">{startIdx}</strong> - <strong className="text-slate-700 dark:text-slate-200">{endIdx}</strong> trên tổng số <strong className="text-slate-700 dark:text-slate-200">{rows.length}</strong> mục
          </p>
          <div className="scale-90 sm:scale-95 origin-center sm:origin-right">
            <Pagination
              currentPage={currentPage}
              totalItems={rows.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              autoScrollTop={false}
              className=""
              activeClassName="bg-blue-600 text-white shadow-md border-blue-600 dark:bg-blue-600 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
