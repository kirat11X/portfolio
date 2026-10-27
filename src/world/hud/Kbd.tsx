import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Keyboard key chip. Decorative by default — pair it with readable text. */
export function Kbd({ children, className, decorative = false }: { children: ReactNode; className?: string; decorative?: boolean }) {
  return (
    <kbd
      aria-hidden={decorative || undefined}
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-white/[0.04] px-1.5 font-mono text-[10.5px] leading-none font-medium text-fg-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
