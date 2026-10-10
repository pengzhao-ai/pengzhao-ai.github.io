import type { Publication } from '~/types';

/**
 * Publications-page text. `summary` and `citations` are verbatim from the
 * owner's résumé (Publications section: "13 Journals, 8 Refereed Proceedings,
 * and 28 Conference Presentations. Google Scholar (Link): Total Citations:
 * 750+ (as of 2025.4); h-index: 11").
 */
export const PUBLICATION_METRICS = {
  scholarUrl: 'https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1',
  summary: '13 Journals, 8 Refereed Proceedings, and 28 Conference Presentations.',
  citations: 'Total Citations: 750+ (as of 2025.4); h-index: 11',
};

/**
 * The itemized record: the owner's patents, verbatim from the résumé's
 * Patents section (the doubled opening quote in the résumé's third entry and
 * the missing closing quote are normalized; the wording is unchanged).
 *
 * The earlier Google-Scholar-scraped article list was removed — the owner
 * reviewed it and found it inaccurate ("the list … is not accurate, just use
 * my résumé included words exactly"). The résumé itemizes only the patents;
 * the journal/proceedings record lives in `PUBLICATION_METRICS.summary` and
 * on the Scholar profile. Do not re-add article entries without an accurate
 * source: the site must not publish invented or mis-attributed publications.
 */
const PATENT_PUBLICATIONS: Publication[] = [
  {
    title: 'Cylindrical Retroreflector Array for Rotation Tracking',
    authors: ['Peng Zhao'],
    year: 2023,
    type: 'patent',
    patentNumber: 'US Patent Publication No. US20230086536A1',
    status: 'Issued · Date of Publication: 03/23/2023',
    tags: ['Optics', 'Hardware'],
  },
  {
    title: 'Optical Sensing of Translational and Rotational Shaft Movements',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'US Patent Application No. US63541246',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'System Design'],
  },
  {
    title: 'Single Photon Avalanche Diodes for Rotational and Translational Input Detection',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'Application No. US18892374',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'Edge AI'],
  },
];

export const PUBLICATIONS: Publication[] = [...PATENT_PUBLICATIONS];
