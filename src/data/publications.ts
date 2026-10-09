import type { Publication } from '~/types';

/** Filter badges, in display order. */
export const PUBLICATION_TAGS = ['Optics', 'Hardware', 'Edge AI', 'System Design', 'Career'] as const;

/** Publications-page header text. The headline numbers live in `metrics.ts`. */
export const PUBLICATION_METRICS = {
  breakdown: '13 journal articles, 8 refereed proceedings, 28 conference presentations',
  scholarUrl: 'https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1',
};

/**
 * Seeded with the three patents from the owner's résumé — the only entries
 * with verifiable identifiers. Add journal and conference papers as they are
 * confirmed; until then the Google Scholar link is the authoritative list.
 */
export const PUBLICATIONS: Publication[] = [
  {
    title: 'Cylindrical Retroreflector Array for Rotation Tracking',
    authors: ['Peng Zhao'],
    year: 2023,
    type: 'patent',
    patentNumber: 'US 2023/0086536 A1',
    status: 'Issued',
    tags: ['Optics', 'Hardware'],
    abstract:
      'A cylindrical retroreflector array that returns incident light along the axis of rotation, enabling rotational position tracking in a compact optical package.',
  },
  {
    title: 'Optical Sensing of Translational and Rotational Shaft Movements',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'US 63/541,246',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'System Design'],
    abstract:
      'An optical architecture that resolves both translational and rotational movement of a shaft from a single sensing path.',
  },
  {
    title: 'Single Photon Avalanche Diodes for Rotational and Translational Input Detection',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'US 18/892,374',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'Edge AI'],
    abstract: 'Applying single-photon avalanche diode arrays to joint rotational and translational input detection.',
  },
];

export const featuredPublications = PUBLICATIONS.filter((p) => p.featured);

/** Every tag actually present in the data, in canonical order. */
export const usedTags = PUBLICATION_TAGS.filter((tag) => PUBLICATIONS.some((p) => p.tags.includes(tag)));
