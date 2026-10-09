import type { SocialLink } from '~/types';

/** Order is deliberate: code first, then scholarly, then professional, then social. */
export const SOCIALS: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/pengzhao-ai', icon: 'tabler:brand-github' },
  {
    label: 'Google Scholar',
    href: 'https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1',
    icon: 'tabler:school',
  },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/peng-zhao-nlo/', icon: 'tabler:brand-linkedin' },
  { label: 'ORCID', href: 'https://orcid.org/0000-0001-6370-4206', icon: 'tabler:atom' },
  { label: 'X', href: 'https://x.com/pengzha0', icon: 'tabler:brand-x' },
];
