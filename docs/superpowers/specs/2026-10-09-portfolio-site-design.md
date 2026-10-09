# Peng Zhao — Precision Deep Tech Portfolio: Design Spec

**Date:** 2026-10-09
**Status:** Approved (design sections reviewed and accepted by the site owner)
**Repository:** `pengzhao-ai/pengzhao-ai.github.io`
**Target URL:** https://pengzhao-ai.github.io

---

## 1. Purpose

Build a professional portfolio site for Peng Zhao — a camera and optical systems engineer working at the
intersection of hardware, optics, and AI — on top of the AstroWind template, deployed to GitHub Pages.

The site is not a blog with a résumé attached. It is an engineering portfolio whose credibility comes from
density and precision: real system work, real publications, real patents, real hardware, presented with a high
signal-to-noise ratio.

### Success criteria

1. Six routes are live, populated with the owner's real content, and visually coherent:
   `/`, `/publications`, `/projects`, `/photography`, `/cv`, `/blog`.
2. **Adding content later never requires editing page markup.** A new publication is one object in a data file;
   a new project is one `.mdx` file; a new photo is one file dropped in a folder; a new post is one draft in
   `artifacts/blog/` plus one sync command.
3. Every push to `main` deploys automatically to GitHub Pages.
4. No trace of AstroWind's demo content, demo branding, or the template author's identifiers remains in the
   built output.
5. No personal data beyond what the owner has approved appears in the built site.

### Non-goals

- A CMS. Content is edited in the repository.
- Comments, analytics accounts, newsletter signup, or contact forms. (Google Analytics is wired in the template
  but left unconfigured; the owner can add an ID later.)
- Server-side rendering or dynamic routes. The site is fully static.
- Migrating the built-in blog to a different content system. AstroWind's blog routes, taxonomy pages, RSS feed,
  and sitemap integration are used as-is.

---

## 2. Starting point

The repository is a clean clone of AstroWind `v1.0.0-beta.66` (Astro v7, Tailwind CSS v4, TypeScript 5.9,
Node >= 22.22.3) with the template's demo content intact. `node_modules` is not installed.

Relevant template capabilities confirmed present and reused:

| Capability | Location |
| --- | --- |
| Theming via CSS variables (light + dark) | `src/components/CustomStyles.astro` |
| Tailwind v4 tokens and utilities | `src/assets/styles/tailwind.css` |
| Native Fonts API (Inter already wired) | `astro.config.ts` `fonts[]`, injected at `src/layouts/Layout.astro:35` |
| Post content collection | `src/content.config.ts` (`glob` loader, `src/data/post`) |
| Blog routes, taxonomy, RSS | `src/pages/[...blog]/`, `src/pages/rss.xml.ts` |
| Image component (Sharp + responsive srcset) | `src/components/common/Image.astro` |
| Widgets: `Hero`, `Stats`, `Features`, `Content`, `Timeline`, `BlogLatestPosts`, `CallToAction` | `src/components/widgets/` |
| Gallery with native-`<dialog>` lightbox | `src/components/widgets/Gallery.astro` |
| CI running `npm run check` + `npm run build` | `.github/workflows/actions.yaml` |

Dependencies already present that the new scripts rely on: `sharp` (image processing), `limax` (slug
transliteration), `js-yaml` (frontmatter parsing). **No new runtime dependencies are introduced by this work.**

### Artifact audit (source material)

| Brief expected | Actually present | Handling |
| --- | --- | --- |
| `artifacts/resume.md` | `Peng Zhao Resume - 02062026.docx` and `.pdf` | Text extracted from the `.docx`; not re-derived |
| `artifacts/socials.md` | `artifacts/socialLinks.rtf` | Text extracted from the `.rtf` |
| `artifacts/blog/*.md` | directory empty | Pipeline built; one sample post authored (see §7) |
| `artifacts/photography/` | 9 JPGs, 6–20 MB, ~129 MB total, 2660–6000 px | Downscaled copies committed; originals gitignored (§8) |
| `artifacts/profile.jpg` | `artifacts/Profile.jpg`, 1792×2400, 2.7 MB | Downscaled copy committed |

Photography categories on disk: `landscape` (4), `wildlife` (4), `macro` (1), `protrait` (1 — misspelled),
`streets` (0 — empty).

