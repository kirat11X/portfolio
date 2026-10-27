import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useMediaQuery } from './useMediaQuery';

interface Columns {
  /** Below 40rem (640 px). */
  base: number;
  /** From 40rem. */
  sm: number;
  /** From 64rem (1024 px). */
  lg: number;
}

interface MasonryProps<T> {
  items: readonly T[];
  /** Stable, unique key for an item (its position in `items` is passed for lists that may repeat). */
  getKey: (item: T, index: number) => string;
  /** Width ÷ height of the rendered item, used to balance the column heights. */
  getRatio: (item: T) => number;
  renderItem: (item: T, index: number) => ReactNode;
  columns?: Columns;
  /** Accessible name of the list. */
  label: string;
  className?: string;
}

/** Relative gap between items, as a fraction of a column's width. */
const GAP = 0.06;

interface Placed<T> {
  item: T;
  index: number;
}

/** Each item goes to the currently shortest column, so the first row keeps the data order. */
function distribute<T>(items: readonly T[], count: number, getRatio: (item: T) => number): Placed<T>[][] {
  const lanes = Array.from({ length: Math.max(1, count) }, () => ({ height: 0, items: [] as Placed<T>[] }));
  items.forEach((item, index) => {
    let target = lanes[0];
    for (const lane of lanes) if (lane.height < target.height - 1e-6) target = lane;
    target.items.push({ item, index });
    target.height += 1 / Math.max(0.1, getRatio(item)) + GAP;
  });
  return lanes.map((lane) => lane.items);
}

/**
 * A balanced masonry of known-ratio items. Columns are explicit so the top row
 * follows the data order (CSS columns would fill the first column first). The
 * columns are presentational; assistive tech sees one list of items.
 */
export function Masonry<T>({ items, getKey, getRatio, renderItem, columns = { base: 1, sm: 2, lg: 3 }, label, className }: MasonryProps<T>) {
  const sm = useMediaQuery('(min-width: 40rem)');
  const lg = useMediaQuery('(min-width: 64rem)');
  const count = lg ? columns.lg : sm ? columns.sm : columns.base;
  const lanes = distribute(items, count, getRatio);

  return (
    <div role="list" aria-label={label} className={cn('flex items-start gap-4 sm:gap-6', className)}>
      {lanes.map((lane, laneIndex) => (
        // Lanes are positional: the same index is always the same column.
        <div key={laneIndex} role="none" className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6">
          {lane.map(({ item, index }) => (
            <div key={getKey(item, index)} role="listitem">
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
