import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TagTone = 'eng' | 'cre' | 'signal' | 'ok' | 'neutral';

const tones: Record<TagTone, string> = {
  eng: 'border-eng/25 bg-eng/[0.07] text-eng',
  cre: 'border-cre/25 bg-cre/[0.08] text-cre',
  signal: 'border-signal/30 bg-signal/[0.08] text-signal',
  ok: 'border-ok/25 bg-ok/[0.07] text-ok',
  neutral: 'border-line bg-contrast/[0.03] text-fg-muted',
};

const dots: Record<TagTone, string> = {
  eng: 'bg-eng',
  cre: 'bg-cre',
  signal: 'bg-signal',
  ok: 'bg-ok',
  neutral: 'bg-fg-subtle',
};

interface TagProps {
  tone?: TagTone;
  size?: 'sm' | 'md';
  /** Show a small coloured dot before the label. */
  dot?: boolean;
  /** Monospace uppercase label (default) or regular case for technology names. */
  casing?: 'label' | 'plain';
  className?: string;
  children: ReactNode;
}

export function Tag({ tone = 'neutral', size = 'sm', dot, casing = 'label', className, children }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-mono leading-none whitespace-nowrap',
        casing === 'label' ? 'uppercase tracking-[0.12em]' : 'tracking-normal',
        size === 'sm' ? 'px-2.5 py-1 text-[10.5px]' : 'px-3 py-1.5 text-xs',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