Owner data extracted and approved for use: professional history (Meta 2024–present, Apple 2020–2024, ASML
2017–2020, CREOL/UCF postdoc and graduate research, Case Western), education (PhD UCF CREOL, MS CWRU,
BS Tianjin University), 3 issued/filed patents, 20+ peer-reviewed papers, 750+ citations, h-index 11, and
social profiles (GitHub `pengzhao-ai`, ORCID `0000-0001-6370-4206`, Google Scholar `w0H4EiQAAAAJ`,
LinkedIn `peng-zhao-nlo`, X `@pengzha0`; 知乎 marked TBD by the owner and therefore omitted).

---

## 3. Decisions log

| # | Decision | Choice | Rationale |
| --- | --- | --- | --- |
| D1 | Architecture | **Typed data modules + targeted components** (Approach A) | Build-time resolution, full type-safety, filters are plain array operations, matches how AstroWind widgets already consume typed arrays |
| D2 | Blog pipeline scope | Build pipeline **and** author one sample post | Pipeline is proven end-to-end and `/blog` is not empty at launch |
| D3 | Photo originals | Commit downscaled copies; keep originals out of git | 129 MB of binaries would permanently bloat history and slow every deploy |
| D4 | `artifacts/` gitignore scope | Ignore **binaries only**; track text sources | Blog drafts exist nowhere else; a full ignore would make them laptop-only |
| D5 | Publications data | Typed schema seeded with **the 3 patents only** | No structured publication list exists. The 3 patents are verifiable from the owner's résumé; the 13 journals and 8 proceedings are not, so they are left for the owner rather than guessed |
| D6 | Demo content | Delete all demo pages, posts, and wrong-host deploy configs | Keeps the sitemap and build output free of unrelated marketing pages |
| D7 | Projects data shape | **Content collection** (`src/content/projects/*.mdx`), superseding the `src/data/projects.ts` mentioned in Approach A | Projects are the one type needing long-form bodies with images; a TS/ MDX split would create two sources of truth. Zod-typed frontmatter preserves type-safety |
| D8 | Photography layout | Bespoke `PhotoGrid`, not the template's `Gallery` widget | `Gallery` hard-crops to 4:3, which destroys portrait and landscape compositions |
| D9 | Résumé PDF | Ship `artifacts/Peng Zhao Resume - 02062026.pdf` unmodified as `public/resume.pdf`; **omit the phone number from the web CV page** | Owner's explicit choice. The PDF is already a document he distributes; the web page need not repeat the number |

---

## 4. Architecture

### 4.1 Routes

```
/                      Home
/publications          Publications index (filterable)
/projects              Project grid
/projects/<slug>       Project case study
/photography           Photography, grouped by category
/cv                    Web CV + résumé download
/blog                  Post list (AstroWind native, with tag/category pages)
/<slug>                Individual post (template default `permalink: '/%slug%'`)
/rss.xml               Feed (template's existing endpoint)
/404, /terms, /privacy
```

> Posts are served from the site root (`/welcome`), not `/blog/welcome` — this is AstroWind's default
> `apps.blog.post.permalink`. It is kept deliberately so the blog's internal linking and taxonomy pages
> continue to work unmodified.

### 4.2 Data flow

| Route | Content source | Shape |
| --- | --- | --- |
| `/cv` | `src/data/cv.ts` | Single nested object: `summary`, `metrics`, `experience[]`, `education[]`, `patents[]`, `links` |
| `/publications` | `src/data/publications.ts` | Typed array of `Publication`; abstract is a string; `featured` flag drives the home page |
| `/projects` and `/projects/<slug>` | `src/content/projects/*.mdx` | Content collection: zod-typed frontmatter for card metadata, MDX body for the case study |
| `/photography` | Auto-discovered from `src/assets/images/photography/**` + optional overrides in `src/data/photography.ts` | `import.meta.glob` scan; the TS file supplies captions, alt text, and ordering by filename key |
| `/blog` | `src/data/post/*.md` | Existing `post` collection, fed by the sync script (§6) |
| `/` and global chrome | `src/config.yaml`, `src/navigation.ts` | Template's existing config system |

### 4.3 New content collection

`src/content.config.ts` gains a second collection alongside `post`:

