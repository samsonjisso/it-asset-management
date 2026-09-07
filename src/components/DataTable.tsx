'use client';

import { ReactNode, useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKeys?: (keyof T)[];
  // Comprehensive search: given a row, returns a single haystack string
  // (already combining every field worth matching on - resolved labels,
  // nested records like department/license, custom/extra fields, etc.)
  // that free-text search is matched against, in addition to searchKeys.
  // Use this instead of (or alongside) searchKeys whenever a page wants
  // search to cover more than its raw top-level columns.
  searchValue?: (row: T) => string;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  pageSize?: number;
  actions?: ReactNode;
  dateFilterKey?: keyof T;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  searchKeys = [],
  searchValue,
  searchPlaceholder = 'Search...',
  onRowClick,
  emptyMessage = 'No records found',
  pageSize = 10,
  actions,
  dateFilterKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const searchEnabled = searchKeys.length > 0 || !!searchValue;

  const filtered = useMemo(() => {
    let result = [...data];

    if (search && searchEnabled) {
      const q = search.toLowerCase();
      result = result.filter((row) => {
        if (searchValue && searchValue(row).toLowerCase().includes(q)) return true;
        return searchKeys.some((key) => {
          const val = row[key];
          return val != null && String(val).toLowerCase().includes(q);
        });
      });
    }

    if (dateFilterKey && (dateFrom || dateTo)) {
      result = result.filter((row) => {
        const val = row[dateFilterKey];
        if (!val) return false;
        const date = new Date(val as string).getTime();
        if (dateFrom && date < new Date(dateFrom).getTime()) return false;
        if (dateTo && date > new Date(dateTo).getTime() + 86400000) return false;
        return true;
      });
    }

    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        result.sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av < bv) return sortDir === 'asc' ? -1 : 1;
          if (av > bv) return sortDir === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, search, searchEnabled, searchKeys, searchValue, sortKey, sortDir, columns, dateFilterKey, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-1 gap-2 flex-wrap">
          {searchEnabled && (
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="gbb-input w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-sm hover:border-brand-500"
              />
            </div>
          )}
          {dateFilterKey && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="gbb-input px-3 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-sm hover:border-brand-500"
                title="From date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="gbb-input px-3 py-2.5 rounded-xl border-2 border-brand-600 bg-white dark:bg-gray-900 text-sm hover:border-brand-500"
                title="To date"
              />
            </>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      {/* Table (md and up) */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="gbb-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.className}>
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-brand-600 transition-colors"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )
                        ) : (
                          <ArrowUpDown size={14} className="opacity-50" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox size={30} className="text-gray-300 dark:text-gray-600" />
                      <span className="text-sm">{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'cursor-pointer' : ''}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={col.className}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * pageSize + 1}</span>–
              <span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 hover:shadow-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-brand-600 px-3 py-1 rounded-lg bg-white dark:bg-gray-900 shadow-soft">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 hover:shadow-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Smart cards (below md) — same data, one card per row instead of a
          horizontally-scrolling table, so nothing gets clipped on phones. */}
      <div className="md:hidden space-y-3">
        {paginated.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 py-16 flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
            <Inbox size={30} className="text-gray-300 dark:text-gray-600" />
            <span className="text-sm">{emptyMessage}</span>
          </div>
        ) : (
          paginated.map((row) => {
            const primary = columns.find((c) => c.key !== 'actions');
            const actionsCol = columns.find((c) => c.key === 'actions');
            const restCols = columns.filter((c) => c.key !== 'actions' && c.key !== primary?.key);
            return (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 ${onRowClick ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-900' : ''}`}
              >
                {primary && (
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
                    {primary.render ? primary.render(row) : String((row as Record<string, unknown>)[primary.key] ?? '')}
                  </div>
                )}
                <dl className="space-y-1.5">
                  {restCols.map((col) => {
                    const value = col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '');
                    return (
                      <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                        <dt className="text-gray-400 dark:text-gray-500 shrink-0">{col.label}</dt>
                        <dd className="text-gray-700 dark:text-gray-300 text-right min-w-0">{value}</dd>
                      </div>
                    );
                  })}
                </dl>
                {actionsCol && (
                  <div
                    className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actionsCol.render!(row)}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pagination (mobile) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * pageSize + 1}</span>–
              <span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-brand-600 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 shadow-soft">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
