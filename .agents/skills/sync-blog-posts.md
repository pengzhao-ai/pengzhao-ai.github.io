# Sync Blog Posts

Turn raw drafts in `artifacts/blog/` into published posts.

## Commands

| Command                                 | Effect                                                     |
| --------------------------------------- | ---------------------------------------------------------- |
| `npm run sync:posts`                    | Preview. Writes nothing. Always run this first.            |
| `npm run sync:posts -- --write`         | Write to `src/data/post/`.                                 |
| `npm run sync:posts -- --write --force` | Also overwrite targets edited by hand since the last sync. |
| `npm run sync:posts -- --write --prune` | Also delete targets whose source was removed.              |

Exit codes: `0` success, `1` conflict, `2` malformed source frontmatter.

## What gets inferred

Anything the draft does not already declare in its own frontmatter:

| Field         | Source                                                            |
| ------------- | ----------------------------------------------------------------- |
| `title`       | First `# heading` outside a code fence, else a humanised filename |
| `publishDate` | File creation time, else now                                      |
| `excerpt`     | First real paragraph, markdown stripped, ≤ 155 characters         |
| `tags`        | Keyword scan of the body against `TAG_KEYWORDS` in the script     |
| `category`    | The first matched tag                                             |
| `draft`       | `true` when the filename starts with `_` or contains `draft`      |
| `image`       | `<name>.jpg` beside the draft, or in a `<name>/` folder           |

Declare any of these in the draft's own frontmatter to override inference.

The output filename is the slugified title — `# Why this site exists` becomes
`why-this-site-exists.md` and is served at `/why-this-site-exists`. To choose a
different slug, set `slug:` in the draft's frontmatter.

## Changing the tags a post gets

Edit `TAG_KEYWORDS` in `scripts/sync-posts.mjs`. The vocabulary is deliberately
closed — `Optics`, `Hardware`, `Edge AI`, `System Design`, `Career` — and
anything unmatched becomes `Engineering`. After editing, run
`npm test` (the keyword matcher is covered) and re-sync.

## Conflicts

A conflict means the target changed since the script last wrote it — usually
because it was edited directly in `src/data/post/`. Choose one:

- Move the edit into `artifacts/blog/<name>.md` (correct — that is the source of truth), then re-sync.
- Run with `--force` to discard the direct edit.

Never edit `src/data/post/` by hand and expect it to survive a sync.
