import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Search, Download, SlidersHorizontal, Table as TableIcon
} from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface CustomDataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchFields?: (keyof T | string)[];
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  pageSizeOptions?: number[];
  exportFileName?: string;
  onRowClick?: (item: T) => void;
  selectedRowId?: string;
  getRowId?: (item: T) => string;
  emptyMessage?: string;
}

export function CustomDataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = 'Cari data...',
  searchFields,
  defaultSortKey,
  defaultSortDir = 'asc',
  pageSizeOptions = [10, 25, 50, 100],
  exportFileName = 'Export_Data',
  onRowClick,
  selectedRowId,
  getRowId,
  emptyMessage = 'Tidak ada data ditemukan.',
}: CustomDataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] || 10);

  // 1. Filtering
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const query = search.toLowerCase().trim();

    return data.filter((item) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field as string];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
        });
      }

      // Default: search all object values
      return Object.values(item).some(
        (val) => val !== undefined && val !== null && String(val).toLowerCase().includes(query)
      );
    });
  }, [data, search, searchFields]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  // 3. Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Handle Sort Toggle
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(undefined);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!sortedData.length) return;

    const headers = columns.map((c) => c.header).join(',');
    const rows = sortedData.map((item) =>
      columns
        .map((c) => {
          const val = item[c.key];
          const cleanVal = String(val ?? '').replace(/"/g, '""');
          return `"${cleanVal}"`;
        })
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, sortedData.length);

  return (
    <div className="space-y-3 font-sans">
      
      {/* DataTable Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Action Controls: Page Size & CSV Export */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-[11px] font-medium hidden sm:inline">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} baris
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition"
            title="Ekspor Data ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            CSV
          </button>
        </div>
      </div>

      {/* Main Table Structure */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60 shadow-xl custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          
          {/* Header */}
          <thead>
            <tr className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const canSort = col.sortable !== false;

                return (
                  <th
                    key={col.key}
                    onClick={() => canSort && handleSort(col.key)}
                    style={{ width: col.width }}
                    className={`py-3 px-4 transition ${
                      canSort ? 'cursor-pointer hover:text-white select-none' : ''
                    } ${
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1.5 ${
                        col.align === 'center'
                          ? 'justify-center'
                          : col.align === 'right'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {canSort && (
                        <span className="text-zinc-500">
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {paginatedData.map((item, idx) => {
              const rowId = getRowId ? getRowId(item) : item.id || idx;
              const isSelected = selectedRowId !== undefined && selectedRowId === rowId;
              const absoluteIdx = (currentPage - 1) * pageSize + idx;

              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-4 ${
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(item, absoluteIdx) : item[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              );
            })}

            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-zinc-500">
                  <TableIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                  <div className="text-xs font-semibold">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DataTable Bottom Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 text-xs text-zinc-400">
        
        {/* Entry Counter Status */}
        <div>
          Menampilkan <span className="font-bold text-white">{sortedData.length ? startIndex : 0}</span> -{' '}
          <span className="font-bold text-white">{endIndex}</span> dari{' '}
          <span className="font-bold text-emerald-400">{sortedData.length}</span> data
          {filteredData.length !== data.length && (
            <span className="text-zinc-500 ml-1">(difilter dari total {data.length})</span>
          )}
        </div>

        {/* Page Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (currentPage > 3) pageNum = currentPage - 2 + i;
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
            }

            const isActive = currentPage === pageNum;

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white border border-emerald-500 shadow-md'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
