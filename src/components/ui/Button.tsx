import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buttonClasses, type Size, type Tone, type Variant } from './buttonStyles';
import { isExternalHref } from '@/lib/routes';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  tone?: Tone;
  size?: Size;
  /** Internal route: renders a router <Link>. */
  to?: string;
  /** URL: renders an <a>. External URLs open in a new tab. */
  href?: string;
  /** Adds the download attribute when rendering an <a>. */
  download?: boolean | string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant,
  tone,
  size,
  to,
  href,
  download,
  iconLeft,
  iconRight,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = buttonClasses({ variant, tone, size, className });
  const content = (
    <>
      {iconLeft && <span className="-ml-0.5 flex shrink-0" aria-hidden="true">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span className="-mr-0.5 flex shrink-0" aria-hidden="true">{iconRight}</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }

  if (href) {
    const external = isExternalHref(href) && !href.startsWith('mailto:');
    return (
      <a
        href={href}
        className={classes}
        download={download}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {content}
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}
