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
//    the check stays as a guard against a future base-path change). The
//    lookbehind lets the legitimate absolute `https://host/…` canonical URLs
//    through and flags only a bare protocol-relative `//host/…`, which would
//    double-apply a non-'/' base.
const DOUBLE_PREFIX = /(?<!https?:)\/\/pengzhao-ai\.github\.io\//;
for (const file of textFiles) {
  const content = await readFile(file, 'utf8');
  check(!DOUBLE_PREFIX.test(content), `double-prefixed URL in dist/${path.relative(DIST, file)}`);
}

// 6. pagefind/pdf sanity: the résumé PDF is byte-identical to the original.
const originalPdf = path.join(ROOT, 'artifacts', 'Peng Zhao Resume - 02062026.pdf');
const shippedPdf = path.join(DIST, 'resume.pdf');
if (await exists(originalPdf)) {
  const hash = (buf) => createHash('sha256').update(buf).digest('hex');
  const [a, b] = await Promise.all([readFile(originalPdf), readFile(shippedPdf)]);
  check(hash(a) === hash(b), "public/resume.pdf differs from the owner's original PDF");
}

// 7. The site name reached the metadata.
const home = await readFile(path.join(DIST, 'index.html'), 'utf8');
check(home.includes('Peng Zhao'), "home page does not contain the owner's name");

// 8. Every top-level page carries an <h1>. ui/Headline renders <h2> by
//    default, so a page whose title uses it must opt in with level={1}.
const H1_ROUTES = [
  'index.html',
  'publications/index.html',
  'projects/index.html',
  'photography/index.html',
  'cv/index.html',
  'blog/index.html',
];
for (const route of H1_ROUTES) {
  const page = await readFile(path.join(DIST, route), 'utf8');
  check(/<h1[\s>]/.test(page), `missing <h1>: /${route}`);
}

// 9. No newsletter form ships. The widget has no backend and its disclaimer
//    tells the visitor the form is a template — demo copy on a public page
//    (spec §1 lists a newsletter as a non-goal).
const blogIndex = await readFile(path.join(DIST, 'blog', 'index.html'), 'utf8');
check(!blogIndex.includes('name="newsletter"'), 'demo newsletter form found in dist/blog/index.html');

if (failures.length) {
  console.error(`\n✗ ${failures.length} verification failure(s):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ build verification passed (${textFiles.length} files scanned)`);
