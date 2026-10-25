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
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
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
    'optics',
    'optical',
    'lens',
    'laser',
    'photonic',
    'diffraction',
    'polarization',
    'wavefront',
    'aberration',
    'coherence',
    'spectrometer',
    'imaging',
    'sensor',
  ],
  Hardware: [
    'hardware',
    'pcb',
    'enclosure',
    'manufacturing',
    'tolerance',
    'yield',
    'mechanical',
    'tooling',
    'validation',
    'production',
    'module',
    'npi',
  ],
  'Edge AI': [
    'on-device',
    'edge',
    'inference',
    'quantization',
    'model',
    'neural',
    'ml',
    'embedded',
    'npu',
    'real-time',
  ],
  'System Design': [
    'architecture',
    'trade-off',
    'tradeoff',
    'framework',
    'pipeline',
    'interface',
    'integration',
    'spec',
    'kpi',
    'calibration',
    'system',
  ],
  Career: ['career', 'interview', 'promotion', 'mentorship', 'team', 'hiring', 'transition', 'leadership'],
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
        const length = fence[1].length;
        if (open === null) {
          open = { marker, length };
          return line;
        }
        if (marker === open.marker && length >= open.length) {
          open = null;
          return line;
        }
      }
      return open !== null ? ' '.repeat(line.length) : line;
    })
    .join('\n');
}

const IMAGE_REF_RE = /!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^)\s]+))((?:\s+["'][^"']*["'])?)\s*\)/g;

const isLocalImageRef = (url) =>
  Boolean(url) &&
  !/^[a-z][a-z0-9+.-]*:/i.test(url) &&
  !url.startsWith('/') &&
  !url.startsWith('#') &&
  !url.startsWith('~/');

/**
 * Collect Markdown image references outside fenced code blocks.
 *
 * The masked text has the same length as the body, so the returned offsets can
 * be used to rewrite the original body without touching fenced examples. Only
 * refs that point at a file relative to the draft are returned; remote, root,
 * fragment, and already-rewritten `~/` paths are left for Astro to handle.
 */
