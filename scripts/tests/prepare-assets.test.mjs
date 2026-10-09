import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import sharp from 'sharp';

import { buildTouchIcon, normalizeCategory, optimizeImage, slugifyName } from '../prepare-assets.mjs';

const hashFile = async (p) =>
  createHash('sha256')
    .update(await readFile(p))
    .digest('hex');

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
