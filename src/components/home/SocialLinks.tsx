import { ArrowUpRight } from 'lucide-react';
import type { SocialLink } from '@/types';
import { SocialIcon } from '@/components/ui/Icons';
import { profileData } from '@/data/profile';
import { cn } from '@/lib/cn';
import { opensNewTab } from './links';

interface SocialLinksProps {
  links?: SocialLink[];
  /** "pill": bordered chips (menus). "plain": text links (footer lists). */
  variant?: 'pill' | 'plain';
  className?: string;
}

const variants = {
  pill: 'h-11 gap-2 rounded-full border border-line bg-contrast/[0.02] px-4 text-sm text-fg-muted hover:border-line-strong hover:text-fg',
  plain: 'min-h-11 gap-2.5 text-sm text-fg-muted hover:text-fg',
} as const;

/** The profile's social links. Renders nothing when there are none. */
export function SocialLinks({ links = profileData.socials, variant = 'pill', className }: SocialLinksProps) {
  if (links.length === 0) return null;
  return (
    <ul className={cn(variant === 'pill' ? 'flex flex-wrap gap-2' : 'flex flex-col', className)}>
      {links.map((link) => {
        const newTab = opensNewTab(link.href);
        return (
          <li key={link.href}>
            <a
              href={link.href}
              className={cn('group inline-flex items-center transition-colors duration-200', variants[variant])}
              {...(newTab ? { target: '_blank', rel: 'me noopener noreferrer' } : {})}
            >
              <SocialIcon kind={link.kind} className="h-4 w-4 shrink-0" />
              <span>{link.label}</span>
              {newTab && (
                <>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
                    aria-hidden="true"
                  />
                  <span className="sr-only"> (opens in a new tab)</span>
                </>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
