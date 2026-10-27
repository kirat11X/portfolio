import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'eng' | 'cre' | 'neutral';

const eyebrowTone: Record<Tone, string> = {
  eng: 'text-eng',
  cre: 'text-cre',
  neutral: 'text-fg-muted',
};

interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  tone?: Tone;
  align?: 'left' | 'center';
  as?: 'h2' | 'h3';
  /** Optional element aligned to the right on wide screens (e.g. a "View all" button). */
  action?: ReactNode;
  id?: string;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = 'neutral',
  align = 'left',
  as: Heading = 'h2',
  action,
  id,
  className,
}: SectionHeadingProps) {
  const centered = align === 'center';
  return (
    <div
      className={cn(
        'mb-10 flex flex-col gap-6 sm:mb-12',
        !centered && action && 'md:flex-row md:items-end md:justify-between',
        centered && 'items-center text-center',
        className,
      )}
    >
      <div className={cn('max-w-3xl', centered && 'mx-auto')}>
        {eyebrow && <p className={cn('eyebrow', eyebrowTone[tone])}>{eyebrow}</p>}
        <Heading id={id} className="mt-3 font-display text-display-md font-semibold text-fg">
          {title}
        </Heading>
        {description && <p className="mt-4 text-base leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
