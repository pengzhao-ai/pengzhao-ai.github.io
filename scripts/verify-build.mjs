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

/**
 * Every toolbox category section must render either its entry tiles or the
 * empty-state marker — never both, never neither. Returns one message per
 * offending section (empty array when the page is consistent), so the check
 * keeps passing when the owner adds the first real entry.
 */
export function toolboxSectionProblems(html) {
  const problems = [];
  for (const raw of html.split('data-toolbox-category="').slice(1)) {
    const id = raw.slice(0, raw.indexOf('"'));
    const end = raw.indexOf('</section>');
    const section = end === -1 ? raw : raw.slice(0, end);
    const hasEntries = /class="[^"]*\btile\b/.test(section);
    const hasEmpty = section.includes('data-toolbox-empty');
    if (hasEntries === hasEmpty) {
      problems.push(
        `toolbox "${id}" section must show either entries or the empty state (entries=${hasEntries}, empty=${hasEmpty})`
      );
    }
  }
  return problems;
}

/**
 * Toolbox entries may carry a write-up link next to their source link. The
 * owner rule is that no invented or dead link reaches the build, so a tile's
 * write-up must be the repository's *own* GitHub Pages URL — a project page
 * pointed at the wrong repo would be a silent mislink.
 *
 * Tiles are read as `<li … data-toolbox-entry … data-toolbox-repo …
 * [data-toolbox-showcase]>` so the check follows the markup rather than a
 * parallel list. Returns one message per offending tile (empty when the page
 * is consistent), so the check keeps passing as entries are added.
 */
export function toolboxLinkProblems(html) {
  const problems = [];
  const tiles = html
    .split('<li')
    .slice(1)
    .filter((chunk) => chunk.includes('data-toolbox-entry="'));

  for (const tile of tiles) {
    const attr = (name) => tile.match(new RegExp(`${name}="([^"]*)"`))?.[1];
    const name = attr('data-toolbox-entry');
    const repo = attr('data-toolbox-repo');
    const showcase = attr('data-toolbox-showcase');
    const pypi = attr('data-toolbox-pypi');

    if (!repo || !/^https:\/\/github\.com\/pengzhao-ai\/[A-Za-z0-9._-]+\/?$/.test(repo)) {
      problems.push(
        `toolbox entry "${name}" does not link a repo under github.com/pengzhao-ai (${repo ?? 'no repo link'})`
      );
      continue;
    }

    const repoName = repo.replace(/\/+$/, '').split('/').pop();
    if (name !== repoName) {
      problems.push(`toolbox entry "${name}" is tagged with repo "${repoName}"`);
    }
    if (showcase && showcase !== `https://pengzhao-ai.github.io/${repoName}/`) {
      problems.push(`toolbox entry "${name}" write-up link is not the repo's own GitHub Pages URL (${showcase})`);
    }
    if (pypi && !/^https:\/\/pypi\.org\/project\/[A-Za-z0-9._-]+\/?$/.test(pypi)) {
      problems.push(`toolbox entry "${name}" PyPI link is not a pypi.org project URL (${pypi})`);
    }
  }

  return problems;
}

/**
 * The homepage's featured post card has two layout invariants:
 *  - with a cover, the image stays in a 16:9 frame that does not stretch to
 *    the (taller) text column, which would crop the title;
 *  - without a cover, the card does not keep the two-column grid, which would
 *    squeeze the text into a half-width track.
 */
