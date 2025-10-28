'use client';

import { useMobileOptimizations } from '../mobile-optimizations';

/**
 * Mobile-Optimized Table Component
 *
 * Automatically switches between:
 * - Desktop: Traditional table layout
 * - Mobile: Card-based layout for better readability
 */

export interface TableColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface MobileTableProps {
  data: any[];
  columns: TableColumn[];
  keyField?: string;
  className?: string;
  emptyMessage?: string;
}

export function MobileTable({
  data,
  columns,
  keyField = 'id',
  className = '',
  emptyMessage = 'No data available',
}: MobileTableProps) {
  const { isMobile } = useMobileOptimizations();

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Desktop: Traditional table layout
  if (!isMobile) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-sm font-medium text-slate-300 ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={row[keyField] || rowIndex}
                className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm ${col.className || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Mobile: Card-based layout
  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((row, rowIndex) => (
        <div
          key={row[keyField] || rowIndex}
          className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 space-y-3"
        >
          {columns.map(col => (
            <div
              key={col.key}
              className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/30 last:border-0"
            >
              <span className="text-sm text-slate-400 font-medium flex-shrink-0">
                {col.label}
              </span>
              <span
                className={`text-sm text-white text-right ${col.className || ''}`}
              >
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
