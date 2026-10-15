import type { ImageMetadata } from 'astro';

import smartDetThumb from '~/assets/images/toolbox/webcam-smartdet.webp';

/**
 * Toolbox entries — one tile per public GitHub repository.
 *
 * An entry is rendered only when `href` points at a real repository under the
 * owner's GitHub account — never an invented or placeholder URL. `/toolbox`
 * fails the build on a violating entry, and `scripts/verify-build.mjs`
 * re-checks the rendered tiles against the same rules.
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
  /**
   * The project's own write-up, when it has one. Only the repo's own GitHub
   * Pages URL is accepted (`isOwnerShowcaseHref`), so a tile can never point
   * at another project's page.
   */
  showcase?: string;
  /** Card thumbnail, imported from `src/assets/images/toolbox/`. */
  image?: ImageMetadata;
  /** Required with `image`: the thumbnail is content, not decoration. */
  imageAlt?: string;
  category: ToolboxCategoryId;
  /** Tech-stack badges on the tile. */
  stack?: string[];
  /** Highlighted on the home page. Featured entries must carry a thumbnail. */
  featured?: boolean;
}

export const TOOLBOX_CATEGORIES: ToolboxCategory[] = [
  { id: 'optics', label: 'Optics', blurb: 'Design, simulation, and metrology tools for optical systems.' },
  { id: 'ai', label: 'AI', blurb: 'Imaging pipelines and edge inference where models meet hardware.' },
];

export const TOOLBOX: ToolboxEntry[] = [
  {
    title: 'Webcam Smart Detection',
    summary:
      'Real-time webcam detection: YOLO objects and OpenCV faces in the same frame, both publishing an identical result so the render loop never learns which detector drew a box.',
    href: 'https://github.com/pengzhao-ai/webcam-smartDet',
    showcase: 'https://pengzhao-ai.github.io/webcam-smartDet/',
    image: smartDetThumb,
    imageAlt:
      'A detection frame from the pipeline: green boxes labelled “person: 0.84” and “person: 0.82” drawn over two people on a stadium touchline.',
    category: 'ai',
    stack: ['Python', 'YOLOv8', 'OpenCV'],
    featured: true,
  },
];

export const GITHUB_PROFILE = 'https://github.com/pengzhao-ai';

/** Entries must point at a real repository under the owner's account. */
export const isGitHubRepoHref = (href: string): boolean =>
  /^https:\/\/github\.com\/pengzhao-ai\/[A-Za-z0-9._-]+\/?$/.test(href);

/** The repo name a GitHub URL points at, e.g. `webcam-smartDet`. */
export const repoNameOf = (repoHref: string): string => repoHref.replace(/\/+$/, '').split('/').pop() ?? '';

/**
 * A write-up link is accepted only when it is the repository's own GitHub
 * Pages page — `/toolbox` derives nothing and guesses nothing.
 */
export const isOwnerShowcaseHref = (showcase: string, repoHref: string): boolean =>
  showcase === `https://pengzhao-ai.github.io/${repoNameOf(repoHref)}/`;
