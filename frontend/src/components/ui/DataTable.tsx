import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SortState } from '../../hooks/useTableSort';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
  /**
   * Sort key for this column. Set it to make the header clickable — the value
   * must match a key in the accessor map passed to useTableSort. Omit for
   * columns that hold no meaningfully orderable value (actions, checkboxes).
   */
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
  stickyHeader?: boolean;
  compact?: boolean;
  /** Current sort, used to draw the arrow. Pass with onSortChange to enable header sorting. */
  sort?: SortState;
  /** Called with the clicked column's sortKey; the caller flips direction. */
  onSortChange?: (sortKey: string) => void;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyState,
  isLoading,
  pagination,
  className,
  stickyHeader = false,
  compact = false,
  sort,
  onSortChange,
}: DataTableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;
  const cellPy = compact ? 'py-2' : 'py-3';

  return (
    <div className={cn('overflow-hidden rounded-lg border border-slate-200 bg-white', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={cn('bg-slate-50 border-b border-slate-200', stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {columns.map((col) => {
                // A header is only interactive when the column declares a sort key
                // AND the page wired up a handler — otherwise it stays plain text.
                const sortable = Boolean(col.sortKey && onSortChange);
                const isActive = sortable && sort?.key === col.sortKey;
                const Arrow = !isActive ? ChevronsUpDown : sort?.dir === 'asc' ? ChevronUp : ChevronDown;
                return (
                  <th
                    key={col.key}
                    aria-sort={isActive ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap',
                      isActive ? 'text-primary-700' : 'text-slate-500',
                      col.width,
                      col.className
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange!(col.sortKey!)}
                        className="group inline-flex items-center gap-1 uppercase tracking-wider hover:text-primary-700 transition-colors"
                      >
                        {col.header}
                        <Arrow
                          size={12}
                          className={cn('shrink-0', isActive ? 'text-primary-600' : 'text-slate-300 group-hover:text-slate-400')}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-4', cellPy)}>
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.length === 0
              ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center">
                      {emptyState ?? <p className="text-slate-400 text-sm">No records found</p>}
                    </td>
                  </tr>
                )
              : data.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'transition-colors hover:bg-slate-50/70',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-4 text-slate-700 whitespace-nowrap', cellPy, col.className)}
                      >
                        {col.render
                          ? col.render((row as Record<string, unknown>)[col.key], row)
                          : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            {[
              { icon: ChevronsLeft, disabled: pagination.page === 1, to: 1 },
              { icon: ChevronLeft, disabled: pagination.page === 1, to: pagination.page - 1 },
            ].map(({ icon: Icon, disabled, to }) => (
              <button
                key={to}
                onClick={() => pagination.onPageChange(to)}
                disabled={disabled}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors"
              >
                <Icon size={13} />
              </button>
            ))}
            <span className="text-xs text-slate-600 px-2">{pagination.page} / {totalPages}</span>
            {[
              { icon: ChevronRight, disabled: pagination.page === totalPages, to: pagination.page + 1 },
              { icon: ChevronsRight, disabled: pagination.page === totalPages, to: totalPages },
            ].map(({ icon: Icon, disabled, to }) => (
              <button
                key={to}
                onClick={() => pagination.onPageChange(to)}
                disabled={disabled}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors"
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
