/**
 * SearchableSelect — OOP Select2-style dropdown dengan search/filter realtime,
 * automatic ascending sorting (A-Z), search term highlight, checkmark, dan keyboard navigation.
 * Reusable di seluruh modul aplikasi.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Search, X, Check, RotateCcw } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  /** Teks sekunder opsional (ditampilkan lebih kecil di bawah label) */
  sublabel?: string;
  /** Tag / badge penjelas (misal: 'SP1', 'Aktif', 'High-Rack') */
  badge?: string;
  /** Warna kustom badge Tailwind (opsional) */
  badgeColor?: string;
}

export interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  id?: string;
  /** Otomatis urutkan opsi secara ascending A-Z (default: true) */
  sortAscending?: boolean;
  /** Tampilkan tombol silang (clear) untuk reset ke placeholder (default: true) */
  clearable?: boolean;
  /** Tampilkan badge hitungan opsi yang cocok (default: true) */
  showMatchCounter?: boolean;
  className?: string;
}

export class SearchableSelectComponent {
  /**
   * Mengurutkan list options secara ascending (A-Z) berdasarkan label.
   * Opsi bernilai kosong ('') atau format placeholder tetap diletakkan paling atas.
   */
  static sortOptions(options: SelectOption[], ascending = true): SelectOption[] {
    const isTopItem = (o: SelectOption) =>
      o.value === '' ||
      o.value.toLowerCase() === 'all' ||
      o.value.toLowerCase() === 'semua' ||
      o.label.startsWith('--') ||
      o.label.toLowerCase().startsWith('semua');

    const topOptions = options.filter(isTopItem);
    const validOptions = options.filter((o) => !isTopItem(o));

    validOptions.sort((a, b) => {
      const cmp = a.label.localeCompare(b.label, 'id', { sensitivity: 'base', numeric: true });
      return ascending ? cmp : -cmp;
    });

    return [...topOptions, ...validOptions];
  }

  /**
   * Filter opsi secara realtime berdasarkan label, sublabel, value, maupun badge.
   */
  static filterOptions(options: SelectOption[], query: string): SelectOption[] {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.sublabel?.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        opt.badge?.toLowerCase().includes(q)
    );
  }

  /**
   * Highlight substring yang cocok dengan kata pencarian
   */
  static highlightMatch(text: string, query: string): React.ReactNode {
    if (!query.trim() || !text) return text;
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-amber-500/30 text-amber-300 font-bold px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  }
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Pilih --',
  searchPlaceholder = 'Cari...',
  disabled = false,
  fullWidth = true,
  id,
  sortAscending = true,
  clearable = true,
  showMatchCounter = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // 1. Sort options secara ascending (A-Z)
  const sortedOptions = useMemo(() => {
    return sortAscending ? SearchableSelectComponent.sortOptions(options, true) : options;
  }, [options, sortAscending]);

  // 2. Filter options realtime
  const filtered = useMemo(() => {
    return SearchableSelectComponent.filterOptions(sortedOptions, query);
  }, [sortedOptions, query]);

  // 3. Current selected option
  const selected = useMemo(() => {
    return sortedOptions.find((o) => o.value === value) ?? null;
  }, [sortedOptions, value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setFocusedIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setFocusedIdx(-1);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (focusedIdx >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (!isOpen) setQuery('');
  }, [disabled, isOpen]);

  const handleSelect = useCallback(
    (opt: SelectOption) => {
      onChange(opt.value);
      setIsOpen(false);
      setQuery('');
      setFocusedIdx(-1);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setIsOpen(false);
      setQuery('');
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIdx(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIdx(filtered.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIdx >= 0 && filtered[focusedIdx]) {
          handleSelect(filtered[focusedIdx]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={handleToggle}
        className={`
          w-full flex items-center justify-between gap-2
          bg-zinc-900 border rounded-xl px-3.5 py-2.5 text-xs text-left
          transition-all duration-150 shadow-sm
          focus:outline-none focus:ring-1 focus:ring-amber-500/50
          ${isOpen ? 'border-amber-500 bg-zinc-900/90 ring-1 ring-amber-500/30' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`truncate font-semibold ${
              selected && selected.value !== '' ? 'text-white' : 'text-zinc-500 font-normal'
            }`}
          >
            {selected && selected.value !== '' ? selected.label : placeholder}
          </span>
          {selected?.badge && (
            <span
              className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                selected.badgeColor || 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {selected.badge}
            </span>
          )}
        </div>

        <span className="flex items-center gap-1 shrink-0">
          {clearable && selected && selected.value !== '' && !disabled && (
            <span
              role="button"
              title="Reset pilihan"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-400' : ''}`}
          />
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-[99999] mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/95">
            <Search size={13} className="text-zinc-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIdx(-1);
              }}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded transition"
                title="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
            {showMatchCounter && (
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                {filtered.length} opsi
              </span>
            )}
          </div>

          {/* List Options */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1 custom-scrollbar divide-y divide-zinc-900/50"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-zinc-400 space-y-2">
                <p className="italic">Tidak ada hasil untuk "{query}"</p>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-1 rounded-lg transition"
                >
                  <RotateCcw size={11} /> Bersihkan Pencarian
                </button>
              </li>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.value === value && opt.value !== '';
                const isFocused = idx === focusedIdx;
                const isPlaceholderItem = opt.value === '';

                return (
                  <li
                    key={opt.value || `empty_${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                    className={`
                      flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none transition-colors duration-75 gap-2
                      ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-200 border-l-2 border-amber-400 font-bold'
                          : isFocused
                          ? 'bg-zinc-850 text-white'
                          : isPlaceholderItem
                          ? 'text-zinc-500 hover:bg-zinc-850 italic'
                          : 'text-zinc-300 hover:bg-zinc-850'
                      }
                    `}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs truncate">
                        {query ? SearchableSelectComponent.highlightMatch(opt.label, query) : opt.label}
                      </span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                          {query ? SearchableSelectComponent.highlightMatch(opt.sublabel, query) : opt.sublabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            opt.badgeColor || 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={13} className="text-amber-400" />}
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer Info if Querying */}
          {query && filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-zinc-850 bg-zinc-900/60 text-[10px] text-zinc-500 flex items-center justify-between">
              <span>Menampilkan {filtered.length} dari {options.length} data</span>
              <span className="text-[9px] text-zinc-600">Tekan Enter untuk memilih</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
