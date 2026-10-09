# Portfolio Site Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this AstroWind clone into a working precision-deep-tech portfolio for Peng Zhao — six content routes, two content pipelines, and automated GitHub Pages deployment.

**Architecture:** AstroWind (Astro v7 + Tailwind v4) stays as the substrate. Branding is re-themed through the template's own theming seams (`CustomStyles.astro`, `astro.config.ts` fonts, `tailwind.css` tokens). Content is data-driven: typed TypeScript modules for publications and CV, an Astro content collection for projects, a folder scan for photography, and a locally-run sync script that turns raw Markdown drafts into blog posts. Two committed Node scripts (`prepare-assets`, `sync-posts`) do the heavy lifting, both tested with Node's built-in test runner.

**Tech Stack:** Astro v7, Tailwind CSS v4, TypeScript 5.9, Sharp, js-yaml, limax, Node 22 (`node:test`), GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-09-portfolio-site-design.md`

## Global Constraints

- **No new runtime dependencies.** `sharp`, `js-yaml`, and `limax` are already present. Testing uses Node 22's built-in `node:test` — no test framework is installed.
- **Node >= 22.22.3** (`package.json` `engines`). `.nvmrc` contains `22`.
- **All internal links go through `src/utils/permalinks.ts`** (`getPermalink`, `getBlogPermalink`, `getAsset`). Never hand-write a root-relative href. Values already produced by Astro (`page.url.prev/next`, `Astro.url.pathname`, `import.meta.env.BASE_URL`) must **not** be passed back through `getPermalink` — that double-prefixes.
- **Site config values:** `site: 'https://pengzhao-ai.github.io'`, `base: '/'`, `trailingSlash: false`, `name: 'Peng Zhao'`.
- **`Image.astro` requires an explicit `alt`** — it throws at build time if `alt` is `undefined` or `null`. Pass `alt=""` for decorative images.
- **Every `<Image>` gets `widths`, `sizes`, `width`, `height`, and `format="webp"`.** Omitting `width`/`height` causes layout shift.
- **Components use `class:list` for conditional classes and `twMerge()` when accepting `className` overrides**, matching the template.
- **Props interfaces are added to `src/types.d.ts`**, not declared inline, matching the template's convention.
- **All EXIF (including GPS) is stripped from every committed image.** This repository is public.
- **The published résumé PDF must remain byte-identical to `artifacts/Peng Zhao Resume - 02062026.pdf`.** No phone number appears anywhere in rendered HTML.
- **Seed content is limited to facts already public in the owner's résumé.** No employer-internal specifics, performance figures, or unreleased product details.
- **Post URLs are `/<slug>`**, not `/blog/<slug>` — this is AstroWind's default `apps.blog.post.permalink` and is kept deliberately.
- **Run `npm run check` before every commit.** It runs `astro check` + ESLint + Prettier; the repo is already Prettier-clean and must stay that way (`npm run fix` auto-fixes).
- **Prettier config** (`.prettierrc.mjs`) governs formatting: single quotes, print width 120, `prettier-plugin-astro` for `.astro` files. Write code in that style or run `npm run fix`.

## Review Focus

These are the input classes and failure modes the spec implies but whose tests no single task obviously owns. Each line names the behaviour a reasonable person would expect, and the task that pins it with a test.

1. **A blog draft whose first `#` heading is inside a fenced code block.** Expect: the code block's comment is *not* taken as the post title; the real H1 (or the filename) wins. → Task 4.
2. **A photograph dropped in a category folder the site has never seen.** Expect: it appears on `/photography` under a humanised heading; it is not silently dropped and does not break the build. → Task 7.
3. **A publication with no DOI, no PDF, and no code link.** Expect: the row renders with the links it has and does not emit empty `<a href="">` elements or a broken layout. → Task 5.
4. **A hand-edited synced post.** Expect: the sync script reports a conflict and refuses to overwrite rather than silently discarding the edit. → Task 4.
5. **JavaScript disabled on `/publications`.** Expect: every publication is visible and readable; filters are an enhancement, not a gate. → Task 5.

---

### Task 1: Prune template demo content

Remove AstroWind's demo surface so the build output contains only the owner's site, and establish a green build to build on.

**Files:**
- Delete: `src/pages/homes/`, `src/pages/landing/`, `src/pages/services.astro`, `src/pages/pricing.astro`, `src/pages/about.astro`, `src/pages/contact.astro`, `src/data/post/`, `public/decapcms/`, `netlify.toml`, `vercel.json`, `wrangler.jsonc`
- Modify: `src/pages/index.astro`, `src/navigation.ts`, `.gitignore`, `package.json`
- Create: `src/data/post/.gitkeep` (the blog collection's `base` directory must exist)

**Interfaces:**
- Consumes: nothing.
- Produces: an empty `src/data/post/` collection directory; `npm run build` green with a one-page site.

- [ ] **Step 1: Install dependencies**

```bash
npm ci
```

Expected: completes without error. `node_modules/` appears.

- [ ] **Step 2: Delete the demo content**

```bash
rm -rf src/pages/homes src/pages/landing public/decapcms
rm -f src/pages/services.astro src/pages/pricing.astro src/pages/about.astro src/pages/contact.astro
rm -f netlify.toml vercel.json wrangler.jsonc
rm -rf src/data/post
mkdir -p src/data/post
touch src/data/post/.gitkeep
```

- [ ] **Step 3: Verify the deletions landed**

```bash
ls src/pages/
```

Expected output lists exactly: `404.astro  [...blog]  index.astro  privacy.md  rss.xml.ts  terms.md`.
If `homes`, `landing`, `services.astro`, `pricing.astro`, `about.astro`, or `contact.astro` still appear, re-run step 2.

- [ ] **Step 4: Replace the demo home page with a build-safe placeholder**

`src/pages/index.astro` references the deleted demo posts via `BlogHighlightedPosts` and would break the build. Replace its entire contents with:

```astro
---
import Layout from '~/layouts/PageLayout.astro';
import Hero from '~/components/widgets/Hero.astro';

const metadata = {
  title: 'Peng Zhao',
  ignoreTitleTemplate: true,
};
---

<Layout metadata={metadata}>
  <Hero
    tagline="Optical Systems & Edge AI"
    title="Peng Zhao"
    subtitle="Camera and optical systems engineer. Site under construction."
  />
</Layout>
```

- [ ] **Step 5: Replace the navigation with a minimal stub**

The demo nav links to pages that no longer exist. Replace the whole of `src/navigation.ts` with:

```ts
import { getPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    { text: 'Home', href: getPermalink('/') },
    { text: 'Blog', href: getPermalink('/blog') },
  ],
  actions: [],
};

export const footerData = {
  links: [],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [{ ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') }],
  footNote: `&copy; ${new Date().getFullYear()} Peng Zhao.`,
};
```

Task 9 replaces this with the real navigation. The stub exists only so the build stays green in between.

- [ ] **Step 6: Add gitignore rules for binary artifacts**

Append to `.gitignore`:

```gitignore

# Large binary source artifacts. Optimized web copies are committed under
# src/assets/images/ instead; see scripts/prepare-assets.mjs.
artifacts/**/*.JPG
artifacts/**/*.jpg
artifacts/**/*.jpeg
artifacts/**/*.png
artifacts/**/*.pdf
artifacts/**/*.docx
artifacts/**/*.rtf
artifacts/**/*.pptx
```

`artifacts/blog/`, `artifacts/resume.md`, and `artifacts/socials.md` stay tracked — text sources are versioned so drafts cannot be lost. Only binaries are excluded.

- [ ] **Step 7: Add the script and test npm scripts**

In `package.json`, add these entries to the `scripts` block, after `"fix:prettier"`:

```json
    "test": "node --test scripts/tests/",
    "prepare:assets": "node scripts/prepare-assets.mjs",
    "sync:posts": "node scripts/sync-posts.mjs",
    "verify:build": "node scripts/verify-build.mjs"
```

Note the trailing comma on the preceding line. The `scripts/tests/` directory does not exist yet; `npm test` is added now so later tasks can run it.

- [ ] **Step 8: Verify the build is green**

```bash
npm run build
```

Expected: `astro build` completes and reports a page count. No errors mentioning missing modules or unresolved images.

- [ ] **Step 9: Verify no demo routes survive in the output**

```bash
test ! -e dist/homes && test ! -e dist/landing && test ! -e dist/services && test ! -e dist/pricing && test ! -e dist/about && test ! -e dist/contact && echo "OK: demo routes gone"
```

Expected: `OK: demo routes gone`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: prune AstroWind demo content

Remove demo pages, posts, and non-target deploy configs. Add gitignore
rules keeping large binary artifacts out of history while versioning
text sources."
```

---

### Task 2: Asset pipeline

Downscale and de-EXIF the owner's photographs and profile picture into committable web copies, and generate the Open Graph card. Without this, the originals (129 MB, one file 20 MB) cannot enter the repository.

**Files:**
- Create: `scripts/prepare-assets.mjs`, `scripts/tests/prepare-assets.test.mjs`, `src/assets/favicons/favicon.svg`
- Overwritten: `src/assets/favicons/apple-touch-icon.png` (the template's binary, replaced by the generated one)
- Generated (committed): `src/assets/images/profile.jpg`, `src/assets/images/photography/<category>/<name>.jpg`, `src/assets/images/og-default.jpg`, `src/assets/favicons/apple-touch-icon.png`

**Interfaces:**
- Consumes: `artifacts/Profile.jpg`, `artifacts/photography/<category>/*.JPG`
- Produces:
  - `normalizeCategory(dir: string): string` — maps `protrait` → `portrait`
  - `slugifyName(name: string): string` — lowercase kebab-case basename
  - `optimizeImage(src: string, dest: string, opts: { maxEdge: number; quality: number }): Promise<{ before: number; after: number }>`
  - `buildOgImage(dest: string): Promise<void>`
  - `buildTouchIcon(svgPath: string, dest: string): Promise<void>`
  - `main(): Promise<void>` — CLI entry, idempotent by content hash

- [ ] **Step 1: Write the failing tests**

Create `scripts/tests/prepare-assets.test.mjs`:

```js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import sharp from 'sharp';

import { normalizeCategory, optimizeImage, slugifyName } from '../prepare-assets.mjs';

const hashFile = async (p) => createHash('sha256').update(await readFile(p)).digest('hex');

describe('normalizeCategory', () => {
  test('maps the misspelled source folder to its canonical name', () => {
    assert.equal(normalizeCategory('protrait'), 'portrait');
  });

  test('passes known categories through unchanged', () => {
    for (const c of ['landscape', 'wildlife', 'macro', 'streets']) {
      assert.equal(normalizeCategory(c), c);
    }
  });

  test('passes an unknown category through rather than dropping it', () => {
    assert.equal(normalizeCategory('astro'), 'astro');
  });
});

describe('slugifyName', () => {
  test('lowercases and kebab-cases', () => {
    assert.equal(slugifyName('IMG_7787 Edited.jpg'), 'img-7787-edited');
  });

  test('strips punctuation and trims separators', () => {
    assert.equal(slugifyName('--A B__C--.JPG'), 'a-b-c');
  });
});

describe('optimizeImage', () => {
  let dir;
  let rotatedSrc;

  before(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'prepare-assets-'));

    // A 200x100 source carrying EXIF orientation 6 ("rotate 90 CW").
    // This lets one fixture prove both behaviours: orientation must be
    // applied to the pixels, and the EXIF block must not survive.
    rotatedSrc = path.join(dir, 'rotated.jpg');
    const base = await sharp({
      create: { width: 200, height: 100, channels: 3, background: { r: 120, g: 60, b: 30 } },
    })
      .jpeg()
      .toBuffer();
    await sharp(base).withMetadata({ orientation: 6 }).jpeg().toFile(rotatedSrc);
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('applies EXIF orientation to the pixels and strips the EXIF block', async () => {
    const dest = path.join(dir, 'out-rotated.jpg');
    await optimizeImage(rotatedSrc, dest, { maxEdge: 2560, quality: 82 });

    const meta = await sharp(dest).metadata();
    assert.equal(meta.exif, undefined, 'EXIF block must be stripped');
    assert.equal(meta.width, 100, 'orientation 6 must swap the axes');
    assert.equal(meta.height, 200);
  });

  test('caps the long edge and never enlarges a smaller image', async () => {
    const small = path.join(dir, 'small.jpg');
    const dest = path.join(dir, 'out-small.jpg');

    await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .jpeg()
      .toFile(small);

    await optimizeImage(small, dest, { maxEdge: 2560, quality: 82 });

    const meta = await sharp(dest).metadata();
    assert.equal(meta.width, 400, 'a 400px source must not be upscaled to 2560');
    assert.equal(meta.height, 300);
  });

  test('downscales an oversized image and reports the size reduction', async () => {
    const big = path.join(dir, 'big.jpg');
    const dest = path.join(dir, 'out-big.jpg');

    await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: { r: 200, g: 200, b: 200 } },
    })
      .jpeg()
      .toFile(big);

    const result = await optimizeImage(big, dest, { maxEdge: 1200, quality: 82 });

    const meta = await sharp(dest).metadata();
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 900);
    assert.ok(result.after < result.before, 'output must be smaller than input');
  });

  test('is idempotent: optimizing the same source twice yields identical bytes', async () => {
    const destA = path.join(dir, 'idem-a.jpg');
    const destB = path.join(dir, 'idem-b.jpg');

    await optimizeImage(rotatedSrc, destA, { maxEdge: 2560, quality: 82 });
    await optimizeImage(rotatedSrc, destB, { maxEdge: 2560, quality: 82 });

    assert.equal(await hashFile(destA), await hashFile(destB));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../prepare-assets.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/prepare-assets.mjs`:

```js
#!/usr/bin/env node
/**
 * Optimize large binary source artifacts into committable web copies.
 *
 * The owner's camera originals live in artifacts/ and are gitignored: they
 * total roughly 129 MB, which would permanently bloat the repository and slow
 * every deploy. This script produces downscaled, metadata-free copies under
 * src/assets/images/ which are committed instead.
 *
 * EXIF stripping is a privacy requirement, not cosmetic: camera originals
 * routinely carry GPS coordinates and this repository is public.
 *
 * Run: npm run prepare:assets
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARTIFACTS = path.join(ROOT, 'artifacts');
const OUT_IMAGES = path.join(ROOT, 'src', 'assets', 'images');

const PHOTO_MAX_EDGE = 2560;
const PHOTO_QUALITY = 82;
const PROFILE_MAX_EDGE = 1600;
const PROFILE_QUALITY = 84;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png']);

/** Source folders are named as the owner's camera exported them. */
export const CATEGORY_ALIASES = { protrait: 'portrait' };

export const normalizeCategory = (dir) => CATEGORY_ALIASES[dir] ?? dir;

export const slugifyName = (name) =>
  path
    .basename(name, path.extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const hash = (buf) => createHash('sha256').update(buf).digest('hex');

/**
 * Downscale an image and strip all metadata.
 *
 * `sharp` drops metadata unless `withMetadata()`/`keepExif()` is called, so
 * omitting them is what removes EXIF. `.rotate()` with no argument reads the
 * EXIF orientation tag and bakes the rotation into the pixels before the tag
 * is discarded — without it, portrait photos from a phone or DSLR render
 * sideways once the tag is gone.
 */
export async function optimizeImage(src, dest, { maxEdge, quality }) {
  const before = await stat(src);

  const pipeline = sharp(src, { failOn: 'none' })
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality, mozjpeg: true });

  const buf = await pipeline.toBuffer();
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);

  const after = await stat(dest);
  return { before: before.size, after: after.size };
}

/** Write a file only when its bytes would change, so reruns are cheap and stable. */
async function writeIfChanged(dest, buf) {
  await mkdir(path.dirname(dest), { recursive: true });
  try {
    const existing = await readFile(dest);
    if (hash(existing) === hash(buf)) return false;
  } catch {
    // Missing file: fall through and write.
  }
  await writeFile(dest, buf);
  return true;
}

async function* walkImages(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkImages(full);
    else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) yield full;
  }
}

export async function buildOgImage(dest) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#FAFAFC"/>
  <rect x="0" y="0" width="${OG_WIDTH}" height="6" fill="#2563EB"/>
  <text x="80" y="330" font-family="Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="#0F172A">Peng Zhao</text>
  <text x="80" y="400" font-family="monospace" font-size="34" fill="#2563EB">Optical Systems · Imaging · Edge AI</text>
  <text x="80" y="470" font-family="monospace" font-size="26" fill="#475569">pengzhao-ai.github.io</text>