```ts
const projectCollection = defineCollection({
  loader: glob({ pattern: '*.mdx', base: 'src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),            // card + meta description, <= 155 chars
    year: z.number(),
    role: z.string().optional(),
    status: z.enum(['shipped', 'in-progress', 'research']).optional(),
    stack: z.array(z.string()).default([]),      // tech-stack tags
    components: z.array(z.string()).default([]), // hardware components / parts list
    repo: z.url().optional(),
    demo: z.url().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
    weight: z.number().default(0),  // sort order, descending
  }),
});
```

The `post` collection's existing schema is unchanged.

### 4.4 New components

All new components live in `src/components/portfolio/`. Each has one purpose and a typed props interface added
to `src/types.d.ts`, following the template's existing convention.

| Component | Purpose | Props (abbreviated) |
| --- | --- | --- |
| `Badge.astro` | Mono-set chip used for tags, venue types, and spec labels | `label`, `tone` (`default` \| `primary` \| `accent`), `icon?` |
| `ProjectGrid.astro` | Responsive card grid; stack tags, component chips, repo link, subpage link | `items`, `columns` |
| `PublicationList.astro` | Publication rows with abstract expander; `variant: 'compact'` for the home page | `items`, `variant` |
| `FilterBar.astro` | Progressive-enhancement tag filter; targets `[data-tags]` descendants | `tags`, `targetSelector` |
| `PhotoGrid.astro` | Multi-column masonry preserving native aspect ratios, grouped by category, `dialog` lightbox | `groups` |
| `CVEntry.astro` | Dense résumé row: role, org, dates, location, bullet list | `entry` |

The template's `Gallery.astro` and `Projects.astro` widgets are left in place (unused by these pages) rather
than deleted, consistent with how the template ships unused widgets.

### 4.5 Seed content

The skeleton ships populated, not empty. Seed content is limited to facts already public in the owner's
résumé — the same NDA discipline applied to the sample blog post (§6.5).

**`src/data/publications.ts` — exactly 3 entries**, all patents, transcribed from the résumé:

| Title | Number | Status |
| --- | --- | --- |
| Cylindrical Retroreflector Array for Rotation Tracking | US 2023/0086536 A1 (published 2023-03-23) | Issued |
| Optical Sensing of Translational and Rotational Shaft Movements | US 63/541,246 | Filed |
| Single Photon Avalanche Diodes for Rotational and Translational Input Detection | US 18/892,374 | Filed |

The collection's `metrics` block carries the header statistics the owner's résumé states: 20+ peer-reviewed
papers, 750+ citations, h-index 11, 13 journals / 8 refereed proceedings / 28 conference presentations. The
13 journal and 8 proceedings entries are **not** seeded — the owner supplies them, and the "Full list on
Google Scholar" button is the authoritative fallback until then.

**`src/content/projects/*.mdx` — exactly 3 entries**, each written strictly at the level of detail already
present in the résumé's public bullets:

1. Apple Watch Ultra coherent optical sensor (velocity tracking) — Optics, Hardware
2. Vision Pro image-tracking sensor optical design — Optics, Hardware
3. ASML polarization-resolved ORION wafer alignment sensor — Optics, Hardware, System Design

Each is marked in its body with a single HTML comment (`<!-- Owner: expand with public detail -->`) so the
owner knows these are starting points, not finished case studies. No employer-internal specifics, performance
figures, or unreleased product details appear in them.

---

## 5. Brand and theme

### 5.1 Site configuration — `src/config.yaml`

```yaml
site:
  name: Peng Zhao
  site: 'https://pengzhao-ai.github.io'
  base: '/'
  trailingSlash: false
  googleSiteVerificationId: null   # template's ID removed; owner supplies their own later

metadata:
  title:
    default: 'Peng Zhao — Optical Systems & Edge AI'
    template: '%s — Peng Zhao'
  description: 'Camera and optical systems engineer building end-to-end frameworks across optics, imaging pipelines, and AI. 20+ peer-reviewed papers, 3 patents.'
  robots: { index: true, follow: true }
  openGraph:
    site_name: 'Peng Zhao'
    images: [{ url: '~/assets/images/og-default.jpg', width: 1200, height: 630 }]
    type: website
  twitter:
    handle: '@pengzha0'
    site: '@pengzha0'
    cardType: summary_large_image

apps:
  blog:
    isEnabled: true
    postsPerPage: 8
    post:  { isEnabled: true, permalink: '/%slug%', robots: { index: true } }
    list:  { isEnabled: true, pathname: 'blog', robots: { index: true } }
    category: { isEnabled: true, pathname: 'category', robots: { index: true } }
    tag:   { isEnabled: true, pathname: 'tag', robots: { index: false } }
    isRelatedPostsEnabled: true
    relatedPostsCount: 4

ui:
  theme: 'system'
```