export function collectImageRefs(body) {
  const masked = maskFences(body);
  const refs = [];
  const re = new RegExp(IMAGE_REF_RE.source, IMAGE_REF_RE.flags);
  let match;
  while ((match = re.exec(masked)) !== null) {
    const url = match[2] ?? match[3];
    if (!isLocalImageRef(url)) continue;
    refs.push({
      url,
      alt: match[1],
      title: match[4] ?? '',
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return refs;
}

/**
 * Plan the copies and rewrites for local inline images.
 *
 * Each local ref is resolved against the draft's directory, copied under
 * assetsDir/<slug>/, and rewritten to the `~/assets/images/posts/...` form
 * Astro resolves. Missing sources are reported instead of emitting a broken
 * build path, and two different sources may not share one destination.
 */
export async function planInlineImages({ body, sourceDir, slug, assetsDir }) {
  const refs = collectImageRefs(body);
  const missing = [];
  const copiesByDest = new Map();
  const rewrites = [];

  for (const ref of refs) {
    const src = path.resolve(sourceDir, ref.url);
    const exists = await stat(src).then(
      () => true,
      () => false
    );
    if (!exists) {
      missing.push(ref.url);
      continue;
    }

    const basename = path.basename(ref.url);
    const dest = path.join(assetsDir, slug, basename);
    const previous = copiesByDest.get(dest);
    if (previous && previous.src !== src) {
      throw new Error(
        `two inline images map to the same destination "${dest}":\n  ${previous.src}\n  ${src}\nrename one so the basenames differ.`
      );
    }
    copiesByDest.set(dest, { src, dest });

    rewrites.push({ ...ref, newUrl: `~/assets/images/posts/${slug}/${basename}` });
  }

  let rewritten = body;
  for (const ref of rewrites.sort((a, b) => b.start - a.start)) {
    const replacement = `![${ref.alt}](${ref.newUrl}${ref.title})`;
    rewritten = rewritten.slice(0, ref.start) + replacement + rewritten.slice(ref.end);
  }

  return { body: rewritten, copies: Array.from(copiesByDest.values()), missing };
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

export const slugifyTitle = (text) => slugify(text, { tone: false, separator: '-' }) || 'post';

export function classify({ targetExists, recordedTargetHash, currentTargetHash, sourceChanged, force }) {
  if (!targetExists) return 'create';
  const handEdited = !recordedTargetHash || recordedTargetHash !== currentTargetHash;
  // Forcing must clear the conflict whether or not the source changed:
  // the CLI tells the user to re-run with --force, and that advice has to
  // work, otherwise the conflict is permanent.
  if (handEdited) return force ? 'update' : 'conflict';
  return sourceChanged ? 'update' : 'skip';
}

/** Fixed key order keeps output byte-stable across runs. */
export function renderPost({
  title,
  publishDate,
  updateDate,
  draft,
  excerpt,
  image,
  imageAlt,
  category,
  tags,
  author,
  series,
  seriesOrder,
  body,
}) {
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
  if (series) data.series = series;
  if (seriesOrder) data.seriesOrder = seriesOrder;

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

/** Copy a draft's companion image into the site's asset tree. */
export async function copyPostImage(sourceImage, destDir = IMAGE_DEST) {
  await mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, path.basename(sourceImage));
  await copyFile(sourceImage, dest);
  return dest;
}

/** Copy an inline draft asset to its planned destination. */
export async function copyPostAsset(sourceAsset, destPath) {
  await mkdir(path.dirname(destPath), { recursive: true });
  await copyFile(sourceAsset, destPath);
  return destPath;
}

export async function planSync({
  force = false,
  sourcesDir = SOURCES_DIR,
  targetDir = TARGET_DIR,
  stateFile = STATE_FILE,
  assetsDir = IMAGE_DEST,
} = {}) {
  await mkdir(targetDir, { recursive: true });

  let entries;
  try {
    entries = (await readdir(sourcesDir, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
      .map((e) => e.name)
      .sort();
  } catch {
    console.log(`No drafts found at ${path.relative(ROOT, sourcesDir)}/ — nothing to do.`);
    return [];
  }

  const state = await readJson(stateFile, {});
  const seenSlugs = new Set();
  const actions = [];

  for (const name of entries) {
    const sourcePath = path.join(sourcesDir, name);
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
    const baseSlug = fm.slug ?? slugifyTitle(title);
    // Spec §6.3: collisions within one run are suffixed -2, -3. Deterministic
    // because entries are processed in sorted order.
    let slug = baseSlug;
    for (let n = 2; seenSlugs.has(slug); n += 1) slug = `${baseSlug}-${n}`;
    seenSlugs.add(slug);

    const info = await stat(sourcePath);
    const publishDate = fm.publishDate ? new Date(fm.publishDate) : info.birthtime;
    const tags = fm.tags ?? deriveTags(maskFences(body));
    const excerpt = fm.excerpt ?? deriveExcerpt(body);
    const draft = fm.draft ?? decideDraft(name);

    let image = fm.image ?? null;
    const sourceImage = image ? null : await findSourceImages(sourcePath, slug);
    if (sourceImage) image = `~/assets/images/posts/${path.basename(sourceImage)}`;

    const inline = await planInlineImages({
      body,
      sourceDir: path.dirname(sourcePath),
      slug,
      assetsDir,
    });
    if (inline.missing.length) {
      console.error(`Missing inline image(s) in ${name}: ${inline.missing.join(', ')}`);
      process.exitCode = 2;
      continue;
    }

    // Asset bytes are part of the source identity: replacing a figure without
    // touching the Markdown must still update the copied file.
    const assetFingerprint = inline.copies.length
      ? (
          await Promise.all(
            inline.copies.map(async (copy) => `${path.basename(copy.dest)}:${hash(await readFile(copy.src))}`)
          )
        )
          .sort()
          .join('|')
      : '';
    const sourceHash = hash(assetFingerprint ? `${raw}\n${assetFingerprint}` : raw);

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
      series: fm.series,
      seriesOrder: fm.seriesOrder,
      body: inline.body,
    });

    const targetName = `${slug}.md`;
    const targetPath = path.join(targetDir, targetName);
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
      sourceChanged: !record || record.sourceHash !== sourceHash,
      force,
    });

    actions.push({
      slug,
      action,
      source: sourcePath,
      target: targetPath,
      targetName,
      content,
      sourceHash,
      sourceImage,
      assetCopies: inline.copies,
    });
  }

  // Orphans: tracked targets whose source no longer exists on disk.
  for (const [slug, record] of Object.entries(state)) {
    if (seenSlugs.has(slug)) continue;
    actions.push({
      slug,
      action: 'orphan',
      source: null,
      target: path.join(targetDir, `${slug}.md`),
      targetName: `${slug}.md`,
      content: null,
      sourceHash: record.sourceHash,
    });
  }

  return actions;
}

const ICON = { create: '+', update: '~', skip: '=', conflict: '!', orphan: '?' };

export async function main({
  argv = process.argv.slice(2),
  sourcesDir = SOURCES_DIR,
  targetDir = TARGET_DIR,
  stateFile = STATE_FILE,
  assetsDir = IMAGE_DEST,
} = {}) {
  const args = argv;
  const write = args.includes('--write');
  const force = args.includes('--force');
  const prune = args.includes('--prune');

  const actions = await planSync({ force, sourcesDir, targetDir, stateFile, assetsDir });
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
  console.log(
    `\n${Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ')}\n`
  );

  // Spec §6.1: a conflict fails the run so a hook or CI job notices. It is
  // not fatal — the preview still prints, and --write still leaves the
  // conflicted target untouched — but the exit code carries the warning.
  if (counts.conflict) process.exitCode = 1;

  if (!write) return;

  const state = await readJson(stateFile, {});

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
    if (a.sourceImage) await copyPostImage(a.sourceImage);
    for (const copy of a.assetCopies ?? []) await copyPostAsset(copy.src, copy.dest);
    await writeFile(a.target, a.content, 'utf8');
    state[a.slug] = {
      source: path.relative(ROOT, a.source),
      sourceHash: a.sourceHash,
      target: path.relative(ROOT, a.target),
      targetHash: hash(a.content),
    };
  }

  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  console.log(`State written to ${path.relative(ROOT, stateFile)}\n`);
}

if (import.meta.filename === process.argv[1]) {
  await main();
}