</svg>`;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
}

export async function main() {
  const rows = [];

  // Profile picture
  const profileSrc = path.join(ARTIFACTS, 'Profile.jpg');
  try {
    const r = await optimizeImage(profileSrc, path.join(OUT_IMAGES, 'profile.jpg'), {
      maxEdge: PROFILE_MAX_EDGE,
      quality: PROFILE_QUALITY,
    });
    rows.push(['profile.jpg', r]);
  } catch {
    console.warn('warn: artifacts/Profile.jpg not found; skipping');
  }

  // Photography, grouped by source folder
  const photoRoot = path.join(ARTIFACTS, 'photography');
  for await (const src of walkImages(photoRoot)) {
    const category = normalizeCategory(path.basename(path.dirname(src)));
    const dest = path.join(OUT_IMAGES, 'photography', category, `${slugifyName(src)}.jpg`);
    const r = await optimizeImage(src, dest, { maxEdge: PHOTO_MAX_EDGE, quality: PHOTO_QUALITY });
    rows.push([path.relative(ROOT, dest), r]);
  }

  // Open Graph card
  await buildOgImage(path.join(OUT_IMAGES, 'og-default.jpg'));
  rows.push(['og-default.jpg', null]);

  const mb = (n) => (n / 1024 / 1024).toFixed(1);
  console.log('\nasset                                 before      after');
  console.log('-'.repeat(58));
  let totalBefore = 0;
  let totalAfter = 0;
  for (const [name, r] of rows) {
    if (!r) {
      console.log(`${name.padEnd(38)}${'(generated)'.padStart(19)}`);
      continue;
    }
    totalBefore += r.before;
    totalAfter += r.after;
    console.log(`${name.padEnd(38)}${`${mb(r.before)} MB`.padStart(11)}${`${mb(r.after)} MB`.padStart(8)}`);
  }
  console.log('-'.repeat(58));
  console.log(`${'TOTAL'.padEnd(38)}${`${mb(totalBefore)} MB`.padStart(11)}${`${mb(totalAfter)} MB`.padStart(8)}`);
  console.log(`\n${rows.length} outputs written under src/assets/images/`);
}

if (import.meta.filename === process.argv[1]) {
  await main();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS — 9 tests across 3 suites, 0 failures.

- [ ] **Step 5: Create the favicon**

Create `src/assets/favicons/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Peng Zhao">
  <rect width="64" height="64" rx="12" fill="#0F172A"/>
  <text x="32" y="43" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#FFFFFF" text-anchor="middle">PZ</text>
  <rect x="0" y="0" width="64" height="4" fill="#2563EB"/>
</svg>
```

Do **not** delete the template's `favicon.ico` or `apple-touch-icon.png` here. `src/components/Favicons.astro` imports both, and only Task 3 touches that file — deleting them in this task would leave the repo unbuildable from this commit until Task 3 lands. Task 3 performs the deletion together with the `Favicons.astro` rewrite, in one atomic commit. This task overwrites `apple-touch-icon.png` with the generated monogram in Step 6, which needs no import change.

- [ ] **Step 6: Generate the assets**

Add the touch icon to the pipeline first. This is a second, smaller TDD cycle rather than a step in the one above, because `buildTouchIcon` is new code: add the test below, watch it fail on the missing export, implement, and watch it pass.

In `scripts/prepare-assets.mjs`, export a builder alongside `buildOgImage`:

```js
/** Render a square PNG (the iOS home-screen icon) from an SVG. */
export async function buildTouchIcon(svgPath, dest) {
  await mkdir(path.dirname(dest), { recursive: true });
  await sharp(await readFile(svgPath)).resize(180, 180).png().toFile(dest);
}
```

`sharp` renders SVG through librsvg, so the monogram scales cleanly. Both paths are arguments — like `optimizeImage(src, dest, opts)` — so the test can use a fixture in a tmp directory instead of depending on `favicon.svg` existing. That matters: `favicon.svg` is authored in Step 5, after this task's TDD cycle.

Add the test, in the same style as the existing ones. It needs its own tmp directory, since the `dir` binding in `optimizeImage`'s `before` is scoped to that describe:

```js
describe('buildTouchIcon', () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'touch-icon-'));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('renders an SVG to a square 180px PNG', async () => {
    const svg = path.join(dir, 'fixture.svg');
    const dest = path.join(dir, 'touch.png');
    await writeFile(
      svg,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0F172A"/></svg>'
    );

    await buildTouchIcon(svg, dest);

    const meta = await sharp(dest).metadata();
    assert.equal(meta.width, 180);
    assert.equal(meta.height, 180);
    assert.equal(meta.format, 'png');
  });
});
```

`writeFile` must join `readFile` in the test file's `node:fs/promises` import.

Then wire it into `main()`, after the `buildOgImage` call:

```js
  // Same SVG as the favicon, so the tab icon and the home-screen icon
  // can never drift apart.
  await buildTouchIcon(
    path.join(ROOT, 'src/assets/favicons/favicon.svg'),
    path.join(ROOT, 'src/assets/favicons/apple-touch-icon.png')
  );
  rows.push(['apple-touch-icon.png', null]);
```

Then generate everything:

```bash
npm run prepare:assets
```

Expected: a table listing `profile.jpg`, nine photography files under `src/assets/images/photography/<category>/`, and `og-default.jpg`, with a TOTAL row showing a large reduction.

- [ ] **Step 7: Verify the outputs exist and are small**

```bash
find src/assets/images/photography -name '*.jpg' | wc -l
du -sh src/assets/images/photography src/assets/images/profile.jpg src/assets/images/og-default.jpg
ls -l src/assets/favicons/
```

Expected: `9` files; total well under 15 MB; `src/assets/favicons/` contains exactly `favicon.svg` and `apple-touch-icon.png` — no `.ico`.

- [ ] **Step 8: Verify no EXIF survives in any committed image**

```bash
for f in $(find src/assets/images -name '*.jpg'); do
  sips -g all "$f" 2>/dev/null | grep -qiE 'gps|exif' && echo "EXIF PRESENT: $f"
done; echo "EXIF scan complete"
```

Expected: only `EXIF scan complete`, with no `EXIF PRESENT` lines. If any appear, `optimizeImage` is not stripping metadata — fix before committing.

- [ ] **Step 9: Verify idempotence**

```bash
shasum -a 256 $(find src/assets/images -name '*.jpg') > /tmp/assets-hashes-1.txt
npm run prepare:assets > /dev/null
shasum -a 256 $(find src/assets/images -name '*.jpg') > /tmp/assets-hashes-2.txt
diff /tmp/assets-hashes-1.txt /tmp/assets-hashes-2.txt && echo "OK: idempotent"
```

Expected: `OK: idempotent`.

- [ ] **Step 10: Commit**

```bash
git add -A scripts package.json src/assets
git commit -m "feat: add asset pipeline for photos and profile image

Downscale camera originals to web copies and strip all EXIF, including
GPS, since the repository is public. Replaces the template's favicon
binaries with the owner's monogram."
```

---

### Task 3: Theme and branding

Apply the Precision Deep Tech identity through the template's existing theming seams, and remove the template author's identifiers.

**Files:**
- Modify: `src/config.yaml`, `src/components/CustomStyles.astro`, `astro.config.ts`, `src/layouts/Layout.astro:35`, `src/assets/styles/tailwind.css`, `src/components/Logo.astro`, `src/components/Favicons.astro`

**Interfaces:**
- Consumes: `src/assets/images/og-default.jpg` (Task 2), `src/assets/favicons/favicon.svg` and `apple-touch-icon.png` (Task 2)
- Produces: CSS variables `--aw-font-mono` and the Tailwind utility `font-mono`, consumed by every later component task; `SITE`/`METADATA` values consumed by `Metadata.astro`.

- [ ] **Step 1: Update the site configuration**

Replace the `site:` and `metadata:` blocks at the top of `src/config.yaml`:

```yaml
site:
  name: Peng Zhao
  site: 'https://pengzhao-ai.github.io'
  base: '/'
  trailingSlash: false

# Default SEO metadata
metadata:
  title:
    default: Peng Zhao — Optical Systems & Edge AI
    template: '%s — Peng Zhao'
  description: 'Camera and optical systems engineer building end-to-end frameworks across optics, imaging pipelines, and AI. 20+ peer-reviewed papers, 3 patents.'
  robots:
    index: true
    follow: true
  openGraph:
    site_name: Peng Zhao
    images:
      - url: '~/assets/images/og-default.jpg'
        width: 1200
        height: 630
    type: website
  twitter:
    handle: '@pengzha0'
    site: '@pengzha0'
    cardType: summary_large_image
```

The `googleSiteVerificationId` key is **deleted**, not blanked. No verification ID is invented; the owner adds their own when they register the site with Search Console.

Leave `i18n`, `apps`, `analytics`, and `ui` exactly as they are.

- [ ] **Step 2: Verify no template identifiers remain in config**

```bash
grep -n 'arthelokyo\|astrowind.vercel.app\|googleSiteVerificationId' src/config.yaml && echo "STILL PRESENT" || echo "OK: config clean"
```

Expected: `OK: config clean`.

- [ ] **Step 3: Replace the palette and font mapping**

Replace the entire contents of `src/components/CustomStyles.astro` with:

```astro
---
// Font families are provided by Astro's native Fonts API (see `fonts` in
// astro.config.ts and the <Font /> tags in Layout.astro), exposed as
// `--font-inter`, `--font-space-grotesk` and `--font-jetbrains-mono`.
---

<style is:inline>
  :root {
    --aw-font-sans: var(--font-inter);
    --aw-font-serif: var(--font-inter);
    --aw-font-heading: var(--font-space-grotesk);
    --aw-font-mono: var(--font-jetbrains-mono);

    --aw-color-primary: rgb(37 99 235);
    --aw-color-secondary: rgb(29 78 216);
    --aw-color-accent: rgb(124 58 237);

    --aw-color-text-heading: rgb(15 23 42);
    --aw-color-text-default: rgb(51 65 85);
    --aw-color-text-muted: rgb(71 85 105 / 66%);
    --aw-color-bg-page: rgb(250 250 252);

    --aw-color-bg-page-dark: rgb(8 11 18);

    ::selection {
      background-color: color-mix(in srgb, var(--aw-color-primary) 25%, transparent);
    }
  }

  .dark {
    --aw-font-sans: var(--font-inter);
    --aw-font-serif: var(--font-inter);
    --aw-font-heading: var(--font-space-grotesk);
    --aw-font-mono: var(--font-jetbrains-mono);

    --aw-color-primary: rgb(96 165 250);
    --aw-color-secondary: rgb(59 130 246);
    --aw-color-accent: rgb(167 139 250);

    --aw-color-text-heading: rgb(241 245 249);
    --aw-color-text-default: rgb(203 213 225);
    --aw-color-text-muted: rgb(148 163 184 / 80%);
    --aw-color-bg-page: rgb(8 11 18);

    ::selection {
      background-color: color-mix(in srgb, var(--aw-color-primary) 35%, transparent);
      color: rgb(241 245 249);
    }
  }
</style>
```

- [ ] **Step 4: Register the two new fonts**

In `astro.config.ts`, replace the `fonts: [...]` array with:

```ts
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: ['100 900'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Space Grotesk',
      cssVariable: '--font-space-grotesk',
      weights: ['300 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: ['100 800'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
```

- [ ] **Step 5: Verify the font weight ranges are accepted**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds. **If it fails with an error naming a weight** (e.g. `Invalid weight "300 700"`), replace that font's `weights` with discrete values and rebuild:

```ts
      weights: ['400', '500', '600', '700'],
```

This is the risk flagged in spec §11. Record which fonts needed discrete weights — the answer goes in the plan's handoff notes.

- [ ] **Step 6: Inject the new fonts into the document head**

In `src/layouts/Layout.astro`, immediately after the existing `<Font cssVariable="--font-inter" preload />` line (around line 35), add:

```astro
    <Font cssVariable="--font-space-grotesk" preload />
    <Font cssVariable="--font-jetbrains-mono" preload />
```

- [ ] **Step 7: Add the mono font token to Tailwind**

In `src/assets/styles/tailwind.css`, inside the `@theme { ... }` block, immediately after the `--font-heading:` entry, add:

```css
  --font-mono:
    var(--aw-font-mono, ui-monospace), ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
```

This makes `font-mono` a real utility. Every tag badge, spec list, and metadata label on the site uses it — it is the main carrier of the "precision instrument" feel.

- [ ] **Step 8: Replace the logo**

Replace the entire contents of `src/components/Logo.astro` with:

```astro
---
import { SITE } from 'astrowind:config';
---

<span class="self-center ml-2 rtl:ml-0 rtl:mr-2 flex items-center gap-2.5 font-heading">
  <svg
    class="h-7 w-7 shrink-0 text-primary"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.25"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9.5"></circle>
    <path d="M12 2.5 L12 12 M12 12 L21.4 8.2 M12 12 L16.6 20.6 M12 12 L7.4 20.6 M12 12 L2.6 8.2"></path>
  </svg>
  <span class="text-2xl font-bold tracking-tight whitespace-nowrap text-heading md:text-xl">{SITE.name}</span>
</span>
```

Two constraints this signature honours, both load-bearing:

- **The root is a `<span>`, not an `<a>`.** `src/components/widgets/Header.astro:91` already wraps `<Logo />` in `<a href={getHomePermalink()}>`. Making the logo a link itself yields nested anchors, which is invalid HTML and breaks the header on mobile. The import of `SITE` reads the name from `src/config.yaml`, so the wordmark stays in step with the config.
- **The `self-center ml-2 rtl:*` classes are kept** from the template's version — they position the logo inside the header's flex row, and removing them shifts it.

- [ ] **Step 9: Point the favicon links at the new assets**

First delete the template's own favicon binary, which is AstroWind's branding and would otherwise ship as the site's tab icon. The `.ico` is legacy — every browser that matters reads `favicon.svg`.

```bash
rm src/assets/favicons/favicon.ico
```

This deletion and the rewrite below must land in the same commit: `Favicons.astro` imports the file, so deleting it alone breaks the build. (`apple-touch-icon.png` was already overwritten with the generated monogram in Task 2 and stays.)

Replace the entire contents of `src/components/Favicons.astro` with:

```astro
---
import favIconSvg from '~/assets/favicons/favicon.svg';
import appleTouchIcon from '~/assets/favicons/apple-touch-icon.png';
---

<link rel="icon" type="image/svg+xml" href={favIconSvg.src} />
<link rel="mask-icon" href={favIconSvg.src} color="#2563EB" />
<link rel="apple-touch-icon" sizes="180x180" href={appleTouchIcon.src} />
```

Two changes beyond dropping the `.ico`: the `mask-icon` colour moves off the template's violet `#8D46E7` onto the cobalt `#2563EB` from the palette, and the `apple-touch-icon` now points at the generated monogram. Do the `rm` and this rewrite together — the import is what makes the deletion a build break on its own.

- [ ] **Step 10: Verify the build and type checks are green**

```bash
npm run check
npm run build
```

Expected: `astro check` reports 0 errors; ESLint and Prettier pass; build succeeds.

- [ ] **Step 11: Verify the rebrand in the built output**

```bash
grep -ril 'astrowind\|arthelokyo' dist/ | head; echo "--- text scan done ---"
ls dist/_astro/ | grep -iE 'favicon|apple' ; echo "--- icon scan done ---"
```

Expected: no filenames listed before `--- text scan done ---`, and the icon scan lists only the SVG and the PNG — no `.ico`.

The text scan cannot see binary branding, which is why the icon scan is separate. If a favicon hash matching the template's original appears, `Favicons.astro` is still importing a deleted file or the pipeline regenerated it.

Note: the AstroWind attribution that the MIT licence requires lives in `LICENSE.md` and the README, neither of which is copied into `dist/`. If a hit appears in `dist/`, it is a leftover demo asset — delete it and rebuild.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: apply precision deep tech theme and branding

Cobalt primary, slate neutrals, Space Grotesk headings, JetBrains Mono
for technical labels. Replace template logo and configuration with the
owner's identity."
```

---

### Task 4: Blog sync pipeline

Turn raw Markdown drafts in `artifacts/blog/` into posts the site renders, inferring the frontmatter AstroWind requires. Runs locally and commits its output; it must never silently destroy an edit.

**Files:**
- Create: `scripts/sync-posts.mjs`, `scripts/tests/sync-posts.test.mjs`, `artifacts/blog/welcome.md`, `scripts/.sync-state.json` (generated), `.agents/skills/sync-blog-posts.md`
- Generated (committed): `src/data/post/welcome.md`

**Interfaces:**
- Consumes: nothing from earlier tasks (runs standalone).
- Produces:
  - `parseSource(raw: string): { frontmatter: object; body: string }`
  - `maskFences(text: string): string`
  - `stripInline(s: string): string`
  - `deriveTitle(body: string, filename: string): { title: string; body: string }`
  - `deriveExcerpt(body: string, max?: number): string`
  - `deriveTags(text: string): string[]`
  - `decideDraft(filename: string): boolean`
  - `humanize(filename: string): string`
  - `classify(state: { targetExists: boolean; recordedTargetHash?: string; currentTargetHash?: string; sourceChanged: boolean; force: boolean }): 'create' | 'update' | 'skip' | 'conflict'`
  - `renderPost(post: object): string`
  - `planSync(opts): Promise<Array<{ slug, action, source, target, content }>>`

- [ ] **Step 1: Write the failing tests**

Create `scripts/tests/sync-posts.test.mjs`:

```js
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  classify,
  decideDraft,
  deriveExcerpt,
  deriveTags,
  deriveTitle,
  humanize,
  maskFences,
  parseSource,
  renderPost,
  stripInline,
} from '../sync-posts.mjs';

describe('parseSource', () => {
  test('splits frontmatter from body', () => {
    const { frontmatter, body } = parseSource('---\ntitle: Hello\n---\n\nBody text.\n');
    assert.equal(frontmatter.title, 'Hello');
    assert.equal(body.trim(), 'Body text.');
  });

  test('returns an empty frontmatter object when there is none', () => {
    const { frontmatter, body } = parseSource('# Hi\n\nBody.\n');
    assert.deepEqual(frontmatter, {});
    assert.equal(body.trim(), '# Hi\n\nBody.');
  });

  test('rejects a non-mapping frontmatter block', () => {
    assert.throws(() => parseSource('---\n- just\n- a list\n---\nBody'), /mapping/i);
  });
});

describe('maskFences', () => {
  test('blanks fenced code but preserves length and line count', () => {
    const input = 'before\n```sh\n# not a title\necho hi\n```\nafter';
    const masked = maskFences(input);
    assert.equal(masked.length, input.length);
    assert.equal(masked.split('\n').length, input.split('\n').length);
    assert.ok(!masked.includes('not a title'));
  });

  test('leaves the fence delimiter lines in place', () => {
    const masked = maskFences('```\nx\n```');
    assert.ok(masked.startsWith('```'));
    assert.ok(masked.endsWith('```'));
  });
});

describe('deriveTitle', () => {
  // Review Focus #1: a "#" inside a fenced block must never become the title.
  test('ignores a # line inside a fenced code block', () => {
    const body = 'Intro paragraph.\n\n```python\n# compute the wavefront\nresult = 1\n```\n';
    const { title } = deriveTitle(body, 'wavefront-notes.md');
    assert.equal(title, 'Wavefront Notes');
  });

  test('uses a fenced block title as the title when it is the real H1', () => {
    const body = '# Real Title\n\n```sh\n# still a comment\n```\n';
    const { title } = deriveTitle(body, 'whatever.md');
    assert.equal(title, 'Real Title');
  });

  test('removes the H1 from the body it returns', () => {
    const { body } = deriveTitle('# Real Title\n\nBody text.\n', 'x.md');
    assert.ok(!body.includes('# Real Title'));
    assert.ok(body.includes('Body text.'));
  });

  test('falls back to a humanised filename when there is no H1', () => {
    const { title } = deriveTitle('Just prose.\n', 'my_cool_post.md');
    assert.equal(title, 'My Cool Post');
  });

  test('strips inline markdown from the title', () => {
    const { title } = deriveTitle('# **Bold** and `code`\n\nBody', 'x.md');
    assert.equal(title, 'Bold and code');
  });
});

describe('humanize', () => {
  test('title-cases a kebab-case filename', () => {
    assert.equal(humanize('edge-ai-on-device.md'), 'Edge Ai On Device');
  });
});

describe('stripInline', () => {
  test('unwraps links, code, emphasis, and HTML', () => {
    assert.equal(stripInline('a [link](https://x) and `code` and **bold** and <b>tag</b>'), 'a link and code and bold and tag');
  });
});

describe('deriveExcerpt', () => {
  test('takes the first real paragraph, skipping headings and lists', () => {
    const body = '# Title\n\n- a list item\n\nThis is the actual first paragraph.\n\nSecond.';
    assert.equal(deriveExcerpt(body), 'This is the actual first paragraph.');
  });

  test('never exceeds the character cap', () => {
    const body = 'word '.repeat(100);
    assert.ok(deriveExcerpt(body, 155).length <= 155);
  });

  test('truncates on a word boundary rather than mid-word', () => {
    const body = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';
    const out = deriveExcerpt(body, 25);
    assert.ok(out.length <= 25);
    assert.ok(!out.endsWith(' '));
    assert.ok(body.startsWith(out), `"${out}" must be a prefix of the source`);
  });

  test('ignores a paragraph that only exists inside a code fence', () => {
    const body = '```\nnot the excerpt\n```\n\nThe real one.';
    assert.equal(deriveExcerpt(body), 'The real one.');
  });
});

describe('deriveTags', () => {
  test('matches whole words only, so "html" does not match "ml"', () => {
    assert.deepEqual(deriveTags('We wrote some html today.'), ['Engineering']);
  });

  test('matches a standalone acronym case-insensitively', () => {
    assert.ok(deriveTags('Trained an ML model.').includes('Edge AI'));
  });

  test('returns multiple tags in vocabulary order', () => {
    const tags = deriveTags('The optical sensor module needed a calibration framework.');
    assert.deepEqual(tags, ['Optics', 'Hardware', 'System Design']);
  });

  test('falls back to Engineering when nothing matches', () => {
    assert.deepEqual(deriveTags('Nothing relevant here at all.'), ['Engineering']);
  });
});

describe('decideDraft', () => {
  test('marks an underscore-prefixed file as a draft', () => {
    assert.equal(decideDraft('_wip.md'), true);
  });

  test('marks a file containing "draft" as a draft', () => {
    assert.equal(decideDraft('my-draft-post.md'), true);
  });

  test('leaves an ordinary file publishable', () => {
    assert.equal(decideDraft('welcome.md'), false);
  });
});

describe('classify', () => {
  // Review Focus #4: a hand-edited target must never be silently clobbered.
  test('conflicts when the target was hand-edited', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: 'aaa',
        currentTargetHash: 'bbb',
        sourceChanged: true,
        force: false,
      }),
      'conflict'
    );
  });

  test('overwrites a hand-edited target when forced', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: 'aaa',
        currentTargetHash: 'bbb',
        sourceChanged: true,
        force: true,
      }),
      'update'
    );
  });

  test('skips when nothing changed', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: 'aaa',
        currentTargetHash: 'aaa',
        sourceChanged: false,
        force: false,
      }),
      'skip'
    );
  });

  test('updates when the source changed and the target is untouched', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: 'aaa',
        currentTargetHash: 'aaa',
        sourceChanged: true,
        force: false,
      }),
      'update'
    );
  });

  test('creates when the target does not exist', () => {
    assert.equal(
      classify({ targetExists: false, sourceChanged: true, force: false }),
      'create'
    );
  });

  test('treats an untracked existing target as hand-edited', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: undefined,
        currentTargetHash: 'bbb',
        sourceChanged: true,
        force: false,
      }),
      'conflict'
    );
  });
});