The template's `@arthelokyo` Twitter handles and its Google site-verification ID are **removed**, not
replaced. No verification ID is invented.

### 5.2 Palette — `src/components/CustomStyles.astro`

| Token | Light | Dark |
| --- | --- | --- |
| `--aw-color-primary` | `rgb(37 99 235)` (cobalt `#2563EB`) | `rgb(96 165 250)` (`#60A5FA`, lightened for contrast on dark) |
| `--aw-color-secondary` | `rgb(29 78 216)` (`#1D4ED8`) | `rgb(59 130 246)` (`#3B82F6`) |
| `--aw-color-accent` | `rgb(124 58 237)` (violet `#7C3AED`) | `rgb(167 139 250)` (`#A78BFA`) |
| `--aw-color-text-heading` | `rgb(15 23 42)` (slate-900) | `rgb(241 245 249)` (slate-100) |
| `--aw-color-text-default` | `rgb(51 65 85)` (slate-700) | `rgb(203 213 225)` (slate-300) |
| `--aw-color-text-muted` | `rgb(71 85 105 / 66%)` | `rgb(148 163 184 / 80%)` |
| `--aw-color-bg-page` | `rgb(250 250 252)` (crisp off-white `#FAFAFC`) | `rgb(8 11 18)` (`#080B12`, deep slate) |
| `--aw-color-bg-page-dark` | — | `rgb(8 11 18)` |

The `::selection` colours are updated to match (`color-mix` of primary over the page colour) rather than the
template's `lavender`/`black`.

### 5.3 Typography — `astro.config.ts` + `src/layouts/Layout.astro`

Three families via Astro's native Fonts API, all self-hosted and subset to `latin`:

| Role | Family | CSS variable | Weights |
| --- | --- | --- | --- |
| UI / body | Inter | `--font-inter` (existing) | `100 900` variable |
| Headings | Space Grotesk | `--font-space-grotesk` | `300 700` variable |
| Mono | JetBrains Mono | `--font-jetbrains-mono` | `100 800` variable |

`src/layouts/Layout.astro` adds a `<Font>` entry per new family alongside the existing Inter injection.
`CustomStyles.astro` maps them:

```css
--aw-font-sans: var(--font-inter);
--aw-font-heading: var(--font-space-grotesk);
--aw-font-mono: var(--font-jetbrains-mono);
```

`src/assets/styles/tailwind.css` gains a `--font-mono` theme token wired to `--aw-font-mono` with a
`ui-monospace, monospace` fallback chain, so `font-mono` is available as a utility throughout.

> **Implementation note:** the variable-weight range syntax (`'300 700'`) must be verified against the Astro
> Fonts API for Space Grotesk and JetBrains Mono at implementation time. If a range is rejected, fall back to
> discrete weights `['400', '500', '600', '700']`.

### 5.4 Logo, favicon, and social icons

- `src/components/Logo.astro`: thin-stroke aperture/iris SVG glyph (inline, `currentColor`) plus a
  tight-tracked `Peng Zhao` wordmark. Must render correctly in both themes.
- `src/assets/favicons/favicon.svg`: `PZ` monogram, same stroke weight as the logo.
- Footer `socialLinks` in `src/navigation.ts`, rendered as a mono-style icon row:
  GitHub, Google Scholar, LinkedIn, ORCID, X.

> **Implementation note:** `tabler:brand-orcid` and `tabler:school` must be confirmed present in
> `@iconify-json/tabler` at implementation time (grep the installed JSON). Fall back to `tabler:atom` /
> `tabler:id-badge-2` if ORCID is absent.

### 5.5 Navigation — `src/navigation.ts`

Header links: `Home · Publications · Projects · Photography · Blog · CV`.
Header action button: `Résumé` → `/resume.pdf`, `target="_blank"`, `icon: 'tabler:download'`.

Footer columns: **Explore** (the six pages), **Elsewhere** (the five social profiles), plus the social icon row
and a copyright line. AstroWind's MIT attribution is retained.

