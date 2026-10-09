import { getPermalink, getBlogPermalink } from './utils/permalinks';
import { SOCIALS } from './data/socials';

export const headerData = {
  links: [
    { text: 'Home', href: getPermalink('/') },
    { text: 'Publications', href: getPermalink('/publications') },
    { text: 'Projects', href: getPermalink('/projects') },
    { text: 'Photography', href: getPermalink('/photography') },
    { text: 'Blog', href: getBlogPermalink() },
    { text: 'CV', href: getPermalink('/cv') },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Explore',
      links: [
        { text: 'Publications', href: getPermalink('/publications') },
        { text: 'Projects', href: getPermalink('/projects') },
        { text: 'Photography', href: getPermalink('/photography') },
        { text: 'Blog', href: getBlogPermalink() },
        { text: 'CV', href: getPermalink('/cv') },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  // Entries without a URL yet (e.g. 知乎) are placeholders on the home page,
  // not footer links.
  socialLinks: SOCIALS.flatMap((social) =>
    social.href ? [{ ariaLabel: social.label, icon: social.icon, href: social.href }] : []
  ),
  footNote: `&copy; ${new Date().getFullYear()} Peng Zhao. Built with AstroWind (MIT).`,
};
