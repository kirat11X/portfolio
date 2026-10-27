import { cn } from '@/lib/cn';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type Tone = 'eng' | 'cre' | 'neutral';
export type Size = 'sm' | 'md' | 'lg';

const sizes: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-[13px]',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-12 gap-2.5 px-6 text-[15px]',
};

const variants: Record<Variant, Record<Tone, string>> = {
  primary: {
    eng: 'bg-eng text-ink-950 hover:bg-contrast shadow-glow-eng',
    cre: 'bg-cre text-ink-950 hover:bg-contrast shadow-glow-cre',
    neutral: 'bg-fg text-ink-950 hover:bg-contrast',
  },
  secondary: {
    eng: 'glass text-fg hover:border-eng/50 hover:text-contrast',
    cre: 'glass text-fg hover:border-cre/50 hover:text-contrast',
    neutral: 'glass text-fg hover:border-line-strong hover:text-contrast',
  },
  ghost: {
    eng: 'text-fg-muted hover:bg-contrast/5 hover:text-eng',
    cre: 'text-fg-muted hover:bg-contrast/5 hover:text-cre',
    neutral: 'text-fg-muted hover:bg-contrast/5 hover:text-fg',
  },
  outline: {
    eng: 'border border-eng/40 text-eng hover:border-eng hover:bg-eng/10',
    cre: 'border border-cre/40 text-cre hover:border-cre hover:bg-cre/10',
    neutral: 'border border-line-strong text-fg hover:border-fg/40 hover:bg-contrast/5',
  },
};

export function buttonClasses({
  variant = 'primary',
  tone = 'eng',
  size = 'md',
  className,
}: { variant?: Variant; tone?: Tone; size?: Size; className?: string } = {}) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium whitespace-nowrap',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out-expo',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
    sizes[size],
    variants[variant][tone],
    className,
  );
}
