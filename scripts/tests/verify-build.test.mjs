import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { featuredPostProblems, toolboxLinkProblems, toolboxSectionProblems } from '../verify-build.mjs';

// Fixtures mirror what src/pages/toolbox.astro + ToolboxGrid render.
const emptySection = (id) =>
  `<section class="panel" data-toolbox-category="${id}">
    <h2 class="font-mono">${id}</h2>
    <div class="mt-6 rounded-xl border border-dashed" data-toolbox-empty>
      <p>First entries are being cleaned up for publication — coming soon.</p>
    </div>
  </section>`;

const entrySection = (id) =>
  `<section class="panel" data-toolbox-category="${id}">
    <h2 class="font-mono">${id}</h2>
    <ul class="grid list-none gap-5 sm:grid-cols-2">
      <li class="tile"><a href="https://github.com/pengzhao-ai/ray-tracer">Ray tracer</a></li>
    </ul>
  </section>`;

const featuredCard = ({
  image = true,
  imageClass = 'relative block aspect-[16/9] self-start',
  articleClass = 'tile-flush grid md:grid-cols-[1.15fr_1fr]',
} = {}) =>
  `<article data-featured-post class="${articleClass}">${
    image ? `<a class="${imageClass}" href="/post/"><img src="/cover.webp" alt="cover"></a>` : ''
  }<div class="p-6">text</div></article>`;

describe('featuredPostProblems', () => {
  test('accepts a cover in a non-stretching 16:9 frame', () => {
    assert.deepEqual(featuredPostProblems(featuredCard()), []);
  });

  test('flags the md stretch that crops the cover', () => {
    const problems = featuredPostProblems(
      featuredCard({ imageClass: 'relative block aspect-[16/9] md:aspect-auto md:h-full self-start' })
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0], /must not stretch/);
  });

  test('flags a frame that is not top-aligned in the grid row', () => {
    const problems = featuredPostProblems(featuredCard({ imageClass: 'relative block aspect-[16/9]' }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /top of the grid row/);
  });

  test('flags a coverless card that keeps the two-column grid', () => {
    const problems = featuredPostProblems(featuredCard({ image: false }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /coverless featured post/);
  });

  test('accepts a coverless card without the two-column grid', () => {
    assert.deepEqual(featuredPostProblems(featuredCard({ image: false, articleClass: 'tile-flush grid' })), []);
  });

  test('reports nothing for a page without a featured card', () => {
    assert.deepEqual(featuredPostProblems('<html><body>no card</body></html>'), []);
  });
});

describe('toolboxSectionProblems', () => {
  test('accepts a category showing its empty state', () => {
    assert.deepEqual(toolboxSectionProblems(emptySection('optics')), []);
  });

  test('accepts a category showing entry tiles', () => {
    // The regression this fixes: the old check asserted the empty-state
    // marker unconditionally, so the first real entry broke verify:build.
    assert.deepEqual(toolboxSectionProblems(entrySection('optics')), []);
  });

  test('flags a category that renders entries and the empty marker together', () => {
    const html = entrySection('optics').replace('<ul', '<div data-toolbox-empty>stale</div><ul');
    assert.equal(toolboxSectionProblems(html).length, 1);
  });

  test('flags a category with neither entries nor the empty marker', () => {
    const html = '<section class="panel" data-toolbox-category="ai"><h2>AI</h2></section>';
    assert.equal(toolboxSectionProblems(html).length, 1);
  });

  test('checks every category section, not just the first', () => {
    const html = `${emptySection('optics')}
      <section class="panel" data-toolbox-category="ai"><h2>AI</h2></section>`;
    const problems = toolboxSectionProblems(html);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /"ai"/);
  });

  test('reports nothing for a page without toolbox sections', () => {
    assert.deepEqual(toolboxSectionProblems('<html><body><p>no toolbox</p></body></html>'), []);
  });
});

// Fixture mirrors the tool tile markup ToolboxGrid renders.
const tile = ({ name = 'webcam-smartDet', repo, showcase, extra = '' }) =>
  `<ul><li class="tile" data-toolbox-entry="${name}" data-toolbox-repo="${repo}"${
    showcase ? ` data-toolbox-showcase="${showcase}"` : ''
  }${extra}><a href="${showcase ?? repo}">${name}</a></li></ul>`;

const REPO = 'https://github.com/pengzhao-ai/webcam-smartDet';
const SHOWCASE = 'https://pengzhao-ai.github.io/webcam-smartDet/';

describe('toolboxLinkProblems', () => {
  test("accepts a tile whose write-up is the repo's own GitHub Pages page", () => {
    assert.deepEqual(toolboxLinkProblems(tile({ repo: REPO, showcase: SHOWCASE })), []);
  });

  test('accepts a tile with no write-up link at all', () => {
    assert.deepEqual(toolboxLinkProblems(tile({ repo: REPO })), []);
  });

  test("flags a write-up link that is not the repo's own Pages URL", () => {
    // The mislink this guards: a tile pointing at another project's page.
    const problems = toolboxLinkProblems(tile({ repo: REPO, showcase: 'https://pengzhao-ai.github.io/other-repo/' }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /write-up link is not the repo's own GitHub Pages URL/);
  });

  test('accepts a write-up on a repo whose URL has a trailing slash', () => {
    assert.deepEqual(toolboxLinkProblems(tile({ repo: `${REPO}/`, showcase: SHOWCASE })), []);
  });

  test("flags a repo outside the owner's GitHub account", () => {
    const problems = toolboxLinkProblems(tile({ repo: 'https://github.com/someone-else/webcam-smartDet' }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /does not link a repo under github\.com\/pengzhao-ai/);
  });

  test('flags a tile tagged with a different repo than it links', () => {
    const problems = toolboxLinkProblems(tile({ name: 'smart-det', repo: REPO }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /is tagged with repo "webcam-smartDet"/);
  });

  test('checks every tile, not just the first', () => {
    const html = `${tile({ repo: REPO, showcase: SHOWCASE })}${tile({
      name: 'other',
      repo: 'https://github.com/pengzhao-ai/other',
      showcase: 'https://example.com/other/',
    })}`;
    assert.equal(toolboxLinkProblems(html).length, 1);
  });

  test('reports nothing for a page without tiles', () => {
    assert.deepEqual(toolboxLinkProblems('<html><body><p>no tiles</p></body></html>'), []);
  });
});
