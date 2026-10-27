import type { NavItem } from '@/types';
import { paths } from '@/lib/routes';

export const navItems: NavItem[] = [
  { label: 'Home', path: paths.home, description: 'The interactive 3D district, or the classic overview' },
  { label: 'Engineering', path: paths.engineering, description: 'Software, ML, vision and research projects' },
  { label: 'Creative', path: paths.creative, description: 'Photography, video, motion and design' },
  { label: 'About', path: paths.about, description: 'Background, skills and interests' },
  { label: 'Resume', path: paths.resume, description: 'Skills and selected projects on one page' },
  { label: 'Contact', path: paths.contact, description: 'Ways to get in touch' },
];
