import React, { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpNarrowWide, ArrowDownWideNarrow, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SortDir, SortOption, SortState } from '../../hooks/useTableSort';

/* ── Search box ──────────────────────────────────────────────────────────── */

export function SearchInput({ value, onChange, placeholder = 'Search…', id, className }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative flex-1 min-w-[180px] max-w-xs', className)}>
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field pl-8 pr-7 text-sm"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/* ── Single-choice dropdown filter ───────────────────────────────────────── */

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * A plain `<select>` rather than a custom popover: it is keyboard-accessible and
 * screen-reader-labelled for free, and picks up the native mobile picker.
 * `allLabel` occupies the sentinel value 'all', which callers treat as no-op.
 */
export function FilterSelect({ value, onChange, options, allLabel, id, ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  allLabel: string;
  id?: string;
  ariaLabel?: string;
}) {
  const active = value !== 'all';
  return (
    <select
      id={id}
      aria-label={ariaLabel ?? allLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'input-field w-auto text-sm py-1.5 cursor-pointer',
        active && 'border-primary-400 text-primary-700 font-medium bg-primary-50/40'
      )}
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Sort menu ───────────────────────────────────────────────────────────── */

/**
 * Field picker plus direction toggle in one dropdown.
 *
 * Kept separate from the table header so it also serves card/kanban views,
 * which have no header row to click.
 */
export function SortMenu({ options, sort, onChange, id }: {
  options: SortOption[];
  sort: SortState;
  onChange: (next: SortState) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activeLabel = options.find((o) => o.key === sort.key)?.label ?? 'Sort';
  const DirIcon = sort.dir === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow;

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="btn-secondary py-1.5 whitespace-nowrap"
      >
        <SlidersHorizontal size={13} />
        <span className="hidden sm:inline">{activeLabel}</span>
        <DirIcon size={13} className="text-slate-400" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-dropdown z-40 py-1 animate-fade-in"
        >
          <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sort by</p>
          {options.map((o) => (
            <button
              key={o.key}
              role="option"
              aria-selected={o.key === sort.key}
              onClick={() => { onChange({ key: o.key, dir: sort.dir }); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50',
                o.key === sort.key ? 'text-primary-700 font-semibold' : 'text-slate-600'
              )}
            >
              {o.label}
              {o.key === sort.key && <Check size={12} className="shrink-0" />}
            </button>
          ))}

          <div className="border-t border-slate-100 mt-1 pt-1">
            {(['asc', 'desc'] as SortDir[]).map((dir) => (
              <button
                key={dir}
                onClick={() => { onChange({ key: sort.key, dir }); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50',
                  sort.dir === dir ? 'text-primary-700 font-semibold' : 'text-slate-600'
                )}
              >
                {dir === 'asc' ? <ArrowUpNarrowWide size={12} /> : <ArrowDownWideNarrow size={12} />}
                {dir === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reset ───────────────────────────────────────────────────────────────── */

/** Renders nothing unless something is actually filtered, so it never nags. */
export function ResetFiltersButton({ show, onReset }: { show: boolean; onReset: () => void }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onReset}
      className="text-xs text-slate-500 hover:text-primary-700 underline underline-offset-2 whitespace-nowrap"
    >
      Clear filters
    </button>
  );
}

/* ── Layout shell ────────────────────────────────────────────────────────── */

export function TableToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {children}
    </div>
  );
}

/**
 * "12 of 48 employees" — collapses to "48 employees" when nothing is filtered
 * out, so the count never reads as a riddle.
 */
export function ResultCount({ shown, total, noun, nounPlural }: {
  shown: number;
  total: number;
  noun: string;
  nounPlural?: string;
}) {
  const plural = nounPlural ?? `${noun}s`;
  const word = total === 1 ? noun : plural;
  return (
    <p className="text-xs text-slate-500 mt-0.5">
      {shown === total ? `${total} ${word}` : `${shown} of ${total} ${word}`}
    </p>
  );
}