describe('renderPost', () => {
  test('is deterministic for identical input', () => {
    const post = {
      title: 'Hi',
      publishDate: new Date('2026-10-09T00:00:00.000Z'),
      excerpt: 'Short.',
      tags: ['Optics'],
      category: 'Optics',
      author: 'Peng Zhao',
      draft: false,
      body: 'Body.',
    };
    assert.equal(renderPost(post), renderPost(post));
  });

  test('emits frontmatter Astro can parse, with the body after it', () => {
    const out = renderPost({
      title: 'Hi',
      publishDate: new Date('2026-10-09T00:00:00.000Z'),
      excerpt: 'Short.',
      tags: ['Optics'],
      category: 'Optics',
      author: 'Peng Zhao',
      draft: false,
      body: 'Body.',
    });
    assert.ok(out.startsWith('---\n'));
    const [fm] = out.split('\n---\n');
    assert.ok(fm.includes('title: Hi'));
    assert.ok(out.endsWith('Body.\n'));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../sync-posts.mjs'`. The `prepare-assets` tests still pass.

- [ ] **Step 3: Write the implementation**

Create `scripts/sync-posts.mjs`:

```js
#!/usr/bin/env node
/**
 * Sync raw Markdown drafts from artifacts/blog/ into the site's post
 * collection at src/data/post/.
 *
 * Design constraints, in priority order:
 *
 *   1. Never lose the owner's writing. An existing target is never
 *      overwritten unless the script itself wrote the current bytes
 *      (tracked in .sync-state.json), or --force is passed.
 *   2. Never delete. A target whose source disappeared is reported as an
 *      orphan and removed only under --prune.
 *   3. Be deterministic. The same source always renders the same bytes, so
 *      re-running is a no-op and diffs stay honest.
 *
 * Run:
 *   npm run sync:posts                          preview only
 *   npm run sync:posts -- --write               write
 *   npm run sync:posts -- --write --force       overwrite hand-edited targets
 *   npm run sync:posts -- --write --prune       also delete orphaned targets
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import yaml from 'js-yaml';
import slugify from 'limax';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES_DIR = path.join(ROOT, 'artifacts', 'blog');
const TARGET_DIR = path.join(ROOT, 'src', 'data', 'post');
const STATE_FILE = path.join(ROOT, 'scripts', '.sync-state.json');
const IMAGE_DEST = path.join(ROOT, 'src', 'assets', 'images', 'posts');

export const AUTHOR = 'Peng Zhao';
export const DEFAULT_TAG = 'Engineering';
export const EXCERPT_MAX = 155;

/** Fixed vocabulary. Order matters: the first match becomes the category. */
export const TAG_KEYWORDS = {
  Optics: [
    'optics', 'optical', 'lens', 'laser', 'photonic', 'diffraction', 'polarization',
    'wavefront', 'aberration', 'coherence', 'spectrometer', 'imaging', 'sensor',
  ],
  Hardware: [
    'hardware', 'pcb', 'enclosure', 'manufacturing', 'tolerance', 'yield', 'mechanical',
    'tooling', 'validation', 'production', 'module', 'npi',
  ],
  'Edge AI': [
    'on-device', 'edge', 'inference', 'quantization', 'model', 'neural', 'ml',
    'embedded', 'npu', 'real-time',
  ],
  'System Design': [
    'architecture', 'trade-off', 'tradeoff', 'framework', 'pipeline', 'interface',
    'integration', 'spec', 'kpi', 'calibration', 'system',
  ],
  Career: [
    'career', 'interview', 'promotion', 'mentorship', 'team', 'hiring', 'transition',
    'leadership',
  ],
};

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replace the *contents* of fenced code blocks with spaces, preserving
 * length and line structure. Searching the masked text rather than the raw
 * text is what stops a shell comment (`# rebuild the container`) inside a
 * code block from being mistaken for the post's H1.
 */
export function maskFences(text) {
  const lines = text.split('\n');
  let open = null;
  return lines
    .map((line) => {
      const fence = line.match(/^\s*(`{3,}|~{3,})/);
      if (fence) {
        const marker = fence[1][0];
        if (open === null) {
          open = marker;
          return line;
        }
        if (marker === open) {
          open = null;
          return line;
        }
      }
      return open !== null ? ' '.repeat(line.length) : line;
    })
    .join('\n');
}

export function parseSource(raw) {
  const match = raw.match(FM_RE);
  if (!match) return { frontmatter: {}, body: raw.trimStart() };

  const parsed = yaml.load(match[1]) ?? {};
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('frontmatter is not a mapping');
  }
  return { frontmatter: parsed, body: raw.slice(match[0].length).trimStart() };
}

export const stripInline = (s) =>
  s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();

export const humanize = (filename) =>
  path
    .basename(filename, path.extname(filename))
    .replace(/^[_-]+/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Take the first H1 outside a code fence, and remove that line from the body. */
export function deriveTitle(body, filename) {
  const maskedLines = maskFences(body).split('\n');
  const rawLines = body.split('\n');

  for (let i = 0; i < maskedLines.length; i++) {
    const match = maskedLines[i].match(/^#\s+(.+?)\s*$/);
    if (!match) continue;
    const title = stripInline(match[1]).trim();
    const body_ = [...rawLines.slice(0, i), ...rawLines.slice(i + 1)].join('\n').trimStart();
    return { title, body: body_ };
  }
  return { title: humanize(filename), body };
}

export function truncateAtWord(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:!?]+$/, '');
}

export function deriveExcerpt(body, max = EXCERPT_MAX) {
  const masked = maskFences(body);
  for (const block of masked.split(/\n\s*\n/)) {
    const first = block.split('\n')[0].trim();
    if (!first) continue;
    if (/^(#|>|\||<|`{3,}|~{3,}|[-*+]\s|\d+\.\s)/.test(first)) continue;
    const text = stripInline(block.replace(/\s+/g, ' ')).trim();
    if (!text) continue;
    return truncateAtWord(text, max);
  }
  return '';
}

export function deriveTags(text) {
  const hits = [];
  for (const [tag, words] of Object.entries(TAG_KEYWORDS)) {
    const matched = words.some((word) => new RegExp(`\\b${escapeRe(word)}\\b`, 'i').test(text));
    if (matched) hits.push(tag);
  }
  return hits.length ? hits : [DEFAULT_TAG];
}

export const decideDraft = (filename) => /^_/.test(path.basename(filename)) || /draft/i.test(path.basename(filename));

export const slugifyTitle = (text) => slugify(text, { separator: '-' }) || 'post';

export function classify({ targetExists, recordedTargetHash, currentTargetHash, sourceChanged, force }) {
  if (!targetExists) return 'create';
  const handEdited = !recordedTargetHash || recordedTargetHash !== currentTargetHash;
  if (handEdited && !force) return 'conflict';
  return sourceChanged ? 'update' : 'skip';
}

/** Fixed key order keeps output byte-stable across runs. */
export function renderPost({ title, publishDate, updateDate, draft, excerpt, image, imageAlt, category, tags, author, body }) {
  const data = {};
  if (publishDate) data.publishDate = publishDate;
  if (updateDate) data.updateDate = updateDate;
  data.draft = Boolean(draft);
  data.title = title;
  if (excerpt) data.excerpt = excerpt;
  if (image) data.image = image;
  if (imageAlt) data.imageAlt = imageAlt;
  if (category) data.category = category;
  if (tags?.length) data.tags = tags;
  if (author) data.author = author;

  const fm = yaml.dump(data, { lineWidth: -1, noRefs: true, forceQuotes: false }).trimEnd();
  return `---\n${fm}\n---\n\n${body.trim()}\n`;
}

const hash = (s) => createHash('sha256').update(s).digest('hex');

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function findSourceImages(sourcePath, slug) {
  const dir = path.dirname(sourcePath);
  const base = path.basename(sourcePath, path.extname(sourcePath));
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    try {
      await stat(path.join(dir, `${base}${ext}`));
      return path.join(dir, `${base}${ext}`);
    } catch {
      /* keep looking */
    }
    try {
      await stat(path.join(dir, base, `${slug}${ext}`));
      return path.join(dir, base, `${slug}${ext}`);
    } catch {
      /* keep looking */
    }
  }
  return null;
}

export async function planSync({ force = false, write = false } = {}) {
  await mkdir(TARGET_DIR, { recursive: true });

  let entries = [];
  try {
    entries = (await readdir(SOURCES_DIR, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
      .map((e) => e.name)
      .sort();
  } catch {
    console.log(`No drafts found at ${path.relative(ROOT, SOURCES_DIR)}/ — nothing to do.`);
    return [];
  }

  const state = await readJson(STATE_FILE, {});
  const seenSlugs = new Set();
  const actions = [];

  for (const name of entries) {
    const sourcePath = path.join(SOURCES_DIR, name);
    const raw = await readFile(sourcePath, 'utf8');

    let parsed;
    try {
      parsed = parseSource(raw);
    } catch (error) {
      console.error(`Malformed frontmatter in ${name}: ${error.message}`);
      process.exitCode = 2;
      continue;
    }

    const { fm, body } = (() => {
      const derived = deriveTitle(parsed.body, name);
      return { fm: parsed.frontmatter, body: derived.body, title: derived.title };
    })();

    const title = fm.title ?? deriveTitle(parsed.body, name).title;
    const slug = fm.slug ?? slugifyTitle(title);
    if (seenSlugs.has(slug)) {
      console.warn(`warn: slug collision on "${slug}" (${name}); skipping`);
      continue;
    }
    seenSlugs.add(slug);

    const info = await stat(sourcePath);
    const publishDate = fm.publishDate ? new Date(fm.publishDate) : info.birthtime;
    const tags = fm.tags ?? deriveTags(maskFences(body));
    const excerpt = fm.excerpt ?? deriveExcerpt(body);
    const draft = fm.draft ?? decideDraft(name);

    let image = fm.image ?? null;
    if (!image) {
      const found = await findSourceImages(sourcePath, slug);
      image = found ? `~/assets/images/posts/${path.basename(found)}` : null;
    }

    const content = renderPost({
      title,
      publishDate,
      updateDate: fm.updateDate ? new Date(fm.updateDate) : undefined,
      draft,
      excerpt,
      image,
      imageAlt: fm.imageAlt,
      category: fm.category ?? tags[0],
      tags,
      author: fm.author ?? AUTHOR,
      body,
    });

    const targetName = `${slug}.md`;
    const targetPath = path.join(TARGET_DIR, targetName);
    const targetExists = await stat(targetPath).then(
      () => true,
      () => false
    );
    const currentTargetHash = targetExists ? hash(await readFile(targetPath, 'utf8')) : undefined;
    const record = state[slug];

    const action = classify({
      targetExists,
      recordedTargetHash: record?.targetHash,
      currentTargetHash,
      sourceChanged: !record || record.sourceHash !== hash(raw),
      force,
    });

    actions.push({ slug, action, source: sourcePath, target: targetPath, targetName, content, sourceHash: hash(raw) });
  }

  // Orphans: tracked targets whose source no longer exists on disk.
  for (const [slug, record] of Object.entries(state)) {
    if (seenSlugs.has(slug)) continue;
    actions.push({
      slug,
      action: 'orphan',
      source: null,
      target: path.join(TARGET_DIR, `${slug}.md`),
      targetName: `${slug}.md`,
      content: null,
      sourceHash: record.sourceHash,
    });
  }

  return actions;
}

const ICON = { create: '+', update: '~', skip: '=', conflict: '!', orphan: '?' };

export async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const force = args.includes('--force');
  const prune = args.includes('--prune');

  const actions = await planSync({ force, write });
  if (!actions.length) return;

  console.log(`\n${write ? 'WRITING' : 'PREVIEW (pass --write to apply)'}\n`);
  for (const a of actions) {
    console.log(`  ${ICON[a.action]} ${a.action.padEnd(9)} ${a.targetName}`);
    if (a.action === 'conflict') {
      console.log(`      ${a.targetName} was edited by hand since the last sync.`);
      console.log(`      Re-run with --force to overwrite, or move the edit into artifacts/blog/.`);
    }
  }

  const counts = actions.reduce((acc, a) => ({ ...acc, [a.action]: (acc[a.action] ?? 0) + 1 }), {});
  console.log(`\n${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}\n`);

  if (!write) return;

  const state = await readJson(STATE_FILE, {});

  for (const a of actions) {
    if (a.action === 'skip') continue;
    if (a.action === 'conflict') continue;
    if (a.action === 'orphan') {
      if (!prune) continue;
      const { rm } = await import('node:fs/promises');
      await rm(a.target, { force: true });
      delete state[a.slug];
      continue;
    }
    await mkdir(path.dirname(a.target), { recursive: true });
    await writeFile(a.target, a.content, 'utf8');
    state[a.slug] = {
      source: path.relative(ROOT, a.source),
      sourceHash: a.sourceHash,
      target: path.relative(ROOT, a.target),
      targetHash: hash(a.content),
    };
  }

  await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  console.log(`State written to ${path.relative(ROOT, STATE_FILE)}\n`);
}

if (import.meta.filename === process.argv[1]) {
  await main();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS. All `sync-posts` suites green, `prepare-assets` still green.

- [ ] **Step 5: Author the sample draft — with no frontmatter**

Create `artifacts/blog/welcome.md`:

```markdown
# Why this site exists

I build camera and optical systems — the kind that have to survive contact with mass production. Most of my work sits where optics, imaging pipelines, and increasingly machine learning meet, and the interesting problems are almost never inside one discipline.

This site is where I write down the parts that are not confidential.

## What I plan to write about

- Optical system architecture and the trade-offs that actually bind once a design reaches production
- Imaging pipelines, from sensor through the processing chain, and where models help or hurt
- Hardware that has to ship: tolerances, validation, yield, and the gap between a working prototype and a working product
- Notes on building a career across hardware and AI

## How this site is built

The site is a static build. Posts live as plain Markdown, and a small sync script in the repository turns drafts into published pages, so writing stays a matter of opening a text file.

```sh
npm run sync:posts -- --write
npm run build
```

That is the whole workflow. No content management system, no database, nothing that can rot.

If any of this is useful to you, or you want to argue with it, the links are in the footer.
```

Note the deliberately awkward nesting: the file demonstrates the fenced-block case in a real document. Do **not** add frontmatter — the whole point is to exercise inference.

- [ ] **Step 6: Preview the sync**

```bash
npm run sync:posts
```

Expected: `PREVIEW (pass --write to apply)`, then `+ create    welcome.md`, then `1 create`. Nothing is written yet. Confirm the file is still absent:

```bash
test ! -e src/data/post/welcome.md && echo "OK: preview wrote nothing"
```

- [ ] **Step 7: Apply the sync and inspect the result**

```bash
npm run sync:posts -- --write
cat src/data/post/welcome.md
```

Expected: frontmatter with `title: Why this site exists`, a `publishDate`, `draft: false`, an `excerpt`, `category: System Design`, `tags` including `System Design`, and `author: Peng Zhao`. The body starts at `I build camera and optical systems` — the H1 is gone.

Verify the inferred tags are sensible:

```bash
grep -A6 '^tags:' src/data/post/welcome.md
```

If the tags are wrong, the fix is in `TAG_KEYWORDS` in `scripts/sync-posts.mjs`, not in the generated file.

- [ ] **Step 8: Verify idempotence**

```bash
npm run sync:posts
```

Expected: `= skip    welcome.md` and `1 skip`. Running with `--write` again must not change the file:

```bash
shasum -a 256 src/data/post/welcome.md
npm run sync:posts -- --write > /dev/null
shasum -a 256 src/data/post/welcome.md
```

Expected: identical hashes.

- [ ] **Step 9: Verify hand-edit protection**

```bash
printf '\n<!-- hand edit -->\n' >> src/data/post/welcome.md
npm run sync:posts
```

Expected: `! conflict  welcome.md` with the explanation lines, and `1 conflict`. Confirm the edit survived:

```bash
grep -c 'hand edit' src/data/post/welcome.md
```

Expected: `1`. Now undo the probe:

```bash
git checkout -- src/data/post/welcome.md 2>/dev/null || sed -i '' '/<!-- hand edit -->/d' src/data/post/welcome.md
npm run sync:posts
```

Expected: back to `= skip`.

- [ ] **Step 10: Verify the post builds and renders**

```bash
npm run build
ls dist/welcome/index.html && grep -q 'Why this site exists' dist/welcome/index.html && echo "OK: post rendered at /welcome"
```

Expected: `OK: post rendered at /welcome`.

- [ ] **Step 11: Document the workflow as a project skill**

Create `.agents/skills/sync-blog-posts.md`:

```markdown
# Sync Blog Posts

Turn raw drafts in `artifacts/blog/` into published posts.

## Commands

| Command | Effect |
| --- | --- |
| `npm run sync:posts` | Preview. Writes nothing. Always run this first. |
| `npm run sync:posts -- --write` | Write to `src/data/post/`. |
| `npm run sync:posts -- --write --force` | Also overwrite targets edited by hand since the last sync. |
| `npm run sync:posts -- --write --prune` | Also delete targets whose source was removed. |

Exit codes: `0` success, `1` conflict, `2` malformed source frontmatter.

## What gets inferred

Anything the draft does not already declare in its own frontmatter:

| Field | Source |
| --- | --- |
| `title` | First `# heading` outside a code fence, else a humanised filename |
| `publishDate` | File creation time, else now |
| `excerpt` | First real paragraph, markdown stripped, ≤ 155 characters |
| `tags` | Keyword scan of the body against `TAG_KEYWORDS` in the script |
| `category` | The first matched tag |
| `draft` | `true` when the filename starts with `_` or contains `draft` |
| `image` | `<name>.jpg` beside the draft, or in a `<name>/` folder |

Declare any of these in the draft's own frontmatter to override inference.

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
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add blog sync pipeline from raw drafts

Infers AstroWind frontmatter from raw Markdown, with conflict detection
so hand-edited posts are never silently overwritten."
```

---

### Task 5: Publications

Build the publications data module, the filterable page, and the components the home page will later reuse.

**Files:**
- Create: `src/data/metrics.ts`, `src/data/publications.ts`, `src/components/portfolio/Badge.astro`, `src/components/portfolio/FilterBar.astro`, `src/components/portfolio/PublicationList.astro`, `src/pages/publications.astro`
- Modify: `src/types.d.ts`

**Interfaces:**
- Consumes: the `font-mono` utility (Task 3).
- Produces:
  - `Metric` type and `HEADLINE_METRICS` from `src/data/metrics.ts` — the four résumé figures, shared by `/publications`, `/cv` (Task 8), and the home page stats strip (Task 9). Task 8 imports this; do not redefine the numbers there.
  - `Publication` type and `PUBLICATIONS`, `PUBLICATION_TAGS`, `PUBLICATION_METRICS` from `src/data/publications.ts`
  - `<Badge label tone? icon? />`
  - `<FilterBar tags targetSelector? />`
  - `<PublicationList items variant? />` where `variant` is `'full' | 'compact'` — Task 9 uses `'compact'`.

- [ ] **Step 1: Add the types**

In `src/types.d.ts`, append:

```ts
// PORTFOLIO

export interface Publication {
  title: string;
  authors: string[];
  venue?: string;
  year: number;
  type: 'journal' | 'conference' | 'patent';
  tags: string[];
  doi?: string;
  pdf?: string;
  code?: string;
  abstract?: string;
  patentNumber?: string;
  status?: string;
  featured?: boolean;
}

export interface Badge {
  label: string;
  tone?: 'default' | 'primary' | 'accent';
  icon?: string;
}

export interface PublicationList extends Widget {
  items?: Publication[];
  variant?: 'full' | 'compact';
}

export interface FilterBar {
  tags: string[];
  targetSelector?: string;
}
```

Leaving `PublicationList` with an optional `items` matches how the template declares `Projects` and `Gallery` — `items`/`images` are optional there too. Use `Omit<PublicationList, 'items'> & { items: Publication[] }` at the call site only if `astro check` complains about a possibly-undefined `items`; the template's own components handle it with `items = []` defaults.

- [ ] **Step 2: Write the shared metrics module**

Create `src/data/metrics.ts`. The same four figures head the publications page, the CV page, and the home page. Defining them once means updating a citation count is a one-line edit in one file rather than three edits that can drift.

```ts
export interface Metric {
  value: string;
  label: string;
}

/**
 * Headline figures, as stated on the owner's résumé.
 * Consumed by /publications, /cv, and the home page stats strip.
 */
export const HEADLINE_METRICS: Metric[] = [
  { value: '20+', label: 'peer-reviewed papers' },
  { value: '750+', label: 'citations' },
  { value: '11', label: 'h-index' },
  { value: '3', label: 'patents' },
];
```

- [ ] **Step 3: Write the publications data module**

Create `src/data/publications.ts`. The three patents are transcribed from the owner's résumé; the journal and conference entries are **not** invented — the owner adds them. Keep that boundary.

```ts
import type { Publication } from '~/types';

/** Filter badges, in display order. */
export const PUBLICATION_TAGS = ['Optics', 'Hardware', 'Edge AI', 'System Design', 'Career'] as const;

/** Publications-page header text. The headline numbers live in `metrics.ts`. */
export const PUBLICATION_METRICS = {
  breakdown: '13 journal articles, 8 refereed proceedings, 28 conference presentations',
  scholarUrl: 'https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1',
};

/**
 * Seeded with the three patents from the owner's résumé — the only entries
 * with verifiable identifiers. Add journal and conference papers as they are
 * confirmed; until then the Google Scholar link is the authoritative list.
 */
export const PUBLICATIONS: Publication[] = [
  {
    title: 'Cylindrical Retroreflector Array for Rotation Tracking',
    authors: ['Peng Zhao'],
    year: 2023,
    type: 'patent',
    patentNumber: 'US 2023/0086536 A1',
    status: 'Issued',
    tags: ['Optics', 'Hardware'],
    abstract:
      'A cylindrical retroreflector array that returns incident light along the axis of rotation, enabling rotational position tracking in a compact optical package.',
  },
  {
    title: 'Optical Sensing of Translational and Rotational Shaft Movements',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'US 63/541,246',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'System Design'],
    abstract:
      'An optical architecture that resolves both translational and rotational movement of a shaft from a single sensing path.',
  },
  {
    title: 'Single Photon Avalanche Diodes for Rotational and Translational Input Detection',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'US 18/892,374',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'Edge AI'],
    abstract:
      'Applying single-photon avalanche diode arrays to joint rotational and translational input detection.',
  },
];

export const featuredPublications = PUBLICATIONS.filter((p) => p.featured);

/** Every tag actually present in the data, in canonical order. */
export const usedTags = PUBLICATION_TAGS.filter((tag) => PUBLICATIONS.some((p) => p.tags.includes(tag)));
```

None of the seeded entries set `featured: true`, so the home page section is hidden until the owner marks entries. That is deliberate — an empty featured section is worse than none.

- [ ] **Step 4: Write Badge.astro**

Create `src/components/portfolio/Badge.astro`:

```astro
---
import { Icon } from 'astro-icon/components';
import { twMerge } from 'tailwind-merge';
import type { Badge as Props } from '~/types';

const { label, tone = 'default', icon } = Astro.props;
const toneClass = {
  default: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  primary: 'border-primary/25 bg-primary/8 text-primary dark:bg-primary/15',
  accent: 'border-accent/25 bg-accent/8 text-accent dark:bg-accent/15',
}[tone];
---

<span
  class={twMerge(
    'inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] leading-5 tracking-tight whitespace-nowrap',
    toneClass
  )}
>
  {icon && <Icon name={icon} class="h-3 w-3" />}
  {label}
</span>
```

`bg-primary/8` requires Tailwind v4's arbitrary-opacity support, which handles any integer percentage — if `astro check` or the build rejects `/8`, use `/10`.

- [ ] **Step 5: Write FilterBar.astro**

Create `src/components/portfolio/FilterBar.astro`:

```astro
---
// Progressive-enhancement tag filter. The buttons are inert without
// JavaScript, and the list underneath renders in full — filtering is an
// enhancement, never a gate. See Review Focus #5.
import type { FilterBar as Props } from '~/types';

const { tags, targetSelector = '[data-filterable]' } = Astro.props;
---

<div class="mb-8 flex flex-wrap gap-2" data-filter-bar data-target={targetSelector} role="group" aria-label="Filter by topic">
  <button
    type="button"
    class="cursor-pointer rounded border border-primary bg-primary px-2.5 py-1 font-mono text-xs text-white transition"
    data-filter="all"
    aria-pressed="true">All</button
  >
  {
    tags.map((tag) => (
      <button
        type="button"
        class="cursor-pointer rounded border border-slate-200 bg-transparent px-2.5 py-1 font-mono text-xs text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
        data-filter={tag}
        aria-pressed="false"
      >
        {tag}
      </button>
    ))
  }
  <span class="ml-auto self-center font-mono text-xs text-muted" data-filter-count aria-live="polite"></span>
</div>

<script>
  const ACTIVE_BUTTON = 'border-primary bg-primary text-white';
  const INACTIVE_BUTTON =
    'border-slate-200 bg-transparent text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300';

  function initFilterBar(bar: Element) {
    if (bar.hasAttribute('data-initialised')) return;
    bar.setAttribute('data-initialised', '');

    const selector = bar.getAttribute('data-target') || '[data-filterable]';
    const items = Array.from(document.querySelectorAll(selector));
    const count = bar.querySelector('[data-filter-count]');
    const buttons = Array.from(bar.querySelectorAll<HTMLButtonElement>('[data-filter]'));

    const apply = (tag: string) => {
      let visible = 0;
      for (const item of items) {
        const itemTags = (item.getAttribute('data-tags') || '').split('|');
        const show = tag === 'all' || itemTags.includes(tag);
        (item as HTMLElement).hidden = !show;
        if (show) visible++;
      }
      for (const button of buttons) {
        const active = button.getAttribute('data-filter') === tag;
        button.setAttribute('aria-pressed', String(active));
        button.classList.remove(...(active ? INACTIVE_BUTTON : ACTIVE_BUTTON).split(' '));
        button.classList.add(...(active ? ACTIVE_BUTTON : INACTIVE_BUTTON).split(' '));
      }
      if (count) count.textContent = `${visible} of ${items.length}`;
    };

    for (const button of buttons) {
      button.addEventListener('click', () => apply(button.getAttribute('data-filter') || 'all'));
    }
    apply('all');
  }

  function initAll() {
    document.querySelectorAll('[data-filter-bar]').forEach(initFilterBar);
  }

  initAll();
  document.addEventListener('astro:after-swap', initAll);
</script>
```

The `astro:after-swap` listener re-initialises after a view transition, matching how `Header.astro` re-applies active links. The `data-initialised` guard prevents double-binding.

- [ ] **Step 6: Write PublicationList.astro**

Create `src/components/portfolio/PublicationList.astro`:

```astro
---
import { Icon } from 'astro-icon/components';
import Badge from '~/components/portfolio/Badge.astro';
import type { Publication, PublicationList as Props } from '~/types';

const { items = [], variant = 'full' } = Astro.props;
const compact = variant === 'compact';

const typeLabel = { journal: 'Journal', conference: 'Conference', patent: 'Patent' } as const;

const linkFor = (p: Publication) =>
  p.doi ? `https://doi.org/${p.doi.replace(/^https?:\/\/doi\.org\//, '')}` : undefined;
---

<ul class="list-none space-y-6" data-filterable-pending>
  {
    items.map((p, index) => {
      const doiUrl = linkFor(p);
      return (
        <li
          class:list={[
            'border-b border-slate-200 pb-6 last:border-0 dark:border-slate-800',
            compact ? '' : 'group',
          ]}
          data-filterable
          data-tags={p.tags.join('|')}
        >
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <Badge label={typeLabel[p.type]} tone={p.type === 'patent' ? 'accent' : 'primary'} />
            {p.tags.map((tag) => (
              <Badge label={tag} />
            ))}
            {p.status && <span class="font-mono text-xs text-muted">{p.status}</span>}
          </div>

          <h3 class="text-lg font-semibold leading-snug text-heading text-balance">{p.title}</h3>

          {!compact && (
            <p class="mt-1 text-sm text-muted">
              {p.authors.map((author, i) => (
                <>
                  {i > 0 && ', '}
                  <span class={author === 'Peng Zhao' ? 'font-semibold text-default' : ''}>{author}</span>
                </>
              ))}
            </p>
          )}

          <p class="mt-1 font-mono text-xs text-muted">
            {[p.venue, p.patentNumber, p.year].filter(Boolean).join(' · ')}
          </p>

          {(doiUrl || p.pdf || p.code) && (
            <div class="mt-3 flex flex-wrap gap-3">
              {doiUrl && (
                <a
                  href={doiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                >
                  DOI <Icon name="tabler:arrow-up-right" class="h-3 w-3" />
                </a>
              )}
              {p.pdf && (
                <a
                  href={p.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                >
                  PDF <Icon name="tabler:file-text" class="h-3 w-3" />
                </a>
              )}
              {p.code && (
                <a
                  href={p.code}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                >
                  Code <Icon name="tabler:brand-github" class="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {!compact && p.abstract && (
            <details class="mt-3">
              <summary class="cursor-pointer font-mono text-xs text-muted hover:text-primary">Abstract</summary>
              <p class="mt-2 text-sm text-muted">{p.abstract}</p>
            </details>
          )}
        </li>
      );
    })
  }
</ul>
```

Every optional link is guarded individually, so a publication with no DOI, no PDF, and no code renders its metadata and nothing else — Review Focus #3.

Note the `<>...</>` fragment inside `p.authors.map(...)`. If the Astro compiler rejects it in that position, replace it with `<Fragment>` from `astro:content`, or build the string beforehand with a helper and render it via `set:html`.

- [ ] **Step 7: Write the page**

Create `src/pages/publications.astro`:

```astro
---
import Layout from '~/layouts/PageLayout.astro';
import WidgetWrapper from '~/components/ui/WidgetWrapper.astro';
import Headline from '~/components/ui/Headline.astro';
import Button from '~/components/ui/Button.astro';
import FilterBar from '~/components/portfolio/FilterBar.astro';
import PublicationList from '~/components/portfolio/PublicationList.astro';
import { PUBLICATIONS, PUBLICATION_METRICS, usedTags } from '~/data/publications';
import { HEADLINE_METRICS } from '~/data/metrics';

const metadata = {
  title: 'Publications',
  description:
    'Peer-reviewed papers, refereed proceedings, and patents in optics, imaging, and hardware systems.',
};

const stats = HEADLINE_METRICS;

const sorted = [...PUBLICATIONS].sort((a, b) => b.year - a.year);
---

<Layout metadata={metadata}>
  <WidgetWrapper containerClass="max-w-5xl mx-auto pt-12 md:pt-16">
    <Headline
      tagline="Publications"
      title="Papers and patents"
      subtitle={PUBLICATION_METRICS.breakdown}
      classes={{ container: 'max-w-3xl', title: 'text-4xl md:text-5xl ', subtitle: 'text-lg' }}
    />

    <dl class="mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
      {
        stats.map((stat) => (
          <div class="bg-page px-5 py-4">
            <dt class="font-mono text-xs uppercase tracking-wider text-muted">{stat.label}</dt>
            <dd class="mt-1 font-heading text-3xl font-semibold text-heading">{stat.value}</dd>
          </div>
        ))
      }
    </dl>

    <FilterBar tags={[...usedTags]} />

    <PublicationList items={sorted} variant="full" />

    <div class="mt-12 rounded-lg border border-slate-200 p-6 text-center dark:border-slate-800">
      <p class="text-muted">
        Journal and conference papers are being added. The complete, current list lives on Google Scholar.
      </p>
      <div class="mt-4">
        <Button
          variant="primary"
          text="Full list on Google Scholar"
          href={PUBLICATION_METRICS.scholarUrl}
          target="_blank"
          icon="tabler:external-link"
        />
      </div>
    </div>
  </WidgetWrapper>
</Layout>
```

- [ ] **Step 8: Verify the build and types**

```bash
npm run check && npm run build
```

Expected: both clean.

- [ ] **Step 9: Verify the filter renders and the no-JS case is complete**

```bash
grep -c 'data-filterable' dist/publications/index.html
grep -o 'Cylindrical Retroreflector Array' dist/publications/index.html | head -1
```

Expected: `3` (one per publication) and the patent title. Because the list is server-rendered and hiding is done with the `hidden` attribute at runtime, all three entries are present in the HTML — a no-JavaScript visitor sees the full list.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add publications page

Filterable listing seeded with the owner's three patents. Journal and
conference entries are added by the owner; Google Scholar is the
authoritative full list until then."
```

---

### Task 6: Projects

Add the project content collection, its card grid, and the case-study subpages the spec calls for.

**Files:**
- Modify: `src/content.config.ts`, `src/types.d.ts`
- Create: `src/content/projects/*.mdx` (3 seeds), `src/components/portfolio/ProjectGrid.astro`, `src/pages/projects/index.astro`, `src/pages/projects/[slug].astro`

**Interfaces:**
- Consumes: `Badge.astro` (Task 5), `font-mono` (Task 3).
- Produces: the `project` collection (id = filename without extension) and `<ProjectGrid items columns? />` — Task 9 reuses it on the home page with `items={featured}`.

- [ ] **Step 1: Register the collection**

In `src/content.config.ts`, add after the `postCollection` definition:

```ts
const projectCollection = defineCollection({
  loader: glob({
    pattern: '*.mdx',
    base: 'src/content/projects',
    // Pin the id to the bare filename so `entry.id` is always the URL slug.
    // The default id derivation differs by Astro version and for some
    // extensions retains the `.mdx`; three call sites depend on this value
    // (the card link, the getStaticPaths param, and the verify-build check),
    // so it is stated here rather than inferred.
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    year: z.number(),
    role: z.string().optional(),
    status: z.enum(['shipped', 'in-progress', 'research']).optional(),
    /** Tech-stack tags, rendered as badges on the card. */
    stack: z.array(z.string()).default([]),
    /** Hardware components / parts list, rendered as a mono spec list. */
    components: z.array(z.string()).default([]),
    repo: z.string().url().optional(),
    demo: z.string().url().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
    /** Sort order, descending. Higher first. */
    weight: z.number().default(0),
  }),
});
```

Then update the export at the bottom:

```ts
export const collections = {
  post: postCollection,
  project: projectCollection,
};
```

Note: the template declares `repo: z.url()` in the spec sketch, but this file imports `z` from `astro/zod`, whose API in version 4 is `z.string().url()`. Use whichever form `astro check` accepts; if `z.url()` is available it is preferred. Confirm by running `npm run check:astro` after this step.

- [ ] **Step 2: Create the seed projects**

Create `src/content/projects/coherent-optical-sensor.mdx`:

```mdx
---
title: 'Coherent Optical Sensor for Velocity Tracking'
summary: 'Optical design lead for a coherent sensing architecture that shipped in Apple Watch Ultra.'
year: 2022
role: 'Optical Design'
status: 'shipped'
stack: ['Optics', 'Coherent Sensing', 'NPI', 'Metrology']
components: ['VCSEL source', 'Diffractive optics', 'Photodetector array', 'Custom ASIC']
featured: true
weight: 30
---

<!-- Owner: expand with public detail -->

The brief was a sensor that could measure motion without contact, to tight tolerances, in a package small
enough to disappear into a watch. Coherent detection gets you the sensitivity, but it forces every downstream
decision — source stability, alignment strategy, thermal behaviour — to be settled before the optics can be
frozen.

I owned the optical design end to end: architecture, simulation, tolerance analysis, and the transfer into
manufacturing.

## What made it hard

Contactless velocity measurement in a consumer product has no margin for drift. The optical train has to hold
its alignment across thermal and mechanical variation for the life of the device, and it has to do so at a
price point that a watch can carry.

## Outcome

Shipped in Apple Watch Ultra in Fall 2022.
```

Create `src/content/projects/image-tracking-sensor.mdx`:

```mdx
---
title: 'Image Tracking Sensor Optical Architecture'
summary: 'Updated the optical design of an image-based tracking sensor for Apple Vision Pro.'
year: 2023
role: 'Optical Design'
status: 'shipped'
stack: ['Optics', 'Imaging', 'Simulation', 'Tolerance Analysis']
components: ['Imaging lens stack', 'Illumination module', 'Sensor package']
featured: true
weight: 20
---

<!-- Owner: expand with public detail -->

An image-based tracking sensor has to work in the conditions a headset actually sees: variable ambient light,
a moving subject, and a mechanical envelope that leaves very little room for optics.

## My role

I updated the optical design of the sensor, working from the imaging requirements back through the lens
architecture, and carried the design through tolerance analysis to a manufacturable specification.

## Related work

A second architecture from the same period extended an image tracking sensor to resolve both rotation and
translation, which became the subject of a filed patent.

## Outcome

Shipped in Apple Vision Pro in Fall 2023.
```

Create `src/content/projects/wafer-alignment-sensor.mdx`:

```mdx
---
title: 'Polarization-Resolved Wafer Alignment Sensor'
summary: 'Resolved a polarization crosstalk defect to unblock the first-generation ORION alignment sensor at ASML.'
year: 2019
role: 'Senior Design Engineer / Team Lead'
status: 'shipped'
stack: ['Optics', 'Polarization', 'Semiconductor', 'Metrology']
components: ['Polarization optics', 'Wavelength demultiplexer', 'Solid-state spectral filter', 'Production tester']
featured: true
weight: 10
---

<!-- Owner: expand with public detail -->

Wafer alignment is a sub-nanometer measurement problem. The sensor has to locate features on a wafer with a
precision that is well below the wavelength of the light doing the measuring.

## What made it hard

Polarization crosstalk between channels was corrupting the measurement. Isolating it meant working through the
whole optical path rather than any single element, and the fix had to hold across the production population,
not just on a bench.

## What I did

I led the technical development of a wavelength demultiplexer module — vendor specification, prototype builds,
machine integration — and led a cross-functional team building a two-million-euro production tester that
advanced both the hardware and the algorithms to meet the motion-accuracy targets.

## Outcome

Unblocked the launch of the first-generation polarization-resolved ORION wafer alignment sensor. A
solid-state spectral filter module developed in this period became an internal IP publication.
```

- [ ] **Step 3: Verify the collection parses**

```bash
npm run check:astro
npm run build 2>&1 | tail -5
```

Expected: no schema validation errors. If a URL field is present and empty, it must be omitted entirely — the schema rejects empty strings for `repo` and `demo`.

- [ ] **Step 4: Add the ProjectCard interface**

In `src/types.d.ts`, append:

```ts
export interface ProjectCard {
  id: string;
  title: string;
  summary: string;
  year: number;
  role?: string;
  status?: 'shipped' | 'in-progress' | 'research';
  stack: string[];
  components: string[];
  repo?: string;
  demo?: string;
  image?: string;
  imageAlt?: string;
  featured: boolean;
  weight: number;
}

export interface ProjectGrid extends Widget {
  items: ProjectCard[];
  columns?: 2 | 3;
  /** Hide the hardware component list, e.g. in narrow home-page columns. */
  showComponents?: boolean;
}
```

- [ ] **Step 5: Write ProjectGrid.astro**

Create `src/components/portfolio/ProjectGrid.astro`:

```astro
---
import { Icon } from 'astro-icon/components';
import Image from '~/components/common/Image.astro';
import Badge from '~/components/portfolio/Badge.astro';
import { getColumnsClass } from '~/utils/utils';
import { getPermalink } from '~/utils/permalinks';
import type { ProjectGrid as Props } from '~/types';

const { items, columns = 3, showComponents = true, id, classes = {} } = Astro.props;
const columnsClass = getColumnsClass(columns, '');
---

<ul class:list={['grid list-none gap-6 md:gap-8', columnsClass]} {...id ? { id } : {}}>
  {
    items.map((project) => (
      <li class="intersect-once intersect-quarter motion-safe:md:opacity-0 motion-safe:md:intersect:animate-fade">
        <a
          href={getPermalink(`/projects/${project.id}`)}
          class="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-page shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg dark:border-slate-800"
        >
          {project.image && (
            <div class="overflow-hidden border-b border-slate-200 dark:border-slate-800">
              <Image
                class="aspect-[16/10] w-full object-cover transition group-hover:scale-[1.03]"
                widths={[400, 640]}
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px"
                width={400}
                height={250}
                layout="cover"
                format="webp"
                src={project.image}
                alt={project.imageAlt ?? project.title}
              />
            </div>
          )}

          <div class="flex flex-1 flex-col p-6">
            <div class="mb-3 flex flex-wrap items-center gap-2">
              {project.status && <Badge label={project.status} tone={project.status === 'shipped' ? 'primary' : 'default'} />}
              <span class="font-mono text-xs text-muted">{project.year}</span>
              {project.role && <span class="font-mono text-xs text-muted">· {project.role}</span>}
            </div>

            <h3 class="text-xl font-semibold leading-snug text-heading text-balance">{project.title}</h3>
            <p class="mt-2 flex-1 text-muted text-pretty">{project.summary}</p>

            {showComponents && project.components.length > 0 && (
              <dl class="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <dt class="font-mono text-[11px] uppercase tracking-wider text-muted">Components</dt>
                <dd class="mt-1 font-mono text-xs leading-relaxed text-default">
                  {project.components.join(' · ')}
                </dd>
              </dl>
            )}

            <div class="mt-4 flex flex-wrap items-center gap-2">
              {project.stack.map((tech) => (
                <Badge label={tech} />
              ))}
            </div>

            <span class="mt-5 inline-flex items-center gap-1 font-mono text-xs text-primary">
              Case study
              <Icon name="tabler:arrow-right" class="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>

            {
              project.repo && (
                <span class="mt-2 inline-flex items-center gap-1 font-mono text-xs text-muted">
                  <Icon name="tabler:brand-github" class="h-3.5 w-3.5" />
                  {project.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                </span>
              )
            }
          </div>
        </a>
      </li>
    ))
  }
</ul>
```

The whole card is a link to the case study. `repo` is shown as a label rather than a nested link — nesting an `<a>` inside an `<a>` is invalid HTML and breaks keyboard navigation. The case study page carries the real repository button.

- [ ] **Step 6: Write the grid page**

Create `src/pages/projects/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Layout from '~/layouts/PageLayout.astro';
import WidgetWrapper from '~/components/ui/WidgetWrapper.astro';
import Headline from '~/components/ui/Headline.astro';
import ProjectGrid from '~/components/portfolio/ProjectGrid.astro';
import type { ProjectCard } from '~/types';

const metadata = {
  title: 'Projects',
  description: 'Hardware and optical systems work — architectures, components, and what shipped.',
};

const entries = await getCollection('project');

const projects: ProjectCard[] = entries
  .map((entry) => ({ id: entry.id, ...entry.data }))
  .sort((a, b) => b.weight - a.weight || b.year - a.year);
---

<Layout metadata={metadata}>
  <WidgetWrapper containerClass="max-w-7xl mx-auto pt-12 md:pt-16">
    <Headline
      tagline="Projects"
      title="Systems that had to ship"
      subtitle="Optical and hardware architectures taken from concept through production, with the components and trade-offs that shaped them."
      classes={{ container: 'max-w-3xl', title: 'text-4xl md:text-5xl ', subtitle: 'text-lg' }}
    />

    <ProjectGrid items={projects} columns={3} />
  </WidgetWrapper>
</Layout>
```

- [ ] **Step 7: Write the case-study page**

Create `src/pages/projects/[slug].astro`:

```astro
---
import { getCollection, render } from 'astro:content';
import { Icon } from 'astro-icon/components';
import Layout from '~/layouts/PageLayout.astro';
import MarkdownLayout from '~/layouts/MarkdownLayout.astro';
import Badge from '~/components/portfolio/Badge.astro';
import Button from '~/components/ui/Button.astro';
import { getPermalink } from '~/utils/permalinks';

export async function getStaticPaths() {
  const projects = await getCollection('project');
  return projects.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
const { title, summary, year, role, status, stack, components, repo, demo } = entry.data;

const metadata = { title, description: summary };
---

<MarkdownLayout metadata={metadata}>
  <a
    href={getPermalink('/projects')}
    class="mb-6 inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-primary"
  >
    <Icon name="tabler:arrow-left" class="h-3.5 w-3.5" />
    All projects
  </a>

  <div class="mb-4 flex flex-wrap items-center gap-2">
    {status && <Badge label={status} tone={status === 'shipped' ? 'primary' : 'default'} />}
    <span class="font-mono text-xs text-muted">{year}</span>
    {role && <span class="font-mono text-xs text-muted">· {role}</span>}
  </div>

  {stack.length > 0 && (
    <div class="mb-8 flex flex-wrap gap-2">
      {stack.map((tech) => (
        <Badge label={tech} />
      ))}
    </div>
  )}

  <Content />

  {
    components.length > 0 && (
      <div class="mt-10 rounded-lg border border-slate-200 p-6 dark:border-slate-800">
        <h2 class="font-mono text-xs uppercase tracking-wider text-muted">Components</h2>
        <ul class="mt-3 list-none space-y-1">
          {components.map((component) => (
            <li class="font-mono text-sm text-default">{component}</li>
          ))}
        </ul>
      </div>
    )
  }

  {
    (repo || demo) && (
      <div class="mt-8 flex flex-wrap gap-3">
        {repo && <Button variant="primary" text="Code" href={repo} target="_blank" icon="tabler:brand-github" />}
        {demo && <Button variant="secondary" text="Demo" href={demo} target="_blank" icon="tabler:external-link" />}
      </div>
    )
  }
</MarkdownLayout>
```

`MarkdownLayout` wraps content in the template's `prose` styles, which is what makes the MDX body read well. It also renders the header and footer.

- [ ] **Step 8: Verify the routes build**

```bash
npm run check && npm run build
ls dist/projects/index.html dist/projects/coherent-optical-sensor/index.html dist/projects/wafer-alignment-sensor/index.html
```

Expected: `astro check` clean and all three paths present.

- [ ] **Step 9: Verify the NDA boundary held**

```bash
grep -riE 'meta|apple|asml' src/content/projects/*.mdx | grep -viE 'apple watch ultra in fall|apple vision pro in fall' ; echo "--- boundary check done ---"
```

Expected: only the two permitted product-launch sentences surface from the `grep`; nothing about internal measurements, yields, or unreleased products.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add projects collection and case-study pages

Three seed projects written to résumé-level public detail only. Cards
carry stack tags, hardware components, and a link to the case study."
```

---

### Task 7: Photography

Build the gallery. The template's `Gallery` widget hard-crops to 4:3, which would cut apart portrait and landscape compositions — this needs a masonry grid that preserves native aspect ratios.

**Files:**
- Create: `src/data/photography.ts`, `src/components/portfolio/PhotoGrid.astro`, `src/pages/photography.astro`
- Modify: `src/types.d.ts`

**Interfaces:**
- Consumes: `src/assets/images/photography/<category>/*.jpg` (Task 2).
- Produces: `<PhotoGrid groups />`, and `PHOTO_OVERRIDES` keyed by filename.

- [ ] **Step 1: Write the override module**

Create `src/data/photography.ts`:

```ts
/**
 * Optional per-photo metadata, keyed by the output filename under
 * src/assets/images/photography/<category>/.
 *
 * Photos appear on /photography automatically once they exist on disk.
 * This file only adds what a filename cannot express: a title, a location,
 * and meaningful alt text. Categories with no override still render, using
 * the filename as the caption — see Review Focus #2.
 */
export interface PhotoOverride {
  title?: string;
  location?: string;
  alt?: string;
  /** Higher sorts first within its category. */
  weight?: number;
}

/** Display order and labels for categories. Unknown categories sort last. */
export const CATEGORY_LABELS: Record<string, string> = {
  landscape: 'Landscape',
  wildlife: 'Wildlife',
  macro: 'Macro',
  portrait: 'Portrait',
  streets: 'Street',
};

export const CATEGORY_ORDER = ['landscape', 'wildlife', 'portrait', 'macro', 'streets'];

export const PHOTO_OVERRIDES: Record<string, PhotoOverride> = {};
```

`PHOTO_OVERRIDES` ships empty on purpose: inventing locations or subjects for the owner's photographs would be fabrication. The page renders correctly with no overrides, and the owner fills this in as they add photographs.

- [ ] **Step 2: Add the PhotoGrid type**

In `src/types.d.ts`, append:

```ts
export interface Photo {
  src: ImageMetadata;
  alt: string;
  caption?: string;
  location?: string;
  weight: number;
}

export interface PhotoGroup {
  key: string;
  label: string;
  photos: Photo[];
}

export interface PhotoGrid extends Widget {
  groups: PhotoGroup[];
}
```

Add `import type { ImageMetadata } from 'astro';` at the top of `src/types.d.ts` if it is not already imported there.

- [ ] **Step 3: Write PhotoGrid.astro**

Create `src/components/portfolio/PhotoGrid.astro`:

```astro
---
import { Icon } from 'astro-icon/components';
import Image from '~/components/common/Image.astro';
import type { PhotoGrid as Props } from '~/types';

// Masonry via CSS multi-column. Natural aspect ratios are preserved by
// passing each image's true dimensions, so nothing is cropped and the
// browser reserves the correct space (no layout shift).
//
// The lightbox reuses the template Gallery widget's approach: a native
// <dialog>, keyboard navigable, no library.

const { groups, id } = Astro.props;
const flat = groups.flatMap((group) => group.photos);
---

<div {...id ? { id } : {}}>
  {
    groups.map((group) => (
      <section class="mb-16 last:mb-0">
        <h2 class="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-muted">{group.label}</h2>
        <p class="mb-6 font-mono text-xs text-muted">
          {group.photos.length} {group.photos.length === 1 ? 'photograph' : 'photographs'}
        </p>

        <aw-photo-grid>
          <ul class="columns-1 list-none gap-4 sm:columns-2 lg:columns-3">
            {group.photos.map((photo) => {
              const index = flat.indexOf(photo);
              return (
                <li class="mb-4 break-inside-avoid">
                  <figure>
                    <button
                      type="button"
                      class="group block w-full cursor-zoom-in overflow-hidden rounded-lg bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-slate-800"
                      data-photo-open={index}
                      aria-label={`Open image: ${photo.alt}`}
                    >
                      <Image
                        class="w-full transition group-hover:opacity-90"
                        widths={[400, 800, 1200]}
                        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                        width={photo.src.width}
                        height={photo.src.height}
                        layout="constrained"
                        format="webp"
                        src={photo.src}
                        alt={photo.alt}
                      />
                    </button>
                    {(photo.caption || photo.location) && (
                      <figcaption class="mt-2 font-mono text-xs text-muted">
                        {photo.caption}
                        {photo.caption && photo.location && ' · '}
                        {photo.location}
                      </figcaption>
                    )}
                  </figure>
                </li>
              );
            })}
          </ul>
        </aw-photo-grid>
      </section>
    ))
  }

  <dialog
    class="m-auto max-h-[92vh] max-w-[92vw] rounded-lg bg-transparent p-0 backdrop:bg-black/85 backdrop:backdrop-blur-sm open:flex open:flex-col"
    aria-label="Image viewer"
  >
    <form method="dialog" class="absolute right-2 top-2 z-10">
      <button
        type="submit"
        class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        aria-label="Close"
      >
        <Icon name="tabler:x" class="h-5 w-5" />
      </button>
    </form>
    <button
      type="button"
      data-photo-prev
      class="absolute left-2 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      aria-label="Previous image"
    >
      <Icon name="tabler:chevron-left" class="h-5 w-5" />
    </button>
    <button
      type="button"
      data-photo-next
      class="absolute right-2 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      aria-label="Next image"
    >
      <Icon name="tabler:chevron-right" class="h-5 w-5" />
    </button>
    <img data-photo-img src="" alt="" class="max-h-[92vh] max-w-[92vw] rounded-lg object-contain" />
  </dialog>
</div>

<script define:vars={{ sources: flat.map((photo) => ({ src: photo.src.src, alt: photo.alt })) }}>
  function setupPhotoGrid(root: Element) {
    if (root.hasAttribute('data-initialised')) return;
    root.setAttribute('data-initialised', '');

    const dialog = root.querySelector('dialog');
    const img = root.querySelector('[data-photo-img]');
    const grid = root.closest('div') || document;
    let index = 0;

    const show = (next) => {
      index = (next + sources.length) % sources.length;
      img.src = sources[index].src;
      img.alt = sources[index].alt;
    };

    for (const trigger of grid.querySelectorAll('[data-photo-open]')) {
      trigger.addEventListener('click', () => {
        show(Number(trigger.getAttribute('data-photo-open')));
        dialog.showModal();
      });
    }

    root.querySelector('[data-photo-prev]')?.addEventListener('click', () => show(index - 1));
    root.querySelector('[data-photo-next]')?.addEventListener('click', () => show(index + 1));

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') show(index - 1);
      if (event.key === 'ArrowRight') show(index + 1);
    });
  }

  function initPhotoGrids() {
    document.querySelectorAll('aw-photo-grid').forEach(setupPhotoGrid);
  }

  initPhotoGrids();
  document.addEventListener('astro:after-swap', initPhotoGrids);
</script>
```

`define:vars` serialises the image list into the client script, which is how the lightbox knows what to show without a network round trip. If Astro warns that `define:vars` forces the script to be inline (it does), that is acceptable here: the payload is nine small strings.

- [ ] **Step 4: Write the page**

Create `src/pages/photography.astro`:

```astro
---
import type { ImageMetadata } from 'astro';
import Layout from '~/layouts/PageLayout.astro';
import WidgetWrapper from '~/components/ui/WidgetWrapper.astro';
import Headline from '~/components/ui/Headline.astro';
import PhotoGrid from '~/components/portfolio/PhotoGrid.astro';
import { CATEGORY_LABELS, CATEGORY_ORDER, PHOTO_OVERRIDES } from '~/data/photography';
import type { PhotoGroup } from '~/types';

const metadata = {
  title: 'Photography',
  description: 'Selected landscape, wildlife, and macro photography.',
};

// Every image under src/assets/images/photography/ is picked up
// automatically. Dropping a new file into a category folder and rebuilding
// is the entire workflow.
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '~/assets/images/photography/**/*.{jpg,jpeg,png,webp}',
  { eager: true }
);

const byCategory = new Map<string, PhotoGroup['photos']>();

for (const [filePath, module] of Object.entries(modules)) {
  const segments = filePath.split('/');
  const fileName = segments.pop() as string;
  const category = segments.pop() as string;
  const override = PHOTO_OVERRIDES[fileName] ?? {};

  const photo = {
    src: module.default,
    alt: override.alt ?? override.title ?? `Photograph by Peng Zhao (${fileName})`,
    caption: override.title,
    location: override.location,
    weight: override.weight ?? 0,
  };

  if (!byCategory.has(category)) byCategory.set(category, []);
  byCategory.get(category)!.push(photo);
}

const humanize = (key: string) => key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const labelFor = (key: string) => CATEGORY_LABELS[key] ?? humanize(key);

const groups: PhotoGroup[] = [...byCategory.entries()]
  .map(([key, photos]) => ({
    key,
    label: labelFor(key),
    photos: photos.sort((a, b) => b.weight - a.weight || a.src.src.localeCompare(b.src.src)),
  }))
  .sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.key);
    const bi = CATEGORY_ORDER.indexOf(b.key);
    return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi);
  });
---

<Layout metadata={metadata}>
  <WidgetWrapper containerClass="max-w-6xl mx-auto pt-12 md:pt-16">
    <Headline
      tagline="Photography"
      title="Looking closely"
      subtitle="Photographs made away from work — landscape, wildlife, and macro."
      classes={{ container: 'max-w-3xl', title: 'text-4xl md:text-5xl ', subtitle: 'text-lg' }}
    />
    <PhotoGrid groups={groups} />
  </WidgetWrapper>
</Layout>
```

The sort falls back to `CATEGORY_ORDER.length` for unknown categories, so a new folder lands at the end with a humanised heading instead of being dropped or crashing the build — Review Focus #2.

- [ ] **Step 5: Verify the gallery builds**

```bash
npm run check && npm run build
ls dist/photography/index.html
grep -c '<figure>' dist/photography/index.html
```

Expected: page present and `9` figures — one per source photograph, none dropped.

- [ ] **Step 6: Verify an unknown category survives**

```bash
mkdir -p src/assets/images/photography/astro
cp src/assets/images/photography/macro/*.jpg src/assets/images/photography/astro/test-shot.jpg
npm run build > /dev/null && grep -o 'Astro' dist/photography/index.html | head -1
rm -rf src/assets/images/photography/astro
```

Expected: `Astro` appears — the unknown category rendered with a humanised heading rather than being dropped. Remove the probe directory and rebuild afterwards.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add photography gallery

Masonry grid preserving native aspect ratios, grouped by category, with
a keyboard-navigable lightbox. New photos appear by dropping files into
a category folder."
```

---

### Task 8: CV

Render the résumé as a web page, with the print stylesheet and the PDF download the spec requires.

**Files:**
- Create: `src/data/cv.ts`, `src/components/portfolio/CVEntry.astro`, `src/pages/cv.astro`, `public/resume.pdf`
- Modify: `src/types.d.ts`

**Interfaces:**
- Consumes: `Badge.astro` (Task 5) and `HEADLINE_METRICS` from `src/data/metrics.ts` (Task 5) — the CV page renders the same four figures, imported, not restated.
- Produces: `src/data/cv.ts` exporting `CV_SUMMARY`, `CV_EXPERIENCE`, `CV_EDUCATION`, `CV_PATENTS`, `CV_LINKS`, and the `CVEntryData` / `CVEducation` / `CVPatent` types; `<CVEntry entry />`. Task 9 links to `/cv` from the hero and uses `/cv` in the navigation.

- [ ] **Step 1: Write the CV data module**

Create `src/data/cv.ts`, transcribing the owner's résumé. **No phone number** — this is a public page.

```ts
export interface CVEntryData {
  role: string;
  org: string;
  location?: string;
  start: string;
  end: string;
  /** Rendered as `· Present` when true. */
  current?: boolean;
  highlights: string[];
}

