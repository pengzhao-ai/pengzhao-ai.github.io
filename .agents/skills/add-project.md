# Add a Project

## Steps

1. Create `src/content/projects/<kebab-case-name>.mdx`.
2. Fill in the frontmatter (validated by the `project` collection schema in `src/content.config.ts`).
3. Write the case study as the body.
4. Run `npm run check && npm run build`.

## Frontmatter

```yaml
---
title: 'Project title' # required
summary: 'One or two sentences.' # required, used on the card and as the meta description
year: 2024 # required
role: 'Optical Design' # optional
status: 'shipped' # optional: shipped | in-progress | research
stack: ['Optics', 'NIR'] # tech-stack badges
components: ['Lens stack', 'ASIC'] # hardware parts list, rendered in mono
repo: 'https://github.com/…' # optional, must be a valid URL
demo: 'https://…' # optional, must be a valid URL
image: '~/assets/images/…' # optional card image
imageAlt: 'What the image shows'
featured: true # show on the home page
weight: 10 # sort order, higher first
---
```

## Rules

- The filename becomes the URL: `src/content/projects/foo-bar.mdx` → `/projects/foo-bar`.
- Omit `repo` and `demo` entirely rather than leaving them empty — the schema rejects `''` as a URL.
- `components` renders as a mono spec list, which is the point of this site's
  project cards. Include the real parts where they are public knowledge.
- Write only at the level of detail already public in the owner's résumé. No
  employer-internal measurements, yields, or unreleased products.
