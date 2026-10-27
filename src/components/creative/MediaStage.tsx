import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface MediaStageProps {
  /** Width ÷ height of the content. The content box is sized so it never exceeds the stage's max height. */
  ratio: number;
  /** Image drawn as a soft, blurred ambient backdrop behind the content. */
  backdrop?: string;
  /** Rendered over the stage's top-left corner (e.g. the Placeholder label). */
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The hero "stage" of a creative project page: media centred at its true aspect
 * ratio, as large as fits within ~70% of the viewport height, on a dark panel
 * lit by a blurred copy of the image.
 */
export function MediaStage({ ratio, backdrop, badge, children, className }: MediaStageProps) {
  const style = { '--stage-ratio': ratio } as CSSProperties;
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-panel border border-line bg-ink-900 p-3 sm:p-6 lg:p-8 xl:p-10',
        '[--stage-max-h:min(70vh,46rem)]',
        className,
      )}
      style={style}
    >
      {backdrop && (
        <img
          src={backdrop}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-30 blur-3xl saturate-150 light:opacity-[0.12]"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_0%,rgb(var(--cre-rgb)/0.12),transparent_75%)]"
      />
      <div className="mx-auto w-[min(100%,calc(var(--stage-max-h)*var(--stage-ratio)))]">{children}</div>
      {badge && <div className="absolute left-3 top-3 z-10 sm:left-4 sm:top-4">{badge}</div>}
    </div>
  );
}
