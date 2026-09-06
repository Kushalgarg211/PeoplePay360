import { useCallback, useMemo, useRef, useState } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortState {
  /** Key into the accessor map — not necessarily a field name on the row. */
  key: string;
  dir: SortDir;
}

/** Reads the comparable value for one sort key out of a row. */
export type SortAccessors<T> = Record<string, (row: T) => string | number | null | undefined>;

export interface SortOption {
  key: string;
  label: string;
}

/**
 * Compare two cell values for sorting.
 *
 * Blanks always sink to the bottom regardless of direction — a row with no
 * value is "unknown", not "smallest", and flipping the arrow should not park
 * a wall of em-dashes at the top of the table.
 */
export function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): number {
  const aBlank = a == null || a === '';
  const bBlank = b == null || b === '';
  if (aBlank && bBlank) return 0;
  if (aBlank) return 1;
  if (bBlank) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Client-side sorting for a list already in memory.
 *
 * Every page here fetches its full collection in one request, so sorting stays
 * on the client: no extra round-trip, and it composes with the search/filter
 * predicates each page already applies.
 *
 * `accessors` is read through a ref so callers can pass a fresh object literal
 * each render without it invalidating the memo — otherwise `sorted` would be a
 * new array on every render and break anything using it as an effect dep.
 */
export function useTableSort<T>(
  rows: T[],
  accessors: SortAccessors<T>,
  initial: SortState
) {
  const [sort, setSort] = useState<SortState>(initial);
  const accessorsRef = useRef(accessors);
  accessorsRef.current = accessors;

  const sorted = useMemo(() => {
    const read = accessorsRef.current[sort.key];
    if (!read) return rows;
    // Copy first — Array.prototype.sort mutates, and `rows` is state upstream.
    return [...rows].sort((a, b) => {
      const result = compareValues(read(a), read(b));
      return sort.dir === 'asc' ? result : -result;
    });
  }, [rows, sort.key, sort.dir]);

  /** Click the active column to flip direction; a new column starts ascending. */
  const toggleSort = useCallback((key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  }, []);

  const resetSort = useCallback(() => setSort(initial), [initial.key, initial.dir]);

  return { sorted, sort, setSort, toggleSort, resetSort };
}
