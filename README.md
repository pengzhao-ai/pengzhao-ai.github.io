# pengzhao-ai.github.io

Personal site for Peng Zhao — optical systems, sensing hardware, and edge AI.
Built with [AstroWind](https://github.com/arthelokyo/astrowind) (Astro v7 + Tailwind CSS v4) and deployed to
GitHub Pages.

## Running it

```sh
npm ci
npm run dev        # http://localhost:4321
```

```sh
npm run check      # astro check + ESLint + Prettier
npm test           # unit tests for the scripts in scripts/
npm run build      # production build to dist/
npm run build && npm run verify:build   # build, then assert the output invariants
```

## Adding content

Each content type has one place to put things. Nothing requires editing a page.

| To add a…   | Do this                                                          | Then                                                                        |
| ----------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Blog post   | Drop a `.md` file in `artifacts/blog/`                           | `npm run sync:posts` to preview, `npm run sync:posts -- --write` to publish |
| Project     | Add an `.mdx` file in `src/content/projects/`                    | nothing — it appears on `/projects`                                         |
| Publication | Append an object to `PUBLICATIONS` in `src/data/publications.ts` | nothing — it appears on `/publications`                                     |
| Photograph  | Drop a `.jpg` in `src/assets/images/photography/<category>/`     | `npm run prepare:assets` if it is a camera original, then rebuild           |
| CV entry    | Edit `src/data/cv.ts`                                            | nothing — `/cv` re-renders                                                  |
| Social link | Edit `src/data/socials.ts`                                       | nothing — header, footer, and home all read it                              |

`.agents/skills/` documents each workflow in more detail, in a format AI coding
assistants can follow.

## How the scripts work

Both scripts are dry-run-first and safe to re-run.

- **`scripts/sync-posts.mjs`** — reads raw Markdown from `artifacts/blog/`, infers the frontmatter AstroWind
  needs (title, date, excerpt, tags, category, draft status), and writes to `src/data/post/`. It tracks what it
  wrote in `scripts/.sync-state.json` and refuses to overwrite a file that was edited by hand since the last
  sync. `artifacts/blog/` is the source of truth; `src/data/post/` is generated.
- **`scripts/prepare-assets.mjs`** — downscales camera originals from `artifacts/` into
  `src/assets/images/` and strips all EXIF, including GPS. Originals are not tracked — a guard test enforces
  it, because `.gitignore` alone cannot untrack a file committed before the rule existed (any such file
  remains in history) — and the optimized copies are what gets committed.
- **`scripts/verify-build.mjs`** — asserts the built output has every route, carries no template identifiers,
  and leaks no personal contact details. Run after `npm run build`.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub
Pages. The repository must have **Settings → Pages → Source** set to **GitHub Actions**.

`src/config.yaml` sets `site: 'https://pengzhao-ai.github.io'` and `base: '/'`.

## Licence

Site content © Peng Zhao. Template: [AstroWind](https://github.com/arthelokyo/astrowind), MIT — see
`LICENSE.md`.
