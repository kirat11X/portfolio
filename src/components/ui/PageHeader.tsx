import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'eng' | 'cre' | 'neutral';

const eyebrowTone: Record<Tone, string> = {
  eng: 'text-eng',
  cre: 'text-cre',
  neutral: 'text-fg-muted',
};

const lineTone: Record<Tone, string> = {
  eng: 'bg-eng',
  cre: 'bg-cre',
  neutral: 'bg-fg-subtle',
};

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  tone?: Tone;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** The opening block of every inner page: eyebrow, h1, lede and actions. */
export function PageHeader({ eyebrow, title, lede, tone = 'neutral', actions, className, children }: PageHeaderProps) {
  return (
    <header className={cn('pb-12 pt-10 sm:pb-16 sm:pt-16', className)}>
      {eyebrow && (
        <p className={cn('eyebrow flex items-center gap-3', eyebrowTone[tone])}>
          <span className={cn('h-px w-8', lineTone[tone])} aria-hidden="true" />
          {eyebrow}
        </p>
      )}
      <h1 className="mt-5 max-w-5xl font-display text-display-lg font-semibold text-fg">{title}</h1>
      {lede && <div className="mt-6 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">{lede}</div>}
      {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
      {children}
    </header>
  );
}
