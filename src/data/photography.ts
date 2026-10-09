/**
 * Optional per-photo metadata, keyed by the output filename under
 * src/assets/images/photography/<category>/.
 *
 * Photos appear on /photography automatically once they exist on disk.
 * This file only adds what a filename cannot express: a title, a location,
 * and meaningful alt text. Categories with no override still render, using
 * the filename as the caption — see Review Focus #2.
 */
export interface PhotoOverride {
  title?: string;
  location?: string;
  alt?: string;
  /** Higher sorts first within its category. */
  weight?: number;
}

/** Display order and labels for categories. Unknown categories sort last. */
export const CATEGORY_LABELS: Record<string, string> = {
  landscape: 'Landscape',
  wildlife: 'Wildlife',
  macro: 'Macro',
  portrait: 'Portrait',
  streets: 'Street',
};

export const CATEGORY_ORDER = ['landscape', 'wildlife', 'portrait', 'macro', 'streets'];

export const PHOTO_OVERRIDES: Record<string, PhotoOverride> = {};