export function featuredPostProblems(html) {
  const marker = 'data-featured-post';
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return [];

  const articleStart = html.lastIndexOf('<article', markerIndex);
  const articleEnd = html.indexOf('</article>', markerIndex);
  if (articleStart === -1 || articleEnd === -1) return ['featured post markup is incomplete'];

  const article = html.slice(articleStart, articleEnd + '</article>'.length);
  const articleClass = article.match(/<article[^>]*class="([^"]*)"/)?.[1] ?? '';
  const imageIndex = article.indexOf('<img');
  const problems = [];

  if (imageIndex === -1) {
    if (articleClass.includes('md:grid-cols-')) {
      problems.push('coverless featured post must not use the two-column grid');
    }
    return problems;
  }

  const anchorStart = article.lastIndexOf('<a', imageIndex);
  const anchor = anchorStart === -1 ? '' : article.slice(anchorStart, imageIndex);
  const anchorClass = anchor.match(/class="([^"]*)"/)?.[1] ?? '';

  if (!anchorClass.includes('aspect-[16/9]')) {
    problems.push('featured post image frame must keep a 16:9 aspect ratio');
  }
  if (/md:aspect-auto|md:h-full/.test(anchorClass)) {
    problems.push('featured post image frame must not stretch to the text column height');
  }
  if (!anchorClass.includes('self-start')) {
    problems.push('featured post image frame must align to the top of the grid row');
  }
  return problems;
}