export interface CVEducation {
  degree: string;
  org: string;
  location?: string;
  start: string;
  end: string;
  detail?: string;
}

export interface CVPatent {
  title: string;
  number: string;
  status: 'Issued' | 'Filed';
  date?: string;
}

// The headline figures are not restated here. They are defined once in
// `src/data/metrics.ts` as `HEADLINE_METRICS` and consumed by this page,
// /publications, and the home page. Import them from there.

export const CV_SUMMARY =
  'A camera and optical systems engineer with a proven track record of shipping solutions for multiple products from concept to mass production. Specializes in developing end-to-end simulation frameworks by integrating optics, sensor and imaging pipelines, and virtual experiences across technical domains. Able to synthesize design trade-offs and drive cross-functional outcomes. Experience spanning build cycles in manufacturing, testing, and spec engineering for high-volume production.';

export const CV_EXPERIENCE: CVEntryData[] = [
  {
    role: 'Eye and Face Tracking Systems Engineer',
    org: 'Meta',
    location: 'Sunnyvale, CA',
    start: '2024.02',
    end: '',
    current: true,
    highlights: [
      'Leads the optical design and architecture for advanced eye and face tracking camera systems across all Meta VR products, and roadmap explorations.',
      'Developed end-to-end frameworks of full optical systems including camera module, ET/FT illumination, and display viewing optics, with an imaging pipeline supporting high-fidelity rendering. Deeply integrated with software platforms to accurately model user experience.',
      'Designed system-level KPIs for ET/FT, established factory testing protocols, and demonstrated production quality and yield over builds.',
    ],
  },
  {
    role: 'Sensing Hardware Engineer',
    org: 'Apple',
    location: 'Cupertino, CA',
    start: '2020.06',
    end: '2024.03',
    highlights: [
      "Led optical design of Apple's first coherent optical sensor for velocity tracking; shipped with Apple Watch Ultra in Fall 2022.",
      'Updated the optical design of an image tracking based sensor; shipped with Apple Vision Pro in Fall 2023.',
      'Invented a new microstructure optical surface with enhanced retroreflection (patent issued), leading to significant cost and size reduction at system level; shipped in all SKUs of Apple Watch in Fall 2025.',
      'Invented a novel optical architecture of an image tracking sensor capable of tracking both rotation and translation (patent filed).',
    ],
  },
  {
    role: 'Senior Design Engineer / Team Lead',
    org: 'ASML',
    location: 'Wilton, CT',
    start: '2017.11',
    end: '2020.06',
    highlights: [
      'Solved a polarization crosstalk issue to enable the launch of the first-generation polarization-resolved ORION wafer alignment sensor.',
      'Led technical development of a new wavelength demultiplexer module, delivering vendor specification, prototype builds, and machine integration.',
      'Led a cross-functional team developing a €2M production tester for next-generation product build and qualification, advancing both hardware and algorithm levels to achieve sub-nanometer motion accuracy KPIs.',
      'Invented a new solid-state spectral filter module for a supercontinuum laser (internal IP publication).',
    ],
  },
  {
    role: 'Postdoctoral Research Associate',
    org: 'CREOL, University of Central Florida',
    location: 'Orlando, FL',
    start: '2016.10',
    end: '2017.11',
    highlights: [
      'Developed a novel nonlinear optical spectrometer based on supercontinuum.',
      'Developed a numerical model for double pump-probe interactions in new Ir(III) complexes.',
      'Led an NSF I-Corps program exploring commercialization of laser refrigeration technology for thermal management in electronics.',
      'Funded by the UCF Pre-eminent Postdoctoral Program (P3) and an NSF I-Corps Site Grant.',
    ],
  },
  {
    role: 'Graduate Research Assistant',
    org: 'CREOL, University of Central Florida',
    location: 'Orlando, FL',
    start: '2012.08',
    end: '2016.10',
    highlights: [
      'First-ever observation of nondegenerate nonlinear refraction and three-photon absorption in semiconductors, and molecular responses in solvents and gases.',
      'Pioneered a novel two-photon, FRET-enhanced photochromic molecule for strong, broadband optical limiting applications.',
    ],
  },
  {
    role: 'Graduate Research and Teaching Assistant',
    org: 'Case Western Reserve University',
    location: 'Cleveland, OH',
    start: '2010.08',
    end: '2012.08',
    highlights: [
      'Designed (using FDTD) and fabricated micro-dome structures to enhance the light extraction efficiency of III-nitride based LEDs.',
    ],
  },
];

