export interface Metric {
  value: string;
  label: string;
}

/**
 * Headline figures, as stated on the owner's résumé.
 * Consumed by /publications, /cv, and the home page stats strip.
 */
export const HEADLINE_METRICS: Metric[] = [
  { value: '20+', label: 'peer-reviewed papers' },
  { value: '750+', label: 'citations' },
  { value: '11', label: 'h-index' },
  { value: '3', label: 'patents' },
];
