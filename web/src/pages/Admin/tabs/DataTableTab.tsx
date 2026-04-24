import type { ReactNode } from 'react';

interface DataTableProps {
  title: string;
  rows: Record<string, unknown>[];
  columns: { key: string; label: string; render?: (val: any, row: Record<string, unknown>) => ReactNode }[];
  actions?: (row: Record<string, unknown>) => ReactNode;
}

export default function DataTableTab({ title, rows, columns, actions }: DataTableProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-8 text-center text-slate-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              rows.map((row) => (
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
    </div>
  );
}
