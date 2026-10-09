import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { toolboxSectionProblems } from '../verify-build.mjs';

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
