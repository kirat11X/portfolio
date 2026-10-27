import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type DeviceKind = 'browser' | 'phone';

interface DeviceFrameProps {
  kind?: DeviceKind;
  /** Screen content; it fills the screen area (use `fill` on ProjectCover). */
  children: ReactNode;
  /** Width ÷ height of the screen area. Defaults to 16:10 (browser) or 9:19.5 (phone). */
  screenRatio?: number;
  className?: string;
}

/**
 * A minimal, brand-free device bezel for presenting interface work: a browser
 * window or a phone. Purely presentational — the chrome is hidden from assistive tech.
 */
export function DeviceFrame({ kind = 'browser', children, screenRatio, className }: DeviceFrameProps) {
  if (kind === 'phone') {
    return (
      <div
        className={cn(
          'relative rounded-[2.1rem] border border-contrast/15 bg-ink-950 p-[0.4rem] shadow-(--elevation-device)',
          className,
        )}
      >
        <div className="relative overflow-hidden rounded-[1.75rem] bg-ink-900" style={{ aspectRatio: screenRatio ?? 9 / 19.5 }}>
          {children}
          <span aria-hidden="true" className="absolute left-1/2 top-2 h-[1.15rem] w-[34%] -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-contrast/15 bg-ink-850 shadow-(--elevation-device)',
        className,
      )}
    >
      <div aria-hidden="true" className="flex h-7 items-center gap-1.5 border-b border-line bg-contrast/[0.02] px-3">
        <span className="h-2 w-2 rounded-full bg-contrast/20" />
        <span className="h-2 w-2 rounded-full bg-contrast/20" />
        <span className="h-2 w-2 rounded-full bg-contrast/20" />
        <span className="mx-auto h-3 w-[38%] rounded-full bg-contrast/[0.07]" />
        <span className="w-[1.85rem]" />
      </div>
      <div className="relative" style={{ aspectRatio: screenRatio ?? 16 / 10 }}>
        {children}
      </div>
    </div>
  );
}