> **Risk:** six top-level items at the `lg` breakpoint (1024 px) may overflow. The template's own
> `customize-header` skill notes ~470 px fits five items. At implementation, verify rendering at exactly
> 1024 px; if it overflows, shorten the label `Photography` → `Photos` (the page title stays "Photography").

---

## 6. Blog sync pipeline

### 6.1 Interface

`scripts/sync-posts.mjs`, exposed as npm scripts:

```
npm run sync:posts                       # dry-run: print the plan, write nothing
npm run sync:posts -- --write            # write derived posts into src/data/post/
npm run sync:posts -- --write --force    # also overwrite targets that were hand-edited
npm run sync:posts -- --write --prune    # also delete targets whose source was removed
```

Dry-run is the default. The script prints a per-file table (`create` / `update` / `skip` / `conflict` /
`orphan`) and a summary line, then exits `0` on success, `1` on conflict (unless `--force`), `2` on a
malformed source file.

### 6.2 Inference rules

Applied only to fields the draft does not already declare.

| Field | Resolution order |
| --- | --- |
| `title` | Existing frontmatter → first `# H1` in the body (removed from the body on write) → humanized filename |
| `publishDate` | Existing frontmatter → `fs.stat().birthtime` → current date. Always written as ISO 8601 with offset |
| `excerpt` | Existing frontmatter → first paragraph following the H1, Markdown and inline formatting stripped, truncated at a word boundary to ≤ 155 characters |
| `tags` | Existing frontmatter → keyword scan (below) → `['Engineering']` |
| `category` | Existing frontmatter → first matched tag |
| `author` | Existing frontmatter → `Peng Zhao` (from `src/config.yaml`) |
| `draft` | Existing frontmatter → `true` when the filename begins with `_` or matches `/draft/i`, otherwise `false` |
| `image` | Existing frontmatter → `<slug>.{jpg,png,webp}` or `<slug>/*.{jpg,png,webp}` beside the source, copied to `src/assets/images/posts/` and written as `~/assets/images/posts/<file>` |

Keyword vocabulary (case-insensitive substring match on the body; first match wins for `category`):

| Tag | Keywords |
| --- | --- |
| `Optics` | optics, optical, lens, laser, photonic, diffraction, polarization, wavefront, aberration, coherence, spectrometer, imaging, sensor |
| `Hardware` | hardware, pcb, enclosure, manufacturing, tolerance, yield, mechanical, tooling, validation, production, module, npi |
| `Edge AI` | on-device, edge, inference, quantization, model, neural, ml, embedded, npu, real-time |
| `System Design` | architecture, trade-off, tradeoff, framework, pipeline, interface, integration, spec, kpi, calibration, system |
| `Career` | career, interview, promotion, mentorship, team, hiring, transition, leadership |

### 6.3 Slug

Existing frontmatter `slug` → kebab-case of the title or filename via `limax` with `pinyin` tone disabled.
Collisions within one run are suffixed `-2`, `-3`.

### 6.4 Safety properties

1. **Never overwrite** an existing target without `--force`.
2. **Never delete** anything automatically; orphaned targets (source removed from `artifacts/blog/`) are
   reported, and removed only under `--prune`.
3. **Idempotent**: an unchanged source produces a byte-identical target; a re-run reports `skip` for every file.
4. **Drift detection**: `scripts/.sync-state.json` records `{slug: {source, sourceHash, target, targetHash}}`.
   If the target's current hash differs from the recorded one, the file is flagged `conflict` — this catches a
   post edited directly in `src/data/post/` before the sync clobbers it.
5. **Body preserved verbatim** except for the H1 removal and relative image-link rewriting.
6. `.sync-state.json` is committed, so drift detection survives across machines and CI.

### 6.5 Sample post

`artifacts/blog/welcome.md` — authored **without frontmatter** to demonstrate inference end to end. Content is
a short "what this site is for and what I plan to write about" note, drafted from the owner's own résumé
summary line, tagged `Career` by the keyword scan, and containing at least one fenced code block and one
inline mono spec to exercise the JetBrains Mono and Shiki styling. The owner may edit or delete it.

Deliberately **not** an engineering post about current employer work: shipping details are NDA-bound and a
public site is the wrong place to test that boundary.

### 6.6 Documentation

`.agents/skills/sync-blog-posts.md`, matching the format of the template's existing skills, documenting the
commands, the inference rules, the safety properties, and how to resolve a conflict. Companion skills
`add-publication.md`, `add-project.md`, and `add-photograph.md` document the other content types.

