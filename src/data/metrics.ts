export interface Metric {
  value: string;
  label: string;
}

/**
 * Headline figures, matching the Google Scholar profile snapshot of
 * 2026-10-09 (citations, h-index) and the publications list (papers,
 * patents — see `src/data/publications.ts`). Consumed by /publications
 * and /cv; the home page deliberately does not carry a metrics strip.
 */
export const HEADLINE_METRICS: Metric[] = [
  { value: '25+', label: 'peer-reviewed papers' },
  { value: '861', label: 'citations' },
  { value: '14', label: 'h-index' },
  { value: '3', label: 'patents' },
];
