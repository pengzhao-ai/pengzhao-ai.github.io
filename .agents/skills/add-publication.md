# Add a Publication

## Steps

1. Open `src/data/publications.ts`.
2. Append an object to `PUBLICATIONS`.
3. Run `npm run check && npm run build`.

## Shape

```ts
{
  title: 'Exact paper title',
  authors: ['Peng Zhao', 'Co Author'],
  venue: 'Optics Express',        // journal or conference name
  year: 2024,
  type: 'journal',                // 'journal' | 'conference' | 'patent'
  tags: [],                       // optional — rendered as chips on the entry
  doi: '10.1364/OE.123456',       // optional — renders a DOI link
  pdf: 'https://…',               // optional
  code: 'https://github.com/…',   // optional
  abstract: 'One paragraph.',     // optional — behind an expander
  featured: true,                 // optional — surfaces on the home page
}
```

## Rules

- Titles and author lists must be copied verbatim from a public source
  (Google Scholar, the publisher page). Never paraphrase or invent an entry.
- `tags` render as chips on the entry; the filter bar was removed, so tags are
  display-only.
- `doi` may be a bare DOI or a full `https://doi.org/…` URL — both render correctly.
- Omit `pdf` and `code` entirely rather than passing an empty string.
- Setting `featured: true` on at least one entry makes the "Selected papers and
  patents" section appear on the home page. With none featured, the section is hidden.
