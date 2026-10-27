import type { SkillGroup } from '@/types';
import { profileData } from '@/data/profile';
import { cn } from '@/lib/cn';

interface SkillGroupsProps {
  groups?: SkillGroup[];
  headingLevel?: 'h3' | 'h4';
  className?: string;
}

/** Skill groups as clean grouped lists. Renders nothing when there are none. */
export function SkillGroups({ groups = profileData.skillGroups, headingLevel: Heading = 'h3', className }: SkillGroupsProps) {
  if (groups.length === 0) return null;
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {groups.map((group) => (
        <div
          key={group.category}
          className="rounded-card border border-line bg-ink-900/50 p-6 sm:p-7 sm:last:odd:col-span-2 lg:last:odd:col-span-1"
        >
          <Heading className="text-base font-semibold text-fg">{group.category}</Heading>
          <ul className="mt-4 space-y-2.5">
            {group.items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] leading-snug text-fg-muted">
                <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
