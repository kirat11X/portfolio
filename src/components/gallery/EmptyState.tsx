import type { ReactNode } from 'react';
import { SearchX } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** Usually a reset button or a link back to the full collection. */
  action?: ReactNode;
  icon?: ReactNode;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

/** An empty gallery wall: says what happened and offers the way back. */
export function EmptyState({ title, description, action, icon, headingLevel: Heading = 'h3', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-14 text-center sm:py-16',
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full border border-line bg-contrast/[0.03] text-fg-muted" aria-hidden="true">
        {icon ?? <SearchX className="h-5 w-5" />}
      </span>
      <Heading className="mt-5 text-lg font-semibold text-fg">{title}</Heading>
      {description && <div className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">{description}</div>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}
