import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, test } from 'node:test';

import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

// The extensions .gitignore blocks under artifacts/. A file that was tracked
// before those rules existed stays tracked even though the rules match it,
// so the ignore patterns alone do not hold this invariant — this test does.
const BINARY_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.tif',
  '.tiff',
  '.pdf',
  '.docx',
  '.rtf',
  '.pptx',
]);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

describe('repository privacy invariants', () => {
  test('no binary originals are tracked under artifacts/', () => {
    const tracked = execFileSync('git', ['ls-files', '-z', 'artifacts/'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean);
    const offenders = tracked.filter((file) => BINARY_EXTENSIONS.has(path.extname(file).toLowerCase()));
    assert.deepEqual(
      offenders,
      [],
      `originals must stay out of git — untrack with \`git rm --cached\`:\n${offenders.join('\n')}`
    );
  });

  test('every image committed under src/assets/images carries no EXIF', async () => {
    const images = [];
    for await (const file of walk(path.join(ROOT, 'src', 'assets', 'images'))) images.push(file);
    assert.ok(images.length > 0, 'expected committed images to scan');

    for (const file of images) {
      const meta = await sharp(file).metadata();
      assert.equal(meta.exif, undefined, `EXIF survived in ${path.relative(ROOT, file)}`);
    }
  });
});
