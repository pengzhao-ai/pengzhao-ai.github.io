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
  'toolbox/index.html',
  'photography/index.html',
  'cv/index.html',
  'blog/index.html',
  '404.html',
  'rss.xml',
  'sitemap-index.xml',
];

for (const route of ROUTES) {
  check(await exists(path.join(DIST, route)), `missing route: /${route}`);
}

// 2. The old /projects case-study routes are gone (owner item 6: the section
//    is a toolbox of public repos, not job experience). A stale directory
//    here means the retired pages leaked back into the build.
check(!(await exists(path.join(DIST, 'projects'))), 'retired /projects directory still in dist');

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
  // Owner feedback (item 10): the unlabeled RSS icon in the header reads as a
  // broken "wifi" toggle. Removed from the header; /rss.xml stays published.
  check(!content.includes('aria-label="RSS Feed"'), `header RSS icon still rendered in dist/${rel}`);
  // Owner feedback (item 9): the résumé PDF is too personal to publish; the
  // web CV page replaces it. No rendered page may link or point at it.
  check(!content.includes('resume.pdf'), `résumé PDF referenced in dist/${rel}`);
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

// 6. The résumé PDF is no longer shipped (owner item 9). The original stays
//    in artifacts/ as the source of truth for the web CV's content.
check(!(await exists(path.join(DIST, 'resume.pdf'))), 'resume.pdf still shipped in dist/');

// 7. The site name reached the metadata.
const home = await readFile(path.join(DIST, 'index.html'), 'utf8');
check(home.includes('Peng Zhao'), "home page does not contain the owner's name");

// 8. Every top-level page carries an <h1>. ui/Headline renders <h2> by
//    default, so a page whose title uses it must opt in with level={1}.
const H1_ROUTES = [
  'index.html',
  'publications/index.html',
  'toolbox/index.html',
  'photography/index.html',
  'cv/index.html',
  'blog/index.html',
];
for (const route of H1_ROUTES) {
  // A missing route is already reported by check 1; reading it here would
  // only crash the run.
  if (!(await exists(path.join(DIST, route)))) continue;
  const page = await readFile(path.join(DIST, route), 'utf8');
  check(/<h1[\s>]/.test(page), `missing <h1>: /${route}`);
}

// 9. No newsletter form ships. The widget has no backend and its disclaimer
//    tells the visitor the form is a template — demo copy on a public page
//    (spec §1 lists a newsletter as a non-goal).
const blogIndex = await readFile(path.join(DIST, 'blog', 'index.html'), 'utf8');
check(!blogIndex.includes('name="newsletter"'), 'demo newsletter form found in dist/blog/index.html');

// 10. Home identity (owner items 2–4): the hero carries the profile photo,
//     the metrics strip is gone (figures live on /cv and /publications), and
//     the 知乎 entry ships as a placeholder — never a guessed URL. 'h-index'
//     is the marker: it only ever appears in the strip (the site meta
//     description legitimately says "20+ peer-reviewed papers", and
//     "citations" lives inside the Scholar URL).
check(/src="[^"]*profile[^"]*\.(webp|jpg|png)"/.test(home), 'home page has no profile photo');
check(!home.includes('h-index'), 'home page still shows the metrics strip (h-index)');
check(home.includes('知乎'), 'home page is missing the 知乎 social placeholder');
check(!home.includes('zhihu.com'), 'home page links to a 知乎 URL the owner has not provided');

// 11. Photography lightbox (owner item 5): the viewer script scopes its
//     queries to the <aw-photo-grid> root, so the dialog and every trigger
//     button must live inside that same element. The original template put
//     the dialog outside the custom element, so the script threw on load and
//     clicks never opened the viewer.
const photoPage = await readFile(path.join(DIST, 'photography', 'index.html'), 'utf8');
const photoStart = photoPage.indexOf('<aw-photo-grid');
const photoEnd = photoPage.lastIndexOf('</aw-photo-grid>');
const photoRoots = photoPage.split('<aw-photo-grid').length - 1;
check(photoRoots === 1, `photography page has ${photoRoots} <aw-photo-grid> roots (expected 1)`);
check(photoStart !== -1 && photoEnd > photoStart, 'photography page has no closed <aw-photo-grid> root');
if (photoEnd > photoStart) {
  const root = photoPage.slice(photoStart, photoEnd);
  check(root.includes('<dialog'), 'lightbox <dialog> is outside the <aw-photo-grid> root (click-to-magnify breaks)');
  const triggers = (photoPage.match(/data-photo-open=/g) ?? []).length;
  const inRoot = (root.match(/data-photo-open=/g) ?? []).length;
  check(triggers > 0 && triggers === inRoot, `only ${inRoot}/${triggers} photo triggers are inside the lightbox root`);
}

// 12. Toolbox (owner item 6): the page is a structure-first index of public
//     repos. Both categories render, the GitHub profile is linked, and each
//     empty category says so — the markers are data attributes so the owner
//     can add entries without breaking the check.
const toolboxPath = path.join(DIST, 'toolbox', 'index.html');
if (await exists(toolboxPath)) {
  const toolbox = await readFile(toolboxPath, 'utf8');
  check(toolbox.includes('https://github.com/pengzhao-ai'), 'toolbox page does not link the GitHub profile');
  check(/data-toolbox-category="optics"/.test(toolbox), 'toolbox page is missing the optics category');
  check(/data-toolbox-category="ai"/.test(toolbox), 'toolbox page is missing the AI category');
  check(toolbox.includes('data-toolbox-empty'), 'toolbox page does not mark empty categories');
  check(!toolbox.includes('Case study'), 'toolbox page still carries case-study copy');
}
check(home.includes('/toolbox'), 'home page does not link to /toolbox');

if (failures.length) {
  console.error(`\n✗ ${failures.length} verification failure(s):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ build verification passed (${textFiles.length} files scanned)`);
