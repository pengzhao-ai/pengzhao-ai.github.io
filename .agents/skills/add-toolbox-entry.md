# Add a Toolbox Entry

## Steps

1. Open `src/data/toolbox.ts`.
2. Append an object to `TOOLBOX`.
3. Run `npm run check && npm run build`.

## Shape

```ts
{
  title: 'Ray tracer',            // required — the repo's name, humanized
  summary: 'One or two sentences.' // required — what it does and why it exists
  href: 'https://github.com/pengzhao-ai/ray-tracer', // required — a real public repo
  category: 'optics',             // required: 'optics' | 'ai'
  stack: ['Python'],              // optional — tech-stack badges on the tile
}
```

## Rules

- `href` must point at a real repository under `https://github.com/pengzhao-ai/`.
  `/toolbox` fails the build on any other URL — never invent or guess a link.
- An entry appears on `/toolbox` under its category; the category's empty
  state disappears once it has at least one entry.
- The home page lists the two categories, not individual entries; no home-page
  edit is needed.
- Write summaries at the level of detail already public on the repo's own
  README — no employer-internal specifics.
