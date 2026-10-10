import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { shouldReveal } from '../../src/components/common/intersect-visibility.js';

// The publications page ships a ~5800px section wrapper carrying
// `intersect-quarter` (threshold 0.25). The intersection ratio of an element
// is capped at viewportHeight / elementHeight, so below a 1450px-tall viewport
// the wrapper can never reach its threshold — it stays at opacity 0 forever
// (the reported "list blinks then stays empty" bug). The observer must treat
// any intersection as revealed when the configured ratio is unreachable.
describe('shouldReveal', () => {
  test('reveals a tall element whose threshold ratio is unreachable', () => {
    const visible = shouldReveal({
      isIntersecting: true,
      intersectionRatio: 0.156,
      threshold: 0.25,
      elementHeight: 5787,
      viewportHeight: 900,
    });
    assert.equal(visible, true);
  });

  test('keeps hiding an element that intersects but is below a reachable threshold', () => {
    const visible = shouldReveal({
      isIntersecting: true,
      intersectionRatio: 0.1,
      threshold: 0.25,
      elementHeight: 1350,
      viewportHeight: 900,
    });
    assert.equal(visible, false);
  });

  test('reveals an element at exactly its threshold', () => {
    const visible = shouldReveal({
      isIntersecting: true,
      intersectionRatio: 0.25,
      threshold: 0.25,
      elementHeight: 800,
      viewportHeight: 900,
    });
    assert.equal(visible, true);
  });

  test('never reveals while the element is not intersecting', () => {
    const visible = shouldReveal({
      isIntersecting: false,
      intersectionRatio: 0,
      threshold: 0.25,
      elementHeight: 5787,
      viewportHeight: 900,
    });
    assert.equal(visible, false);
  });

  test('reveals any intersection at the default threshold', () => {
    const visible = shouldReveal({
      isIntersecting: true,
      intersectionRatio: 0.001,
      threshold: 0,
      elementHeight: 300,
      viewportHeight: 900,
    });
    assert.equal(visible, true);
  });

  test('treats an element exactly four viewports tall as reachable', () => {
    // 3600 * 0.25 == 900 == viewport, so the ratio is satisfiable and the
    // threshold is enforced normally (no early reveal).
    const visible = shouldReveal({
      isIntersecting: true,
      intersectionRatio: 0.2,
      threshold: 0.25,
      elementHeight: 3600,
      viewportHeight: 900,
    });
    assert.equal(visible, false);
  });
});
