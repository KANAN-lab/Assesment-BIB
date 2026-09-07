/**
 * SearchableSelect — OOP Select2-style dropdown dengan search/filter realtime.
 * Reusable di seluruh modul aplikasi.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  /** Teks sekunder opsional (ditampilkan lebih kecil di bawah label) */
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  id?: string;
}

export class SearchableSelectComponent {
  static filterOptions(options: SelectOption[], query: string): SelectOption[] {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.sublabel?.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q)
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = SearchableSelectComponent.filterOptions(options, query);

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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setFocusedIdx(-1);
    }
  }, [isOpen]);

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
      case 'Enter':
        e.preventDefault();
        if (focusedIdx >= 0 && filtered[focusedIdx]) {
          handleSelect(filtered[focusedIdx]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'w-full' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger */}
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
          transition-colors duration-150
          focus:outline-none focus:ring-1 focus:ring-rose-500
          ${isOpen ? 'border-rose-500' : 'border-zinc-800 hover:border-zinc-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={`truncate font-semibold ${selected ? 'text-white' : 'text-zinc-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={11} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-zinc-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-[99999] mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900">
            <Search size={13} className="text-zinc-500 shrink-0" />
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
              <button type="button" onClick={() => setQuery('')} className="text-zinc-500 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* List */}
          <ul ref={listRef} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-zinc-500 italic text-center">
                Tidak ada hasil untuk "{query}"
              </li>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isFocused = idx === focusedIdx;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                    className={`
                      flex flex-col px-4 py-2 cursor-pointer select-none transition-colors duration-100
                      ${isSelected
                        ? 'bg-rose-900/40 text-rose-300'
                        : isFocused
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-200 hover:bg-zinc-800'}
                    `}
                  >
                    <span className="text-xs font-semibold truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-zinc-500 truncate">{opt.sublabel}</span>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Counter */}
          {query && filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-zinc-800 bg-zinc-900 text-[10px] text-zinc-500 text-right">
              {filtered.length} dari {options.length} hasil
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
