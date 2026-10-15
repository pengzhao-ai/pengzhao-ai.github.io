# Add a Toolbox Entry

## Steps

1. Put the card thumbnail in `src/assets/images/toolbox/` (webp, ≤1280 px wide, no EXIF).
2. Open `src/data/toolbox.ts`.
3. Append an object to `TOOLBOX`.
4. Run `npm run check && npm run build && npm run verify:build`.

## Shape

```ts
{
  title: 'Ray tracer',            // required — the repo's name, humanized
  summary: 'One or two sentences.' // required — what it does and why it exists
  href: 'https://github.com/pengzhao-ai/ray-tracer', // required — a real public repo
  showcase: 'https://pengzhao-ai.github.io/ray-tracer/', // optional — the repo's own write-up
  image: rayTracerThumb,          // optional — import of the thumbnail
  imageAlt: 'What the thumbnail shows.', // required with `image`
  category: 'optics',             // required: 'optics' | 'ai'
  stack: ['Python'],              // optional — tech-stack badges on the tile
  featured: true,                 // optional — highlight on the home page (needs `image`)
}
```

## Rules

- `href` must point at a real repository under `https://github.com/pengzhao-ai/`.
  `/toolbox` fails the build on any other URL — never invent or guess a link.
- `showcase` is accepted only when it is that repository's **own** GitHub Pages
  page (`https://pengzhao-ai.github.io/<repo>/`). `/toolbox` fails the build on
  anything else, and `scripts/verify-build.mjs` re-checks every rendered tile,
  so a tile can never point at another project's page. Check the page is live
  before adding it: the build cannot reach the network.
- A tile with a `showcase` opens the write-up; its footer keeps a `Source` link
  to the repo. A tile without one opens the repo.
- `featured: true` puts the entry on the home page highlight, which requires
  `image` + `imageAlt` (the build fails otherwise).
- An entry appears on `/toolbox` under its category; the category's empty
  state disappears once it has at least one entry.
- Write summaries at the level of detail already public on the repo's own
  README or write-up — no employer-internal specifics.
