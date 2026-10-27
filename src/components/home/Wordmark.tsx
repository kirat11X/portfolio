import { profileData } from '@/data/profile';
import { cn } from '@/lib/cn';

/**
 * The "KIRAT" wordmark: tracked display type plus two small dots, cyan for
 * engineering and violet for creative. Purely visual — wrap it in a link with
 * its own accessible name.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="-mr-[0.3em] whitespace-nowrap font-display text-[0.95rem] font-semibold uppercase leading-none tracking-[0.3em] text-fg">
        {profileData.name}
      </span>
      <span className="flex gap-[3px]" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-eng" />
        <span className="h-1.5 w-1.5 rounded-full bg-cre" />
      </span>
    </span>
  );
}