export const CV_EDUCATION: CVEducation[] = [
  {
    degree: 'Ph.D. in Optics and Photonics',
    org: 'University of Central Florida, CREOL',
    start: '2012.08',
    end: '2016.10',
    detail: 'Advisors: Eric W. Van Stryland and David J. Hagan. Dissertation: Ultrafast Mechanisms of Nonlinear Refraction and Two-photon Photochromism.',
  },
  {
    degree: 'M.S. in Electrical Engineering',
    org: 'Case Western Reserve University, EECS',
    start: '2010.08',
    end: '2012.08',
    detail: 'Advisor: Hongping Zhao. Thesis: Analysis of Light Extraction Efficiency Enhancement for Deep Ultraviolet and Visible Light-Emitting Diodes with III-Nitride Micro Domes.',
  },
  {
    degree: 'B.S. in Measuring and Controlling Technology and Instruments',
    org: 'Tianjin University',
    start: '2006.08',
    end: '2010.08',
    detail: 'Precision Instruments and Optoelectronics Engineering. Thesis: Design and optimization of a mobile LED backlight module.',
  },
];

export const CV_PATENTS: CVPatent[] = [
  { title: 'Cylindrical Retroreflector Array for Rotation Tracking', number: 'US 2023/0086536 A1', status: 'Issued', date: '2023.03' },
  { title: 'Optical Sensing of Translational and Rotational Shaft Movements', number: 'US 63/541,246', status: 'Filed' },
  { title: 'Single Photon Avalanche Diodes for Rotational and Translational Input Detection', number: 'US 18/892,374', status: 'Filed' },
];

