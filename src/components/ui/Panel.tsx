import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** Adds hover feedback for clickable panels. */
  interactive?: boolean;
  /** Use the denser glass surface (overlays, menus). */
  strong?: boolean;
  children: ReactNode;
}

/** The standard glass surface. Use instead of hand-rolled blur/border recipes. */
export function Panel({ as: Component = 'div', interactive, strong, className, children, ...rest }: PanelProps) {
  return (
    <Component
      className={cn(
        strong ? 'glass-strong' : 'glass',
        'rounded-card shadow-panel',
        interactive && 'transition-[border-color,transform,box-shadow] duration-300 ease-out-expo hover:border-line-strong',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
