export interface Metric {
  value: string;
  label: string;
}

/**
 * Headline figures, taken from the owner's résumé: "over 20 peer-reviewed
 * papers with 750+ citations", "Total Citations: 750+ (as of 2025.4);
 * h-index: 11", and 3 issued/filed patents. Consumed by /publications and
 * /cv; the home page deliberately does not carry a metrics strip.
 */
export const HEADLINE_METRICS: Metric[] = [
  { value: '20+', label: 'peer-reviewed papers' },
  { value: '750+', label: 'citations' },
  { value: '11', label: 'h-index' },
  { value: '3', label: 'patents' },
];