export const CV_LINKS = {
  email: 'peng.zhao1@outlook.com',
  location: 'SF Bay Area, CA',
  github: 'https://github.com/pengzhao-ai',
  linkedin: 'https://www.linkedin.com/in/peng-zhao-nlo/',
  scholar: 'https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1',
  orcid: 'https://orcid.org/0000-0001-6370-4206',
  x: 'https://x.com/pengzha0',
  resumePdf: '/resume.pdf',
};
```

- [ ] **Step 2: Write CVEntry.astro**

Create `src/components/portfolio/CVEntry.astro`:

```astro
---
import type { CVEntryData } from '~/data/cv';

interface Props {
  entry: CVEntryData;
}

const { entry } = Astro.props;
const period = entry.current ? `${entry.start} — Present` : `${entry.start} — ${entry.end}`;
---

<div class="grid gap-1 border-b border-slate-200 py-6 last:border-0 md:grid-cols-[10rem_1fr] md:gap-6 dark:border-slate-800">
  <p class="font-mono text-xs leading-6 whitespace-nowrap text-muted">{period}</p>

  <div>
    <h3 class="font-heading text-lg font-semibold text-heading">
      {entry.role}
      <span class="font-normal text-default">· {entry.org}</span>
    </h3>
    {entry.location && <p class="font-mono text-xs text-muted">{entry.location}</p>}

    <ul class="mt-3 list-none space-y-2">
      {
        entry.highlights.map((highlight) => (
          <li class="flex gap-2 text-sm text-muted">
            <span class="mt-[0.55rem] h-px w-3 shrink-0 bg-primary/50" aria-hidden="true" />
            <span>{highlight}</span>
          </li>
        ))
      }
    </ul>
  </div>
