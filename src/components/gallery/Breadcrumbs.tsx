import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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

/**
 * Where this page sits in the site. The current page is marked with
 * aria-current and hidden on phones, where the h1 directly below repeats it.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center text-[13px]">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${item.to ?? 'current'}`} className={cn('flex min-w-0 items-center', current && 'max-sm:hidden')}>
              {index > 0 && <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />}
              {current || !item.to ? (
                <span aria-current={current ? 'page' : undefined} className="truncate py-3 text-fg-subtle">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="-mx-1.5 inline-flex min-h-11 items-center rounded-lg px-1.5 text-fg-muted transition-colors hover:text-fg"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
