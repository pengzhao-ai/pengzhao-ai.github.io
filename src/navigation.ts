import { getPermalink, getBlogPermalink } from './utils/permalinks';
import { SOCIALS } from './data/socials';

export const headerData = {
  links: [
    { text: 'Home', href: getPermalink('/') },
    { text: 'Publications', href: getPermalink('/publications') },
    { text: 'Toolbox', href: getPermalink('/toolbox') },
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
        { text: 'Toolbox', href: getPermalink('/toolbox') },
        { text: 'Photography', href: getPermalink('/photography') },
        { text: 'Blog', href: getBlogPermalink() },
        { text: 'CV', href: getPermalink('/cv') },
      ],
    },
  ],
  // Terms/Privacy pages are not shipped: the template's were placeholder demo
  // text ("Demo content", "[Company name]"). The owner adds real policies and
  // relinks them here once written.
  secondaryLinks: [],
  // Entries without a URL yet (e.g. 知乎) are placeholders on the home page,
  // not footer links.
  socialLinks: SOCIALS.flatMap((social) =>
    social.href ? [{ ariaLabel: social.label, icon: social.icon, href: social.href }] : []
  ),
  footNote: `&copy; ${new Date().getFullYear()} Peng Zhao. Built with AstroWind (MIT).`,
};