---

## 7. Asset pipeline

`scripts/prepare-assets.mjs`, exposed as `npm run prepare:assets`. Committed and rerunnable; idempotent by
content hash; uses `sharp` (already a devDependency).

| Input | Output | Transform |
| --- | --- | --- |
| `artifacts/photography/<category>/*.{JPG,jpg,jpeg,PNG,png}` | `src/assets/images/photography/<category>/<basename>.jpg` | Long edge ≤ 2560 px, JPEG quality 82, mozjpeg, **all EXIF/GPS stripped** |
| `artifacts/Profile.jpg` | `src/assets/images/profile.jpg` | Long edge ≤ 1600 px, quality 84, EXIF stripped |
| generated | `src/assets/images/og-default.jpg` | 1200×630 card composed via `sharp` from an SVG: page background, name in Space Grotesk, mono subtitle line |
| generated | `src/assets/favicons/favicon.svg` | `PZ` monogram, hand-authored SVG |

Category aliases: `protrait` → `portrait`. Unknown categories pass through unchanged. Empty categories are
skipped.

**Privacy requirement:** EXIF stripping is mandatory, not cosmetic — the source JPGs are camera originals and
commonly carry GPS coordinates, and this repository is public.

The script prints a before/after size table so the reduction is visible.

---

## 8. Repository hygiene

### 8.1 Deletions

- `src/pages/homes/` (4 demo homepages)
- `src/pages/landing/` (6 demo landing pages)
- `src/pages/services.astro`, `pricing.astro`, `about.astro`, `contact.astro`
- `src/data/post/*.md{,x}` (7 template demo posts)
- `public/decapcms/`
- `netlify.toml`, `vercel.json`, `wrangler.jsonc` (configs pointing at non-target hosts)

**Kept:** `Dockerfile`, `nginx/`, `docker-compose.yml` (a self-hosting path the owner may want), `terms.md`,
`privacy.md`, `404.astro`, `LICENSE.md`, and the whole `.agents/skills/` tree.

### 8.2 Rewrites

- `src/pages/index.astro` — AstroWind's marketing page replaced by the portfolio home page (§4.2).
- `README.md` — the template's marketing README replaced by a short project README: what the site is, how to
  run it, how to add each content type, and how to deploy. AstroWind attribution retained.
- `AGENTS.md` — extended with the new architecture, the data-module conventions, the script commands, and the
  content-addition workflows, so future sessions inherit the conventions.

### 8.3 `.gitignore` additions

```gitignore
# Large binary source artifacts: optimized copies live in src/assets/images/
artifacts/**/*.JPG
artifacts/**/*.jpg
artifacts/**/*.jpeg
artifacts/**/*.png
artifacts/**/*.pdf
artifacts/**/*.docx
artifacts/**/*.rtf
artifacts/**/*.pptx
```

`artifacts/` is **not** ignored wholesale: `artifacts/blog/**/*.md`, `artifacts/resume.md`, and
`artifacts/socials.md` are tracked. Text sources are versioned so drafts cannot be lost to a disk failure;
binaries stay out of history. `.DS_Store` is already ignored by the existing file.

### 8.4 New files created

```
scripts/sync-posts.mjs
scripts/prepare-assets.mjs
scripts/.sync-state.json            (generated, committed)
src/data/cv.ts
src/data/publications.ts
src/data/photography.ts
src/content/projects/*.mdx          (seed entries)
src/components/portfolio/Badge.astro
src/components/portfolio/ProjectGrid.astro
src/components/portfolio/PublicationList.astro
src/components/portfolio/FilterBar.astro
src/components/portfolio/PhotoGrid.astro
src/components/portfolio/CVEntry.astro
src/pages/publications.astro
src/pages/projects/index.astro
src/pages/projects/[slug].astro
src/pages/photography.astro
src/pages/cv.astro
src/assets/images/photography/**    (generated, committed)
src/assets/images/profile.jpg       (generated, committed)
src/assets/images/og-default.jpg    (generated, committed)
public/resume.pdf                   (copy of the owner's original, unmodified)
.github/workflows/deploy.yml
.agents/skills/{sync-blog-posts,add-publication,add-project,add-photograph}.md
docs/superpowers/specs/2026-10-09-portfolio-site-design.md
```

---

## 9. Deployment

