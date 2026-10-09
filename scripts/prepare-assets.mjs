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
  await writeIfChanged(dest, buf);

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
  await writeIfChanged(dest, buf);
}

/** Render a square PNG (the iOS home-screen icon) from an SVG. */
export async function buildTouchIcon(svgPath, dest) {
  await mkdir(path.dirname(dest), { recursive: true });
  await sharp(await readFile(svgPath))
    .resize(180, 180)
    .png()
    .toFile(dest);
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

  // Same SVG as the favicon, so the tab icon and the home-screen icon
  // can never drift apart.
  await buildTouchIcon(
    path.join(ROOT, 'src/assets/favicons/favicon.svg'),
    path.join(ROOT, 'src/assets/favicons/apple-touch-icon.png')
  );
  rows.push(['apple-touch-icon.png', null]);

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
