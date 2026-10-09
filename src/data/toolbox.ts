/**
 * Toolbox entries — one tile per public GitHub repository.
 *
 * Structure only for now (owner decision, 2026-10-09): the categories exist
 * and the owner adds entries as each repo becomes presentable. An entry is
 * rendered only when `href` points at a real repository under the owner's
 * GitHub account — never an invented or placeholder URL. `/toolbox` fails
 * the build on a violating entry.
 */

export type ToolboxCategoryId = 'optics' | 'ai';

export interface ToolboxCategory {
  id: ToolboxCategoryId;
  label: string;
  blurb: string;
}

export interface ToolboxEntry {
  title: string;
  summary: string;
  /** Public repo URL under GITHUB_PROFILE, e.g. `https://github.com/pengzhao-ai/<repo>`. */
  href: string;
  category: ToolboxCategoryId;
  /** Tech-stack badges on the tile. */
  stack?: string[];
}

export const TOOLBOX_CATEGORIES: ToolboxCategory[] = [
  { id: 'optics', label: 'Optics', blurb: 'Design, simulation, and metrology tools for optical systems.' },
  { id: 'ai', label: 'AI', blurb: 'Imaging pipelines and edge inference where models meet hardware.' },
];

/** Empty until the owner publishes the first repo; /toolbox shows an
 *  explicit coming-soon state rather than sample content. Example entry:
 *
 *    {
 *      title: 'Ray tracer',
 *      summary: 'One paragraph on what it does and why it exists.',
 *      href: 'https://github.com/pengzhao-ai/ray-tracer',
 *      category: 'optics',
 *      stack: ['Python'],
 *    },
 */
export const TOOLBOX: ToolboxEntry[] = [];

export const GITHUB_PROFILE = 'https://github.com/pengzhao-ai';

/** Entries must point at a real repository under the owner's account. */
export const isGitHubRepoHref = (href: string): boolean =>
  /^https:\/\/github\.com\/pengzhao-ai\/[A-Za-z0-9._-]+\/?$/.test(href);
