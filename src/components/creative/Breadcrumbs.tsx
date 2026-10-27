import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Crumb {
  label: string;
  /** Omit for the current page (always the last crumb). */
  to?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

/** Breadcrumb trail; the first crumb doubles as the "back" link. */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.label} className={cn('flex items-center gap-1', last && 'min-w-0 flex-1 basis-40')}>
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-fg-muted transition-colors duration-200 hover:text-fg"
                >
                  {index === 0 && <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="block min-w-0 truncate px-1 py-3 text-fg">
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