</div>
```

- [ ] **Step 3: Write the CV page**

Create `src/pages/cv.astro`:

```astro
---
import { Icon } from 'astro-icon/components';
import Layout from '~/layouts/PageLayout.astro';
import WidgetWrapper from '~/components/ui/WidgetWrapper.astro';
import Button from '~/components/ui/Button.astro';
import Badge from '~/components/portfolio/Badge.astro';
import CVEntry from '~/components/portfolio/CVEntry.astro';
import { CV_SUMMARY, CV_EXPERIENCE, CV_EDUCATION, CV_PATENTS, CV_LINKS } from '~/data/cv';
import { HEADLINE_METRICS } from '~/data/metrics';

const metadata = {
  title: 'CV',
  description: 'Curriculum vitae — optical systems, sensing hardware, and imaging engineering.',
};
---

<Layout metadata={metadata}>
  <WidgetWrapper containerClass="max-w-4xl mx-auto pt-12 md:pt-16">
    <header class="mb-12">
      <h1 class="font-heading text-4xl font-bold tracking-tight text-heading md:text-5xl">Peng Zhao</h1>
      <p class="mt-2 font-mono text-sm text-primary">Optical Systems · Sensing Hardware · Imaging</p>

      <p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
        <span class="inline-flex items-center gap-1"><Icon name="tabler:map-pin" class="h-3.5 w-3.5" />{CV_LINKS.location}</span>
        <a href={`mailto:${CV_LINKS.email}`} class="inline-flex items-center gap-1 hover:text-primary">
          <Icon name="tabler:mail" class="h-3.5 w-3.5" />{CV_LINKS.email}
        </a>
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <Button variant="primary" text="Download PDF" href={CV_LINKS.resumePdf} target="_blank" icon="tabler:download" />
        <Button variant="secondary" text="LinkedIn" href={CV_LINKS.linkedin} target="_blank" icon="tabler:brand-linkedin" />
        <Button variant="secondary" text="Google Scholar" href={CV_LINKS.scholar} target="_blank" icon="tabler:school" />
      </div>
    </header>

    <p class="mb-10 text-default text-pretty">{CV_SUMMARY}</p>

    <dl class="mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
      {
        HEADLINE_METRICS.map((metric) => (
          <div class="bg-page px-5 py-4">
            <dt class="font-mono text-xs uppercase tracking-wider text-muted">{metric.label}</dt>
            <dd class="mt-1 font-heading text-3xl font-semibold text-heading">{metric.value}</dd>
          </div>
        ))
      }

    </dl>

    <section class="mb-12">
      <h2 class="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">Experience</h2>
      {CV_EXPERIENCE.map((entry) => <CVEntry entry={entry} />)}
    </section>

    <section class="mb-12">
      <h2 class="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">Education</h2>
      {
        CV_EDUCATION.map((item) => (
          <div class="grid gap-1 border-b border-slate-200 py-6 last:border-0 md:grid-cols-[10rem_1fr] md:gap-6 dark:border-slate-800">
            <p class="font-mono text-xs leading-6 whitespace-nowrap text-muted">{item.start} — {item.end}</p>
            <div>
              <h3 class="font-heading text-lg font-semibold text-heading">{item.degree}</h3>
              <p class="text-default">{item.org}</p>
              {item.detail && <p class="mt-2 text-sm text-muted">{item.detail}</p>}
            </div>
          </div>
        ))
      }
    </section>

    <section>
      <h2 class="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">Patents</h2>
      {
        CV_PATENTS.map((patent) => (
          <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 py-4 last:border-0 dark:border-slate-800">
            <div>
              <h3 class="font-semibold text-heading">{patent.title}</h3>
              <p class="font-mono text-xs text-muted">{patent.number}{patent.date ? ` · ${patent.date}` : ''}</p>
            </div>
            <Badge label={patent.status} tone={patent.status === 'Issued' ? 'primary' : 'default'} />
          </div>
        ))
      }
    </section>
  </WidgetWrapper>
</Layout>
```

- [ ] **Step 4: Add print styles**

Append to `src/assets/styles/tailwind.css`:

```css
/* /cv prints as a clean document: no chrome, no interactive affordances. */
@media print {
  #header,
  footer,
  [data-aw-toggle-menu],
  .btn {
    display: none !important;
  }

  body {
    background: #fff !important;
    color: #000 !important;
  }

  main,
  .container {
    max-width: none !important;
    padding: 0 !important;
  }

  section,
  article {
    break-inside: avoid;
  }

  a[href^='http']::after {
    content: ' (' attr(href) ')';
    font-size: 0.75em;
    color: #555;
  }
}
```

If `#header` or `footer` are not the actual element IDs in `PageLayout.astro`, use the real selectors — check with `grep -n 'id="header"\|<footer' src/components/widgets/Header.astro src/components/widgets/Footer.astro` before finalising.

- [ ] **Step 5: Copy the résumé PDF**

```bash
cp "artifacts/Peng Zhao Resume - 02062026.pdf" public/resume.pdf
```

- [ ] **Step 6: Verify the PDF is byte-identical**

```bash
shasum -a 256 "artifacts/Peng Zhao Resume - 02062026.pdf" public/resume.pdf
```

Expected: two identical hashes. The PDF must not be regenerated, edited, or re-compressed.

- [ ] **Step 7: Verify no phone number is rendered**

```bash
npm run build
grep -rE '\(?\+?1\)?[-. ]?407[-. ]?491[-. ]?7544' dist/ && echo "PHONE NUMBER PRESENT — fix before proceeding" || echo "OK: no phone number in built HTML"
```

Expected: `OK: no phone number in built HTML`. The PDF itself contains the number — that is the owner's informed choice (spec D9) — but no HTML page may.

- [ ] **Step 8: Verify the routes and the download link**

```bash
ls dist/cv/index.html dist/resume.pdf
grep -o 'href="/resume.pdf"' dist/cv/index.html | head -1
```

Expected: both files exist and the download link is present.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add CV page with résumé download

Web-rendered CV from a typed data module, print stylesheet, and the
owner's original résumé PDF served unmodified."
```

---

### Task 9: Home page, social links, and final navigation

Assemble the home page from the components the previous tasks built, and install the real header and footer navigation.

**Files:**
- Create: `src/data/socials.ts`, `src/components/portfolio/SocialLinks.astro`, `artifacts/socials.md`, `artifacts/resume.md`
- Modify: `src/pages/index.astro`, `src/navigation.ts`, `src/types.d.ts`

**Interfaces:**
- Consumes: `ProjectGrid` (Task 6), `PublicationList` with `variant="compact"` (Task 5), `HEADLINE_METRICS` from `src/data/metrics.ts` (Task 5), `SOCIALS` defined in this task, the `post` collection from Task 4.
- Produces: `<SocialLinks size? />`, used by the home page, footer, and (optionally) the CV page.

- [ ] **Step 1: Add the types**

In `src/types.d.ts`, append:

```ts
export interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

export interface SocialLinks {
  size?: 'compact' | 'default';
  class?: string;
}
```

- [ ] **Step 2: Write the social links module**

Create `src/data/socials.ts`. This file is the single source of truth for the site's social links; `src/navigation.ts` and any page that shows them import from here.

```ts
import type { SocialLink } from '~/types';

/** Order is deliberate: code first, then scholarly, then professional, then social. */
export const SOCIALS: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/pengzhao-ai', icon: 'tabler:brand-github' },
  { label: 'Google Scholar', href: 'https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1', icon: 'tabler:school' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/peng-zhao-nlo/', icon: 'tabler:brand-linkedin' },
  { label: 'ORCID', href: 'https://orcid.org/0000-0001-6370-4206', icon: 'tabler:atom' },
  { label: 'X', href: 'https://x.com/pengzha0', icon: 'tabler:brand-x' },
];
```

ORCID has no reliable Tabler brand glyph, so `tabler:atom` stands in — it reads as a scientific identifier and is visually distinct from the others. Confirm `tabler:brand-x` exists in `@iconify-json/tabler` at this step:

```bash
grep -o '"brand-x"' node_modules/@iconify-json/tabler/icons.json | head -1
grep -o '"school"' node_modules/@iconify-json/tabler/icons.json | head -1
```

If either grep prints nothing, substitute `tabler:brand-twitter` for X and `tabler:certificate` for Scholar.

- [ ] **Step 3: Preserve the raw source notes**

The brief referenced `artifacts/socials.md` and `artifacts/resume.md`, which do not exist — the sources were an `.rtf` and a `.docx`. Transcribe them so the text sources are versioned and future edits start from Markdown.

Create `artifacts/socials.md`:

```markdown
# Social links — raw source

Snapshot transcribed from `artifacts/socialLinks.rtf` on 2026-10-09, for
provenance. The live configuration is `src/data/socials.ts`; edit that file
to change what the site shows.

- GitHub: https://github.com/pengzhao-ai
- ORCID: https://orcid.org/0000-0001-6370-4206
- Google Scholar: https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1
- LinkedIn: https://www.linkedin.com/in/peng-zhao-nlo/
- X: https://x.com/pengzha0
- 知乎: TBD (owner had not decided at time of transcription)
```

Create `artifacts/resume.md` containing the full résumé text as extracted from `artifacts/Peng Zhao Resume - 02062026.docx`, under a heading that states its role:

```markdown
# Résumé — raw source

Transcribed from `artifacts/Peng Zhao Resume - 02062026.docx` on 2026-10-09.
`src/data/cv.ts` is derived from this file and is what the site renders.
The PDF at `public/resume.pdf` is the owner's original and is served
unmodified.

<!-- Paste the full résumé text here, preserving the section structure:
     Profile, Experience, Education, Patents, Publications. -->
```

The owner pastes the body in — the transcription is mechanical and having them confirm it is more reliable than the implementer retyping it.

- [ ] **Step 4: Write SocialLinks.astro**

Create `src/components/portfolio/SocialLinks.astro`:

```astro
---
import { Icon } from 'astro-icon/components';
import { SOCIALS } from '~/data/socials';
import type { SocialLinks as Props } from '~/types';

const { size = 'default', class: className = '' } = Astro.props;
const box = size === 'compact' ? 'h-8 w-8' : 'h-10 w-10';
const glyph = size === 'compact' ? 'h-4 w-4' : 'h-5 w-5';
---

<ul class:list={['flex list-none flex-wrap gap-2', className]}>
  {
    SOCIALS.map((social) => (
      <li>
        <a
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
          title={social.label}
          class:list={[
            'inline-flex items-center justify-center rounded-lg border border-slate-200 text-muted transition hover:border-primary hover:text-primary dark:border-slate-800',
            box,
          ]}
        >
          <Icon name={social.icon} class={glyph} />
        </a>
      </li>
    ))
  }
</ul>
```

- [ ] **Step 5: Write the home page**

Replace `src/pages/index.astro`:

```astro
---
import Layout from '~/layouts/PageLayout.astro';
import Hero from '~/components/widgets/Hero.astro';
import Content from '~/components/widgets/Content.astro';
import Stats from '~/components/widgets/Stats.astro';
import BlogLatestPosts from '~/components/widgets/BlogLatestPosts.astro';
import CallToAction from '~/components/widgets/CallToAction.astro';
import WidgetWrapper from '~/components/ui/WidgetWrapper.astro';
import Headline from '~/components/ui/Headline.astro';
import PublicationList from '~/components/portfolio/PublicationList.astro';
import ProjectGrid from '~/components/portfolio/ProjectGrid.astro';
import SocialLinks from '~/components/portfolio/SocialLinks.astro';
import { getCollection } from 'astro:content';
import { HEADLINE_METRICS } from '~/data/metrics';
import { PUBLICATIONS } from '~/data/publications';
import { getPermalink } from '~/utils/permalinks';
import type { ProjectCard } from '~/types';

const metadata = {
  title: 'Peng Zhao — Optical Systems, Imaging, and Edge AI',
  ignoreTitleTemplate: true,
};

const projectEntries = await getCollection('project');
const featuredProjects: ProjectCard[] = projectEntries
  .map((entry) => ({ id: entry.id, ...entry.data }))
  .filter((project) => project.featured)
  .sort((a, b) => b.weight - a.weight)
  .slice(0, 3);

const featuredPublications = PUBLICATIONS.filter((publication) => publication.featured).slice(0, 3);
---

<Layout metadata={metadata}>
  <Hero
    badge="Optical Systems · Imaging · Edge AI"
    tagline="Hardware and AI, from concept to production"
    title="Peng Zhao"
  >
    <Fragment slot="subtitle">
      Camera and optical systems engineer. I design the optics, sensors, and imaging pipelines behind products
      that have shipped at scale — and the frameworks that let teams predict how they will perform before
      anything is built.
    </Fragment>
    <Fragment slot="actions">
      <div class="flex flex-col gap-4 sm:flex-row">
        <a
          href={getPermalink('/projects')}
          class="btn btn-primary w-full sm:w-auto"
        >
          View projects
        </a>
        <a href={getPermalink('/cv')} class="btn btn-secondary w-full sm:w-auto">Download CV</a>
      </div>
      <SocialLinks class="mt-8 justify-center" />
    </Fragment>
  </Hero>

  <Stats
    countUp
    stats={HEADLINE_METRICS.map((metric) => ({ amount: metric.value, title: metric.label }))}
  />

  {featuredProjects.length > 0 && (
    <WidgetWrapper containerClass="max-w-7xl mx-auto">
      <Headline
        tagline="Projects"
        title="Systems that shipped"
        subtitle="Optical and hardware architectures taken from concept through mass production."
        classes={{ container: 'max-w-3xl' }}
      />
      <ProjectGrid items={featuredProjects} columns={3} showComponents={false} />
      <div class="mt-10 text-center">
        <a href={getPermalink('/projects')} class="btn btn-secondary">All projects</a>
      </div>
    </WidgetWrapper>
  )}

  {featuredPublications.length > 0 && (
    <WidgetWrapper containerClass="max-w-4xl mx-auto">
      <Headline
        tagline="Publications"
        title="Selected papers and patents"
        classes={{ container: 'max-w-3xl' }}
      />
      <PublicationList items={featuredPublications} variant="compact" />
      <div class="mt-10 text-center">
        <a href={getPermalink('/publications')} class="btn btn-secondary">All publications</a>
      </div>
    </WidgetWrapper>
  )}

  <BlogLatestPosts
    title="Writing"
    linkText="All posts"
    information="Notes on optical design, hardware that has to ship, and where AI genuinely helps."
    count={3}
  />

  <CallToAction
    actions={[
      { variant: 'primary', text: 'Get in touch', href: `mailto:${'peng.zhao1@outlook.com'}`, icon: 'tabler:mail' },
      { text: 'Download CV', href: getPermalink('/cv'), icon: 'tabler:download' },
    ]}
  >
    <Fragment slot="title">Let's build something that ships.</Fragment>
    <Fragment slot="subtitle">
      I'm interested in optical and sensing systems where the hard part is making the physics survive production.
    </Fragment>
  </CallToAction>
</Layout>
```

Both conditional sections are guarded, so the home page degrades to hero + stats + writing + CTA when nothing is featured, rather than rendering empty headings.

The `actions` slot is rendered with `set:html`, so the `<div>` and `<SocialLinks>` inside it are passed through as pre-rendered HTML. If `SocialLinks` fails to render inside a `set:html` slot, move it out of the Hero into its own centred wrapper immediately after the Hero — the visual result is equivalent.

- [ ] **Step 6: Install the final navigation**

Replace `src/navigation.ts`:

```ts
import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';
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
  actions: [
    {
      text: 'Résumé',
      href: getAsset('/resume.pdf'),
      target: '_blank',
      icon: 'tabler:download',
    },
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
  socialLinks: SOCIALS.map((social) => ({
    ariaLabel: social.label,
    icon: social.icon,
    href: social.href,
  })),
  footNote: `&copy; ${new Date().getFullYear()} Peng Zhao. Built with <a class="text-blue-600 underline dark:text-muted" href="https://github.com/arthelokyo/astrowind">AstroWind</a> (MIT).`,
};
```

The AstroWind attribution in `footNote` and `LICENSE.md` satisfies the MIT licence. Do not remove it.

- [ ] **Step 7: Verify the build**

```bash
npm run check && npm run build
```

Expected: clean.

- [ ] **Step 8: Verify every nav target exists**

```bash
for p in / /publications /projects /photography /blog /cv; do
  f="dist${p%/}/index.html"
  [ "$p" = "/" ] && f="dist/index.html"
  test -f "$f" && echo "OK   $p" || echo "MISS $p"
done
test -f dist/resume.pdf && echo "OK   /resume.pdf" || echo "MISS /resume.pdf"
```

Expected: seven `OK` lines, no `MISS`.

- [ ] **Step 9: Verify the header fits at the lg breakpoint**

The template's own `customize-header` skill warns that five items fit in roughly 470 px at `lg`. Six items plus an action button may overflow.

Start the dev server and inspect at exactly 1024 px:

```bash
npm run dev
```

Open `http://localhost:4321`, set the viewport to 1024 px wide, and confirm the nav items and the Résumé button sit on one line without wrapping or overlapping the logo. **If they overflow**, shorten `Photography` to `Photos` in `headerData.links` (the page title stays "Photography") and re-check. Record the outcome in the commit message.

- [ ] **Step 10: Verify the light and dark themes**

With the dev server running, toggle the theme and confirm on `/`, `/publications`, `/projects`, `/photography`, and `/cv`:

- Body text is legible against the page background in both modes.
- Cobalt `#2563EB` in light mode and `#60A5FA` in dark mode are both clearly visible on buttons and links.
- No element retains a hard-coded colour that clashes with the palette.
- Section headings use Space Grotesk; badges and metadata use JetBrains Mono.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: assemble home page, social links, and navigation

