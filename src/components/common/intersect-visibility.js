/**
 * Decide whether an observed element counts as revealed.
 *
 * An element reveals when the fraction of it inside the viewport reaches the
 * threshold its classes ask for (`intersect-quarter` → 0.25, `intersect-half`
 * → 0.5, `intersect-full` → 0.99, default 0). That fraction is capped at
 * viewportHeight / elementHeight, so an element taller than
 * viewportHeight / threshold can never reach it: the publications page's
 * ~5800px wrapper with threshold 0.25 stayed at opacity 0 on any screen
 * shorter than 1450px — the page rendered empty. For those elements any
 * intersection counts instead.
 *
 * @param {object} options
 * @param {boolean} options.isIntersecting the observer's current verdict
 * @param {number} options.intersectionRatio fraction of the element in view (0–1)
 * @param {number} options.threshold fraction demanded by the element's classes (0–1)
 * @param {number} options.elementHeight element height in px
 * @param {number} options.viewportHeight viewport height in px
 * @returns {boolean} true when the element should be considered revealed
 */
export function shouldReveal({ isIntersecting, intersectionRatio, threshold, elementHeight, viewportHeight }) {
  if (!isIntersecting) return false;
  if (elementHeight * threshold > viewportHeight) return true;
  return intersectionRatio >= threshold;
}