### 9.1 `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push: { branches: [main] }
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`actions/configure-pages@v5` is included as the standard companion to the upload/deploy pair; it is additive to
the owner's stated requirements.

### 9.2 Coexistence with existing CI

`.github/workflows/actions.yaml` is untouched. Both workflows run on a push to `main`: `actions.yaml` runs
`npm run check` then builds; `deploy.yml` builds and deploys. This is intentional — the check workflow is the
quality gate on pull requests, where `deploy.yml` does not run.

### 9.3 Manual prerequisite

The repository must have **Settings → Pages → Source = "GitHub Actions"**. Without it, `deploy.yml` uploads the
artifact but `deploy-pages@v4` fails. This is either performed by the owner, or executed via
`gh api` with an admin-scoped token
(`PUT /repos/pengzhao-ai/pengzhao-ai.github.io/pages -f build_type=workflow`).

---

## 10. Verification

The work is complete only when every item below is demonstrated, not assumed.

**Build and quality**

1. `npm ci` completes; `npm run check` (astro check + ESLint + Prettier) exits clean.
2. `npm run build` exits clean; no warnings about unresolved images.
3. `src/content/projects/*.mdx` frontmatter validates against the new collection schema.

**Routes**

4. `dist/` contains `index.html`, `publications/index.html`, `projects/index.html`,
   `projects/<slug>/index.html` for every seeded project, `photography/index.html`, `cv/index.html`,
   `blog/index.html`, `404.html`, `rss.xml`, `sitemap-index.xml`.

**De-branding**

5. `grep -r` over `dist/` returns **zero** hits for: `astrowind.vercel.app`, `AstroWind`, `@arthelokyo`,
   `arthelokyo`, and the template's `googleSiteVerificationId` value.
6. The built blog contains no template demo posts.

**Correctness**

7. `dist/` HTML contains no phone number in any rendered page.
8. `public/resume.pdf` is byte-identical to the owner's original.
9. No EXIF/GPS metadata survives in any committed image (`exiftool` or `sips -g all` spot check).
10. Navigation renders without overflow at exactly 1024 px width.
11. The publication filter works with JavaScript enabled and degrades to showing all items with JavaScript
    disabled.
12. `/cv` produces a clean printed page (no clipped content, no nav/header artifacts) via the print stylesheet.

**Pipeline**

13. Running `npm run sync:posts` twice in a row with no source change reports `skip` for every file and changes
    nothing on disk (idempotence).
14. Manually editing a synced post in `src/data/post/` and re-running the sync reports a `conflict` rather than
    overwriting.
15. `npm run prepare:assets` run twice produces identical output hashes.

**Deployment**

16. Pushing to `main` triggers `deploy.yml`; the `deploy` job succeeds and
    `https://pengzhao-ai.github.io` serves the site.
17. `/rss.xml` and `/sitemap-index.xml` resolve at the live URL.

---

## 11. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Astro Fonts API rejects variable-weight ranges for the new families | Build failure | Fall back to discrete weights; documented in §5.3 |
| `tabler:brand-orcid` absent from the icon set | Missing footer icon | Verify against installed iconify JSON; documented fallbacks in §5.4 |
| Six nav items overflow at `lg` | Visible layout defect | Verify at exactly 1024 px; shorten `Photography` → `Photos` |
| É-accented or CJK filenames in future photo drops | Broken slugs | `limax` handles transliteration; `prepare-assets` normalises filenames |
| Original résumé PDF contains a phone number on a public, indexable site | Privacy exposure | Owner's explicit, informed choice (D9). Web CV omits it. Owner can switch to generated-PDF later |
| Blog drafts live outside the site's content directory | Easy to forget the sync step | `artifacts/blog/` changes are visible in `git status`; workflow documented in `.agents/skills/` |
| Publication list is seeded from incomplete source material | Understated publication record | Seeded only with verifiable entries; owner completes the remainder; Scholar button is the authoritative fallback |

---

## 12. Out of scope, available later

- **Generated résumé PDF** matching the site design (the D9 alternative). Would add `pdfkit` as a dependency
  and a `scripts/build-cv-pdf.mjs` that renders `cv.ts` to PDF.
- **Publication bodies as MDX** — the content-collection upgrade path if per-paper commentary is ever wanted.
- Contact form, newsletter, analytics account configuration, Decap CMS.
- Custom domain (the site is served from the `github.io` subdomain).
