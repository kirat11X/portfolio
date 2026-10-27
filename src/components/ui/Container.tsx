import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const sizes = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[88rem]',
} as const;

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  size?: keyof typeof sizes;
  as?: ElementType;
  children: ReactNode;
}

/** Horizontally centred content column with the standard page gutters. */
export function Container({ size = 'lg', as: Component = 'div', className, children, ...rest }: ContainerProps) {
  return (
    <Component className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizes[size], className)} {...rest}>
      {children}
    </Component>
  );
}