Home composes the hero, metrics, featured projects, selected
publications, latest writing, and a contact call to action. Header and
footer carry the six-route navigation."
```

---

### Task 10: Documentation

Make the repository self-describing, so adding content later needs no archaeology.

**Files:**
- Modify: `README.md`, `AGENTS.md`
- Create: `.agents/skills/add-publication.md`, `.agents/skills/add-project.md`, `.agents/skills/add-photograph.md`

**Interfaces:**
- Consumes: everything built so far.
- Produces: no code.

- [ ] **Step 1: Replace the README**

Replace `README.md` with:

````markdown
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

| To add a… | Do this | Then |
| --- | --- | --- |
| Blog post | Drop a `.md` file in `artifacts/blog/` | `npm run sync:posts` to preview, `npm run sync:posts -- --write` to publish |
| Project | Add an `.mdx` file in `src/content/projects/` | nothing — it appears on `/projects` |
| Publication | Append an object to `PUBLICATIONS` in `src/data/publications.ts` | nothing — it appears on `/publications` |
| Photograph | Drop a `.jpg` in `src/assets/images/photography/<category>/` | `npm run prepare:assets` if it is a camera original, then rebuild |
| CV entry | Edit `src/data/cv.ts` | nothing — `/cv` re-renders |
| Social link | Edit `src/data/socials.ts` | nothing — header, footer, and home all read it |

`.agents/skills/` documents each workflow in more detail, in a format AI coding
assistants can follow.

## How the scripts work

Both scripts are dry-run-first and safe to re-run.

- **`scripts/sync-posts.mjs`** — reads raw Markdown from `artifacts/blog/`, infers the frontmatter AstroWind
  needs (title, date, excerpt, tags, category, draft status), and writes to `src/data/post/`. It tracks what it
  wrote in `scripts/.sync-state.json` and refuses to overwrite a file that was edited by hand since the last
  sync. `artifacts/blog/` is the source of truth; `src/data/post/` is generated.
- **`scripts/prepare-assets.mjs`** — downscales camera originals from `artifacts/` into
  `src/assets/images/` and strips all EXIF, including GPS. Originals stay out of git; the optimized copies are
  committed.
- **`scripts/verify-build.mjs`** — asserts the built output has every route, carries no template identifiers,
  and leaks no personal contact details. Run after `npm run build`.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub
Pages. The repository must have **Settings → Pages → Source** set to **GitHub Actions**.

`src/config.yaml` sets `site: 'https://pengzhao-ai.github.io'` and `base: '/'`.

## Licence

Site content © Peng Zhao. Template: [AstroWind](https://github.com/arthelokyo/astrowind), MIT — see
`LICENSE.md`.
````

- [ ] **Step 2: Extend AGENTS.md**

Append a section to `AGENTS.md`, after the "Architecture" section:

````markdown
## Site-specific conventions

This repository is an AstroWind clone customised as a personal portfolio. The template
conventions above still apply; these are the additions.

### Content lives in data modules, not in pages

| Content | Source of truth |
| --- | --- |
| Blog posts | `artifacts/blog/*.md` → generated into `src/data/post/` |
| Projects | `src/content/projects/*.mdx` (content collection, zod-typed) |
| Publications | `src/data/publications.ts` |
| CV | `src/data/cv.ts` |
| Social links | `src/data/socials.ts` |
| Photography | `src/assets/images/photography/<category>/` + overrides in `src/data/photography.ts` |

**Never edit `src/data/post/` directly** — it is generated by `scripts/sync-posts.mjs`, which will report a
conflict against a hand edit. Edit the draft in `artifacts/blog/` instead.

### Portfolio components

`src/components/portfolio/` holds components specific to this site; `src/components/widgets/` and
`src/components/ui/` are the template's and should be preferred when one fits.

| Component | Use |
| --- | --- |
| `Badge.astro` | Mono chips for tags, statuses, and venue types |
| `ProjectGrid.astro` | Project cards — stack tags, hardware components, case-study link |
| `PublicationList.astro` | Publication rows; `variant="compact"` for the home page |
| `FilterBar.astro` | Progressive-enhancement tag filter over `[data-filterable]` |
| `PhotoGrid.astro` | Masonry gallery preserving native aspect ratios, with a lightbox |
| `CVEntry.astro` | A dense résumé row |
| `SocialLinks.astro` | Social icon row, driven by `src/data/socials.ts` |

### Design tokens

- Fonts: Inter (UI), Space Grotesk (`font-heading`), JetBrains Mono (`font-mono`, for all technical labels).
- Colours: the `--aw-*` variables in `src/components/CustomStyles.astro`, light and dark. Prefer the semantic
  utilities (`text-heading`, `text-muted`, `bg-page`, `text-primary`) over hard-coded Tailwind colours.

### Scripts

`npm test` runs `node --test` over `scripts/tests/`. There is no test framework dependency; Node 22's built-in
runner is used deliberately. Add tests for any new logic in `scripts/`.

### Privacy constraints

- All committed images must have EXIF stripped — the repository is public and camera originals carry GPS.
- No phone number may appear in any rendered page.
- `public/resume.pdf` is the owner's original and must remain byte-identical.
````

- [ ] **Step 3: Write the three content skills**

Create `.agents/skills/add-publication.md`:

```markdown
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
  tags: ['Optics'],               // from PUBLICATION_TAGS
  doi: '10.1364/OE.123456',       // optional — renders a DOI link
  pdf: 'https://…',               // optional
  code: 'https://github.com/…',   // optional
  abstract: 'One paragraph.',     // optional — behind an expander
  featured: true,                 // optional — surfaces on the home page
}
```

## Rules

- `tags` must come from `PUBLICATION_TAGS`; a tag outside the list renders but
  is not filterable.
- `doi` may be a bare DOI or a full `https://doi.org/…` URL — both render correctly.
- Omit `pdf` and `code` entirely rather than passing an empty string.
- Setting `featured: true` on at least one entry makes the "Selected papers and
  patents" section appear on the home page. With none featured, the section is hidden.
```

Create `.agents/skills/add-project.md`:

```markdown
# Add a Project

## Steps

1. Create `src/content/projects/<kebab-case-name>.mdx`.
2. Fill in the frontmatter (validated by the `project` collection schema in `src/content.config.ts`).
3. Write the case study as the body.
4. Run `npm run check && npm run build`.

## Frontmatter

```yaml
---
title: 'Project title'            # required
summary: 'One or two sentences.'  # required, used on the card and as the meta description
year: 2024                        # required
role: 'Optical Design'            # optional
status: 'shipped'                 # optional: shipped | in-progress | research
stack: ['Optics', 'NIR']          # tech-stack badges
components: ['Lens stack', 'ASIC']# hardware parts list, rendered in mono
repo: 'https://github.com/…'      # optional, must be a valid URL
demo: 'https://…'                 # optional, must be a valid URL
image: '~/assets/images/…'        # optional card image
imageAlt: 'What the image shows'
featured: true                    # show on the home page
weight: 10                        # sort order, higher first
---
```

## Rules

- The filename becomes the URL: `src/content/projects/foo-bar.mdx` → `/projects/foo-bar`.
- Omit `repo` and `demo` entirely rather than leaving them empty — the schema rejects `''` as a URL.
- `components` renders as a mono spec list, which is the point of this site's
  project cards. Include the real parts where they are public knowledge.
- Write only at the level of detail already public in the owner's résumé. No
  employer-internal measurements, yields, or unreleased products.
```

Create `.agents/skills/add-photograph.md`:

```markdown
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
```

- [ ] **Step 4: Verify Prettier is happy with the new Markdown**

```bash
npm run check:prettier
```

Expected: pass. If Prettier reformats the Markdown files, run `npm run fix` and commit the result — the repo is Prettier-clean and must stay so.

- [ ] **Step 5: Verify the documented commands exist**

```bash
node -e "const s=require('./package.json').scripts; for (const k of ['test','prepare:assets','sync:posts','verify:build']) if(!s[k]) throw new Error('missing script: '+k); console.log('OK: all documented scripts exist')"
```

Expected: `OK: all documented scripts exist`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: document content workflows and site conventions

Replace the template README, extend AGENTS.md with the site-specific
architecture, and add skills for the three other content types."
```

---

### Task 11: Deployment and final verification

Add the deploy workflow and an automated check over the built output, then prove the whole spec holds.

**Files:**
- Create: `.github/workflows/deploy.yml`, `scripts/verify-build.mjs`
- Modify: nothing

**Interfaces:**
- Consumes: `dist/` produced by `npm run build`, and `public/resume.pdf` (Task 8).
- Produces: `npm run verify:build`, exiting non-zero on any failed assertion.

- [ ] **Step 1: Write the build verification script**

Create `scripts/verify-build.mjs`:

```js
#!/usr/bin/env node
/**
 * Assert the invariants the spec promises about the built site.
 *
 * Runs against dist/, so `npm run build` must run first. Exits non-zero and
 * lists every failure rather than stopping at the first, so one run tells you
 * everything that is wrong.
 *
 * Run: npm run verify:build
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const exists = (p) =>
  stat(p).then(
    () => true,
    () => false
  );

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

// 1. Every route the navigation promises exists.
const ROUTES = [
  'index.html',
  'publications/index.html',
  'projects/index.html',
  'photography/index.html',
  'cv/index.html',
  'blog/index.html',
  '404.html',
  'rss.xml',
  'sitemap-index.xml',
  'resume.pdf',
];

for (const route of ROUTES) {
  check(await exists(path.join(DIST, route)), `missing route: /${route}`);
}

// 2. Every project has a case-study page.
const projectDir = path.join(ROOT, 'src', 'content', 'projects');
if (await exists(projectDir)) {
  for (const file of await readdir(projectDir)) {
    if (!file.endsWith('.mdx')) continue;
    const slug = path.basename(file, '.mdx');
    check(await exists(path.join(DIST, 'projects', slug, 'index.html')), `missing project page: /projects/${slug}`);
  }
}

// 3. No template identifiers survive anywhere in the output.
const FORBIDDEN = ['astrowind.vercel.app', '@arthelokyo', 'arthelokyo', 'googleSiteVerificationId'];

// 4. No personal phone number in any rendered HTML or XML.
const PHONE = /\(?\+?1\)?[-.\s]?407[-.\s]?491[-.\s]?7544/;

const textFiles = [];
for await (const file of walk(DIST)) {
  if (/\.(html|xml|css|js|json|txt)$/.test(file)) textFiles.push(file);
}

for (const file of textFiles) {
  const rel = path.relative(DIST, file);
  const content = await readFile(file, 'utf8');

  for (const needle of FORBIDDEN) {
    check(!content.includes(needle), `template identifier "${needle}" found in dist/${rel}`);
  }
  check(!PHONE.test(content), `phone number found in dist/${rel}`);
}

// 5. No double-prefixed URLs (base is '/', so this should be impossible —
//    the check stays as a guard against a future base-path change).
for (const file of textFiles) {
  const content = await readFile(file, 'utf8');
  check(!content.includes('//pengzhao-ai.github.io/'), `double-prefixed URL in dist/${path.relative(DIST, file)}`);
}

// 6. pagefind/pdf sanity: the résumé PDF is byte-identical to the original.
const originalPdf = path.join(ROOT, 'artifacts', 'Peng Zhao Resume - 02062026.pdf');
const shippedPdf = path.join(DIST, 'resume.pdf');
if (await exists(originalPdf)) {
  const hash = (buf) => createHash('sha256').update(buf).digest('hex');
  const [a, b] = await Promise.all([readFile(originalPdf), readFile(shippedPdf)]);
  check(hash(a) === hash(b), 'public/resume.pdf differs from the owner\'s original PDF');
}

// 7. The site name reached the metadata.
const home = await readFile(path.join(DIST, 'index.html'), 'utf8');
check(home.includes('Peng Zhao'), 'home page does not contain the owner\'s name');

if (failures.length) {
  console.error(`\n✗ ${failures.length} verification failure(s):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ build verification passed (${textFiles.length} files scanned)`);
```

Remove check 5's comment reference if `base` ever changes — as written it guards the current configuration.

- [ ] **Step 2: Run the verification**

```bash
npm run build && npm run verify:build
```

Expected: `✓ build verification passed (N files scanned)`.

If failures appear, fix the cause rather than the check. Common causes: a demo page survived deletion, a caption or footer still carries a template identifier, or `public/resume.pdf` was regenerated instead of copied.

- [ ] **Step 3: Write the deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

# One deploy at a time. Queued runs wait rather than cancelling, so a push
# that lands mid-deploy still reaches production.
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Verify build output
        run: npm run verify:build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    name: Deploy
    needs: build
    runs-on: ubuntu-latest

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Note `verify:build` runs inside the build job. This makes the workflow fail on a phone number leaking into the output or a template identifier resurfacing — the spec's invariants are enforced on every deploy, not only locally. The `Original PDF` check degrades gracefully in CI: `artifacts/*.pdf` is gitignored, so the check is skipped there and enforced locally.

- [ ] **Step 4: Verify the workflow is valid YAML and well-formed**

```bash
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
const wf = yaml.load(fs.readFileSync('.github/workflows/deploy.yml','utf8'));
const perms = wf.jobs.build.steps.length && wf.permissions;
if (perms.contents !== 'read' || perms['pages'] !== 'write' || perms['id-token'] !== 'write') throw new Error('permissions wrong');
if (!wf.on.push.branches.includes('main')) throw new Error('missing main trigger');
const steps = wf.jobs.build.steps.map(s => s.uses || s.run).join('|');
for (const needle of ['actions/checkout','actions/setup-node','npm ci','npm run build','actions/upload-pages-artifact','actions/deploy-pages']) {
  if (!steps.includes(needle) && !JSON.stringify(wf.jobs.deploy.steps).includes(needle)) throw new Error('missing step: '+needle);
}
console.log('OK: deploy.yml is well-formed');
"
```

Expected: `OK: deploy.yml is well-formed`.

- [ ] **Step 5: Confirm the config values the deploy depends on**

```bash
grep -n "site: 'https://pengzhao-ai.github.io'" src/config.yaml
grep -n "base: '/'" src/config.yaml
```

Expected: both lines found.

- [ ] **Step 6: Run the full verification suite**

```bash
npm run check
npm test
npm run build
npm run verify:build
```

Expected: all four clean.

- [ ] **Step 7: Review the spec's verification list**

Work through spec §10 and confirm each item, fixing any that fail:

1. `npm ci` completes; `npm run check` clean — step 6.
2. `npm run build` clean, no unresolved-image warnings — step 6.
3. Project frontmatter validates against the collection schema — `npm run check:astro`.
4. All routes in `dist/` — `verify:build` check 1.
5. Zero template identifiers in `dist/` — `verify:build` check 3.
6. No demo posts in the built blog — `ls dist/blog/` and confirm only the owner's post appears.
7. No phone number in any rendered page — `verify:build` check 4.
8. `public/resume.pdf` byte-identical — `verify:build` check 6.
9. No EXIF/GPS in committed images — the Task 2 step 8 scan.
10. Navigation renders without overflow at 1024 px — the Task 9 step 9 check.
11. Publication filter degrades correctly — disable JavaScript, load `/publications`, confirm all entries show.
12. `/cv` prints cleanly — print-preview `/cv`, confirm no header, no footer, no clipped content.
13. Sync idempotence — the Task 4 step 8 check.
14. Sync conflict detection — the Task 4 step 9 check.
15. Asset pipeline idempotence — the Task 2 step 9 check.
16. Deploy succeeds on push to `main` — step 8 below.
17. `/rss.xml` and `/sitemap-index.xml` resolve live — step 8 below.

- [ ] **Step 8: Commit, then hand off the merge and the Pages setting**

```bash
git add -A
git commit -m "feat: add GitHub Pages deployment workflow

Deploys on pushes to main via actions/deploy-pages, and runs the build
verification so output invariants are enforced on every deploy."
```

Two actions remain, and both belong to the owner:

1. **Set Pages source.** Repository → Settings → Pages → Source = **GitHub Actions**. Alternatively, with an
   admin-scoped `gh` token:
   ```bash
   gh api -X PUT repos/pengzhao-ai/pengzhao-ai.github.io/pages -f build_type=workflow
   ```
   Without this, `deploy-pages` fails after a successful build.

2. **Merge `feat/portfolio-skeleton` into `main`.** The merge is what triggers the first production deploy.

After the first deploy, confirm:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://pengzhao-ai.github.io
curl -sS -o /dev/null -w '%{http_code}\n' https://pengzhao-ai.github.io/rss.xml
curl -sS -o /dev/null -w '%{http_code}\n' https://pengzhao-ai.github.io/sitemap-index.xml
```

Expected: `200` three times.

---

## Handoff notes for the owner

After the plan is executed, these are the things only you can decide or provide:

- **Journal and conference papers.** `PUBLICATIONS` ships with your three patents. Add the 13 journal articles and
  8 refereed proceedings to `src/data/publications.ts` — see `.agents/skills/add-publication.md`.
- **Featured content.** No publication or project is marked `featured` beyond the three seed projects, so the home
  page shows projects but hides the publications section. Set `featured: true` on the papers you want on the home
  page.
- **Photograph captions.** `PHOTO_OVERRIDES` in `src/data/photography.ts` ships empty. Photos render with filenames
  as alt text until you add titles, locations, and real alt text.
- **`artifacts/resume.md`.** A stub awaiting your paste of the résumé text, so future CV edits start from Markdown
  rather than the `.docx`.
- **Your Google Search Console verification ID**, once you register the site. `src/config.yaml` currently has none.
- **The 知乎 link**, if you want it in the footer — it was marked TBD in the source notes.



