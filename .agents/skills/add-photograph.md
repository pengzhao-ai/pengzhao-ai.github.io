# Add a Photograph

## Steps

1. Put the original in `artifacts/photography/<category>/` (any case of `.JPG`/`.jpeg`/`.png`).
2. Run `npm run prepare:assets` — downscales to 2560 px and strips EXIF/GPS.
3. The optimized file lands in `src/assets/images/photography/<category>/` and is committed.
4. Run `npm run build`.

## Categories

`landscape`, `wildlife`, `portrait`, `macro`, `streets`. The source folder
`protrait` is aliased to `portrait` by the script; the alias map is
`CATEGORY_ALIASES` in `scripts/prepare-assets.mjs`.

**A new category folder works without any code change.** It renders with a
humanised heading, sorted after the known categories (see `CATEGORY_ORDER` in
`src/data/photography.ts`). Add it to `CATEGORY_LABELS` and `CATEGORY_ORDER`
there to control its label and position.

## Adding a caption or better alt text

Add an entry to `PHOTO_OVERRIDES` in `src/data/photography.ts`, keyed by the
**output** filename:

```ts
export const PHOTO_OVERRIDES: Record<string, PhotoOverride> = {
  'img-2535.jpg': {
    title: 'Dawn over the ridge',
    location: 'Big Sur, CA',
    alt: 'Low fog filling a coastal valley at sunrise',
    weight: 10,
  },
};
```

Without an override, a photograph still renders — it uses the filename for its
alt text. Overrides only add what a filename cannot express.

## Never commit an unprocessed original

Camera originals carry GPS coordinates and run to tens of megabytes. The
`.gitignore` blocks them under `artifacts/`, and the optimized copies under
`src/assets/images/` are what the site serves. Do not add `artifacts/` binaries
with `git add -f`.
