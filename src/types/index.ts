// Shared content contracts. Data files in src/data/ implement these; pages,
// galleries and the 3D world only read them. Changes here are owned by the
// lead architect — see docs/ARCHITECTURE.md.

export type Discipline = 'engineering' | 'creative';

export type EngineeringCategory = 'software' | 'ml' | 'cv' | 'dsa' | 'research';

export type CreativeCategory =
  | 'photography'
  | 'editing'
  | 'video'
  | 'motion'
  | 'ui-ux'
  | 'graphic-design';

export type ProjectCategory = EngineeringCategory | CreativeCategory;

export type ProjectStatus =
  | 'shipped'
  | 'prototype'
  | 'in-progress'
  | 'research'
  | 'coursework'
  | 'competition'
  | 'archived';

export type LinkKind =
  | 'github'
  | 'demo'
  | 'video'
  | 'figma'
  | 'behance'
  | 'dribbble'
  | 'instagram'
  | 'article'
  | 'paper'
  | 'other';

export interface ProjectLink {
  label: string;
  /** Absolute https URL or a site-relative path. Never a guessed URL. */
  href: string;
  kind: LinkKind;
}

export interface MediaItem {
  kind: 'image' | 'video' | 'embed';
  /** Path under /public (e.g. "/creative/street-01.webp") or an absolute URL. */
  src: string;
  /** Descriptive alternative text. Required for every image. */
  alt: string;
  /** Poster frame for videos. */
  poster?: string;
  /** Intrinsic dimensions, used to reserve space and avoid layout shift. */
  width?: number;
  height?: number;
  caption?: string;
  /** True when this is a stand-in, not the person's real work. */
  placeholder?: boolean;
}

export interface PipelineStep {
  label: string;
  detail?: string;
}

export interface StackGroup {
  group: string;
  items: string[];
}

interface ProjectBase {
  /** URL-safe, unique across all projects. */
  slug: string;
  discipline: Discipline;
  title: string;
  /** One line shown under the title. */
  tagline: string;
  /** One to three sentences used on cards and in the 3D world panels. */
  summary: string;
  /** Only when verified (e.g. "2025" or "2024 – 2025"). */
  year?: string;
  status?: ProjectStatus;
  /** Featured projects appear in the 3D world and on the overview page. */
  featured?: boolean;
  /** Lower numbers sort first. */
  order?: number;
  /** Tools and technologies, shortest useful names ("PyTorch", "FastAPI"). */
  tags: string[];
  /** Real imagery. When absent a deterministic generative cover is drawn. */
  cover?: MediaItem;
  gallery?: MediaItem[];
  /** Only verified destinations. */
  links?: ProjectLink[];
  /** True when the whole entry is a stand-in awaiting real content. */
  placeholder?: boolean;
  /** Where the facts came from or what is still unverified. Shown subtly. */
  sourceNote?: string;
}

export interface EngineeringProject extends ProjectBase {
  discipline: 'engineering';
  category: EngineeringCategory;
  /** Two to four sentences. */
  overview: string;
  problem?: string;
  /** Personal contribution — only when stated by the person or their docs. */
  contribution?: string[];
  approach?: string[];
  /** Rendered as an architecture / pipeline diagram. */
  pipeline?: PipelineStep[];
  stack?: StackGroup[];
  /** Verified outcomes only. Never estimated. */
  results?: string[];
  /** Written by the person. Leave empty rather than inventing reflections. */
  learnings?: string[];
  role?: string;
  team?: string;
}

export interface CreativeProject extends ProjectBase {
  discipline: 'creative';
  category: CreativeCategory;
  medium: 'image' | 'video' | 'design';
  aspect?: 'landscape' | 'portrait' | 'square';
  /** Brief, intent or story behind the piece. */
  context?: string;
  tools?: string[];
  client?: string;
}

export type Project = EngineeringProject | CreativeProject;

export interface CategoryMeta<C extends ProjectCategory = ProjectCategory> {
  id: C;
  discipline: Discipline;
  label: string;
  shortLabel: string;
  description: string;
}

export interface NavItem {
  label: string;
  path: string;
  /** Short description used in the mobile menu and command lists. */
  description?: string;
}

export interface SocialLink {
  label: string;
  href: string;
  kind: 'github' | 'linkedin' | 'email' | 'instagram' | 'behance' | 'dribbble' | 'x' | 'other';
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  period: string;
  grade?: string;
  highlights?: string[];
}

export interface Experience {
  role: string;
  organisation: string;
  period: string;
  location?: string;
  description: string;
  highlights: string[];
  technologies: string[];
}

export interface LeadershipExperience {
  role: string;
  organisation: string;
  description: string;
}

export type ResumeTrackId = 'sde' | 'ml-cv' | 'data-product' | 'creative';

export interface ResumeTrack {
  id: ResumeTrackId;
  /** e.g. "Software Engineering". */
  label: string;
  /** Short label for compact selectors, e.g. "SDE". */
  shortLabel: string;
  /** One line describing the roles this résumé targets. */
  focus: string;
  /** Replaces the profile title under the name on this résumé. */
  headline?: string;
  /** Replaces the profile bio on this résumé. */
  summary?: string[];
  /** Site-relative URL of the PDF under public/. Empty when no PDF exists yet. */
  pdfUrl: string;
  /** Skill-group categories (from ProfileData.skillGroups) to show, in order. */
  skillCategories: string[];
  /** Engineering project slugs to list as selected projects, in order. */
  projectSlugs: string[];
}

export interface ProfileData {
  name: string;
  /** e.g. "Software engineer & visual creator". */
  title: string;
  tagline: string;
  bio: string[];
  location?: string;
  /** Short status line, e.g. "Computer Science & Engineering student". */
  status: string;
  socials: SocialLink[];
  /** Role-specific résumés, shown as options on /resume. The first is the default. */
  resumes: ResumeTrack[];
  skillGroups: SkillGroup[];
  education: Education[];
  experience: Experience[];
  interests: string[];
  achievements?: string[];
  leadership?: LeadershipExperience[];
}