export async function main() {
  const failures = [];
  const check = (condition, message) => {
    if (!condition) failures.push(message);
  };

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

  // 3. No template identifiers survive anywhere in the output. The AstroWind
  //    terms/privacy demo pages ("Demo content", "[Company name]" placeholders)
  //    were retired rather than shipped — a public site must not carry
  //    placeholder legal copy (review finding).
  const FORBIDDEN = [
    'astrowind.vercel.app',
    '@arthelokyo',
    'arthelokyo',
    'googleSiteVerificationId',
    'Demo content',
    '[Company name]',
  ];

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
  for (const problem of featuredPostProblems(home)) failures.push(problem);

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
  // The featured section renders only featured entries — currently journals —
  // so its heading must not promise patents it does not render (review finding).
  check(!home.includes('Selected papers and patents'), 'home featured heading promises patents it does not render');
  // Owner update (2026-10-15): the hero bio is now the About Me draft, and the
  // slim experience strip it replaces is gone — the affiliations live inside
  // the About text itself. Both paragraphs are anchored (the owner edits this
  // copy by hand, so transcription drift is the risk); the strip's descriptive
  // line pins the removal.
  check(
    home.includes('fascinated by how devices perceive and interact with the physical world'),
    'home page is missing the About Me opening paragraph'
  );
  check(home.includes('connecting with new people'), 'home page is missing the About Me second paragraph');
  check(
    !home.includes('Optical and imaging systems across semiconductor lithography'),
    'the retired experience strip is still rendered on the home page'
  );
  const homeEntries = (home.match(/data-publication(?![-\w])/g) ?? []).length;
  check(homeEntries >= 3, `home page renders ${homeEntries} publication entries (expected the 3 patents)`);
  check(home.includes('US20230086536A1'), 'home patents group is missing its entries');

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
    check(
      triggers > 0 && triggers === inRoot,
      `only ${inRoot}/${triggers} photo triggers are inside the lightbox root`
    );
  }

  // 12. Toolbox (owner item 6): the page is a structure-first index of public
  //     repos. Both categories render, the GitHub profile is linked, and every
  //     category shows either its entries or its empty state — the marker is a
  //     data attribute so the owner can add entries without breaking the check.
  const toolboxPath = path.join(DIST, 'toolbox', 'index.html');
  if (await exists(toolboxPath)) {
    const toolbox = await readFile(toolboxPath, 'utf8');
    check(toolbox.includes('https://github.com/pengzhao-ai'), 'toolbox page does not link the GitHub profile');
    check(/data-toolbox-category="optics"/.test(toolbox), 'toolbox page is missing the optics category');
    check(/data-toolbox-category="ai"/.test(toolbox), 'toolbox page is missing the AI category');
    for (const problem of toolboxSectionProblems(toolbox)) check(false, problem);
    check(!toolbox.includes('Case study'), 'toolbox page still carries case-study copy');
    // Owner update (2026-10-15): the first entry, with its write-up and source
    // links. The write-up is the repo's own GitHub Pages page — pinned by URL
    // and validated for every tile by toolboxLinkProblems.
    check(
      toolbox.includes('https://pengzhao-ai.github.io/webcam-smartDet/'),
      'toolbox page is missing the webcam-smartDet write-up link'
    );
    check(
      toolbox.includes('https://github.com/pengzhao-ai/webcam-smartDet'),
      'toolbox page is missing the webcam-smartDet source link'
    );
    check(toolbox.includes('Webcam Smart Detection'), 'toolbox page is missing the webcam-smartDet entry');
    // Owner update (2026-10-16): the second entry, in optics — the category
    // that showed its empty state until now.
    check(
      toolbox.includes('https://pengzhao-ai.github.io/SFR_Slanted/'),
      'toolbox page is missing the SFR_Slanted write-up link'
    );
    check(
      toolbox.includes('https://github.com/pengzhao-ai/SFR_Slanted'),
      'toolbox page is missing the SFR_Slanted source link'
    );
    check(toolbox.includes('Slanted-Edge SFR'), 'toolbox page is missing the SFR_Slanted entry');
    // Owner update (2026-10-30): camsim, the flagship sensor/ISP simulator,
    // enters the optics category with its PyPI release linked on the tile.
    check(
      toolbox.includes('https://pengzhao-ai.github.io/camsim/'),
      'toolbox page is missing the camsim write-up link'
    );
    check(toolbox.includes('https://github.com/pengzhao-ai/camsim'), 'toolbox page is missing the camsim source link');
    check(toolbox.includes('https://pypi.org/project/camsim/'), 'toolbox page is missing the camsim PyPI link');
    check(toolbox.includes('camsim — Camera Sensor &amp; ISP Simulation'), 'toolbox page is missing the camsim entry');
    for (const problem of toolboxLinkProblems(toolbox)) check(false, problem);
  }
  check(home.includes('/toolbox'), 'home page does not link to /toolbox');

  // The home toolbox panel highlights the featured entries — thumbnails, links,
  // and no leftover "coming soon" copy now that entries exist. All three
  // projects are featured (owner decision, 2026-10-30), camsim leading.
  const homeTiles = home
    .split('<li')
    .slice(1)
    .filter((chunk) => chunk.includes('data-toolbox-entry="'));
  check(
    homeTiles.length >= 3,
    `home page highlights ${homeTiles.length} featured toolbox entries (expected all three)`
  );
  check(
    homeTiles.every((tile) => /<img\b/.test(tile)),
    'a home featured toolbox entry has no thumbnail'
  );
  check(
    /webcam-smartdet[^"']*\.(webp|avif|png|jpe?g)/.test(home),
    'the home featured toolbox entry does not serve the webcam-smartDet thumbnail'
  );
  check(
    /sfr-slanted[^"']*\.(webp|avif|png|jpe?g)/.test(home),
    'the home featured toolbox entry does not serve the SFR_Slanted thumbnail'
  );
  check(
    /camsim[^"']*\.(webp|avif|png|jpe?g)/.test(home),
    'the home featured toolbox entry does not serve the camsim thumbnail'
  );
  check(
    home.includes('https://pengzhao-ai.github.io/camsim/'),
    'home page is missing the camsim featured toolbox entry'
  );
  check(home.includes('https://pypi.org/project/camsim/'), 'home page is missing the camsim PyPI link');
  check(
    home.includes('https://pengzhao-ai.github.io/SFR_Slanted/'),
    'home page is missing the SFR_Slanted featured toolbox entry'
  );
  check(!home.includes('First entries are on the way'), 'home toolbox panel still promises entries that now exist');
  for (const problem of toolboxLinkProblems(home)) check(false, problem);

  // 13. Publications (owner item 8 + Q3, revised twice): the summary,
  //     citation line, and patent details are the owner's résumé wording
  //     verbatim; the papers list is the owner's ORCID record plus two
  //     Crossref-verified 2012 LED papers (ORCID was chosen after the
  //     Google-Scholar-scraped list read as inaccurate — namesake entries).
  //     Anchors guard against transcription drift; the Scholar-author and
  //     erratum checks pin the exclusions.
  const publicationsPage = await readFile(path.join(DIST, 'publications', 'index.html'), 'utf8');
  check(!publicationsPage.includes('data-filter-bar'), 'publication filter bar still rendered');
  const pubCount = (publicationsPage.match(/data-publication(?![-\w])/g) ?? []).length;
  check(
    pubCount === 33,
    `publications page lists ${pubCount} entries (expected 12 journal + 18 conference + 3 patents)`
  );
  check(
    publicationsPage.includes('data-publication-section="journal-articles"'),
    'publications page is missing the journal-articles section'
  );
  check(
    publicationsPage.includes('data-publication-section="conference-papers"'),
    'publications page is missing the conference-papers section'
  );
  check(
    publicationsPage.includes('Nondegenerate three-photon absorption in zinc-blende semiconductors'),
    'papers panel is missing the 2025 Optics Express paper (ORCID anchor)'
  );
  check(
    publicationsPage.includes(
      'Analysis of light extraction efficiency enhancement for thin-film-flip-chip InGaN quantum wells light-emitting diodes with GaN micro-domes'
    ),
    'papers panel is missing the 2012 micro-domes LED paper (Crossref-verified)'
  );
  check(
    publicationsPage.includes(
      'Analysis of TM mode light extraction efficiency enhancement for deep ultraviolet AlGaN quantum wells light-emitting diodes with III-nitride micro-domes'
    ),
    'papers panel is missing the 2012 TM-mode LED paper (Crossref-verified)'
  );
  check(publicationsPage.includes('https://doi.org/10.1364/OE.543020'), 'papers panel is missing DOI links');
  check(
    publicationsPage.includes('https://doi.org/10.1364/OE.20.00A765'),
    'the micro-domes LED paper DOI link is missing'
  );
  check(publicationsPage.includes('orcid.org/0000-0001-6370-4206'), 'publications page does not link the ORCID record');
  check(
    !publicationsPage.includes('Erratum'),
    'the Optics Express erratum ships as a paper (a correction notice, not a paper)'
  );
  check(
    publicationsPage.includes('13 Journals, 8 Refereed Proceedings, and 28 Conference Presentations'),
    'publications page is missing the résumé publications summary'
  );
  check(
    publicationsPage.includes('Total Citations: 750+ (as of 2025.4); h-index: 11'),
    'publications page is missing the résumé citations line'
  );
  check(publicationsPage.includes('US20230086536A1'), 'publications page is missing the résumé patent citation');
  check(
    !publicationsPage.includes('MR Ferdinandus'),
    'Scholar-scraped publication entries are still on the publications page'
  );

  // 14. Contextual social links (owner update 2026-10-15): Instagram joins
  //     /photography, Substack joins /blog, and both enter the shared social
  //     row (src/data/socials.ts) that the home page and footer render. The
  //     URLs are the owner's own, transcribed in artifacts/socials.md.
  check(photoPage.includes('https://www.instagram.com/paulgazeup/'), 'photography page is missing the Instagram link');
  check(blogIndex.includes('https://substack.com/@pengzha0'), 'blog page is missing the Substack link');
  check(home.includes('https://www.instagram.com/paulgazeup/'), 'home social row is missing the Instagram link');
  check(home.includes('https://substack.com/@pengzha0'), 'home social row is missing the Substack link');

  if (failures.length) {
    console.error(`\n✗ ${failures.length} verification failure(s):\n`);
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error('');
    process.exit(1);
  }

  console.log(`✓ build verification passed (${textFiles.length} files scanned)`);
}

if (import.meta.filename === process.argv[1]) {
  await main();
}
