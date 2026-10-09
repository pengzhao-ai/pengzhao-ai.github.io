import type { Publication } from '~/types';

/** Publications-page header text. The headline numbers live in `metrics.ts`. */
export const PUBLICATION_METRICS = {
  scholarUrl: 'https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1',
};

/**
 * The full scholarly record, transcribed verbatim from the owner's Google
 * Scholar profile (fetched 2026-10-09). Titles and author lists are copied
 * exactly; venue strings keep Scholar's volume/issue/pages, with the trailing
 * ", YYYY" dropped because the year renders separately.
 *
 * Curation rule (owner decision Q2: "journals + proceedings, verbatim"):
 * - Journals: peer-reviewed articles. Two erratas, two bioRxiv preprints, and
 *   meeting abstracts (titles starting "Abstract ", or single-page e-ranges
 *   like e62-e62 in a journal's abstract supplement) are excluded.
 * - Proceedings: refereed volumes with page numbers (SPIE, IEEE, etc.).
 *   "(Conference Presentation)" rows and unrefereed meeting-program entries
 *   (CLEO, Frontiers in Optics, Laser Science, OSA Nonlinear Optics, …) are
 *   excluded, as are rows Scholar lists without a venue.
 * - Patents: from the owner's résumé (Scholar does not index them).
 * The owner reviews this list before the site is published.
 */

const JOURNAL_PUBLICATIONS: Publication[] = [
  {
    title: 'Temporal, spectral, and polarization dependence of the nonlinear optical response of carbon disulfide',
    authors: ['M Reichert', 'H Hu', 'M Ferdinandus', 'M Seidel', 'P Zhao', 'TR Ensley', '...'],
    venue: 'Optica 1 (6), 436-445',
    year: 2014,
    type: 'journal',
    tags: [],
    featured: true,
  },
  {
    title:
      'Analysis of light extraction efficiency enhancement for thin-film-flip-chip InGaN quantum wells light-emitting diodes with GaN micro-domes',
    authors: ['P Zhao', 'H Zhao'],
    venue: 'Optics express 20 (S5), A765-A776',
    year: 2012,
    type: 'journal',
    tags: [],
    featured: true,
  },
  {
    title: 'Temporal and polarization dependence of the nonlinear optical response of solvents',
    authors: ['P Zhao', 'M Reichert', 'S Benis', 'DJ Hagan', 'EW Van Stryland'],
    venue: 'Optica 5 (5), 583-594',
    year: 2018,
    type: 'journal',
    tags: [],
    featured: true,
  },
  {
    title:
      'Analysis of TM mode light extraction efficiency enhancement for deep ultraviolet AlGaN quantum wells light-emitting diodes with III-nitride micro-domes',
    authors: ['P Zhao', 'L Han', 'MR McGoogan', 'H Zhao'],
    venue: 'Optical Materials Express 2 (10), 1397-1406',
    year: 2012,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Beam deflection measurement of bound-electronic and rotational nonlinear refraction in molecular gases',
    authors: ['M Reichert', 'P Zhao', 'JM Reed', 'TR Ensley', 'DJ Hagan', 'EW Van Stryland'],
    venue: 'Optics Express 23 (17), 22224-22237',
    year: 2015,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Dispersion of nondegenerate nonlinear refraction in semiconductors',
    authors: ['P Zhao', 'M Reichert', 'DJ Hagan', 'EW Van Stryland'],
    venue: 'Optics express 24 (22), 24907-24920',
    year: 2016,
    type: 'journal',
    tags: [],
  },
  {
    title:
      'Non‐invasive detection of early‐stage fatty liver disease via an on‐skin impedance sensor and attention‐based deep learning',
    authors: ['K Wang', 'S Margolis', 'JM Cho', 'S Wang', 'B Arianpour', 'A Jabalera', 'J Yin', '...'],
    venue: 'Advanced Science 11 (31), 2400596',
    year: 2024,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Electronic nature of new Ir (III) complexes: linear spectroscopic and nonlinear optical properties',
    authors: ['P Zhao', 'S Tofighi', 'RM O’Donnell', 'J Shi', 'PY Zavalij', 'MV Bondar', 'DJ Hagan', '...'],
    venue: 'The Journal of Physical Chemistry C 121 (42), 23609-23617',
    year: 2017,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Zwitterionic cyanine–cyanine salt: Structure and optical properties',
    authors: ['Z Li', 'P Zhao', 'S Tofighi', 'R Sharma', 'TR Ensley', 'SH Jang', 'DJ Hagan', '...'],
    venue: 'The Journal of Physical Chemistry C 120 (28), 15378-15384',
    year: 2016,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Machine learning‐directed electrical impedance tomography to predict metabolically vulnerable plaques',
    authors: ['J Chen', 'S Wang', 'K Wang', 'P Abiri', 'ZY Huang', 'J Yin', 'AM Jabalera', '...'],
    venue: 'Bioengineering & translational medicine 9 (1), e10616',
    year: 2024,
    type: 'journal',
    tags: [],
  },
  {
    title:
      'Cationic polyelectrolyte for anionic cyanines: An efficient way to translate molecular properties into material properties',
    authors: ['Z Li', 'AA Syed', 'P Zhao', 'JC Yang', 'R Sharma', 'TR Ensley', 'JD Matichak', '...'],
    venue: 'Journal of the American Chemical Society 141 (43), 17331-17336',
    year: 2019,
    type: 'journal',
    tags: [],
  },
  {
    title:
      'Rapid prediction of acute thrombosis via nanoengineered immunosensors with unsupervised clustering for multiple circulating biomarkers',
    authors: ['K Wang', 'S Wang', 'S Margolis', 'JM Cho', 'E Zhu', 'A Dupuy', 'J Yin', 'SK Park', '...'],
    venue: 'Science Advances 10 (50), eadq6778',
    year: 2024,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Fast triplet population in iridium (III) complexes with less than unity singlet to triplet quantum yield',
    authors: ['S Tofighi', 'P Zhao', 'RM O’Donnell', 'J Shi', 'PY Zavalij', 'MV Bondar', 'DJ Hagan', '...'],
    venue: 'The Journal of Physical Chemistry C 123 (22), 13846-13855',
    year: 2019,
    type: 'journal',
    tags: [],
  },
  {
    title:
      'Chromenes involving a two-photon absorbing moiety: photochromism via intramolecular resonance energy transfer',
    authors: ['L Bekere', 'V Lokshin', 'M Sigalov', 'R Gvishi', 'P Zhao', 'DJ Hagan', '...'],
    venue: 'New Journal of Chemistry 40 (2), 1143-1148',
    year: 2016,
    type: 'journal',
    tags: [],
  },
  {
    title:
      'Dual emissive multinuclear Iridium (III) complexes in solutions: Linear photophysical properties, two-photon absorption spectra, and photostability',
    authors: ['P Zhao', 'S Tofighi', 'RM O’Donnell', 'J Shi', 'MV Bondar', 'DJ Hagan', '...'],
    venue: 'The Journal of Physical Chemistry C 122 (12), 6786-6793',
    year: 2018,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Mechanically activated snai1b coordinates the initiation of myocardial delamination for trabeculation',
    authors: ['J Wang', 'AL Brown', 'SK Park', 'CZ Zheng', 'A Langenbacher', 'E Zhu', '...'],
    venue: 'Nature Communications 16 (1), 8363',
    year: 2025,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Habitual exercise modulates neuroimmune interaction to mitigate aortic stiffness',
    authors: ['JM Cho', 'K Vu', 'SK Park', 'E Zhu', 'YR Li', 'P Zhao', 'T Yokota', 'L Yang', 'R Lu', '...'],
    venue: 'Circulation research 136 (12), 1579-1594',
    year: 2025,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Refractive Index‐Corrected Light‐Sheet Microscopy for Macro‐View Cardiovascular Imaging',
    authors: ['E Zhu', 'Y Zhang', 'P Zhao', 'JM Cho', 'Z Wang', 'YR Li', 'J Wang', 'S Margolis', '...'],
    venue: 'Advanced Science 12 (38), e03684',
    year: 2025,
    type: 'journal',
    tags: [],
  },
  {
    title: 'FAP-Directed CAR-NKT Cells for Multi-Target Suppression of Atherosclerotic Progression',
    authors: ['E Zhu', 'YR Li', 'JM Cho', 'R Kropp', 'Y Zhang', 'Y Sanaiha', 'OJ Kwon', 'Y Zhu', '...'],
    venue: 'Circulation research 139 (8), e328898',
    year: 2026,
    type: 'journal',
    tags: [],
  },
  {
    title: 'Nondegenerate three-photon absorption in zinc-blende semiconductors',
    authors: ['M Reichert', 'P Zhao', 'DJ Hagan', 'EW Van Stryland'],
    venue: 'Optics Express 33 (11), 22104-22118',
    year: 2025,
    type: 'journal',
    tags: [],
  },
];

const PROCEEDING_PUBLICATIONS: Publication[] = [
  {
    title: 'Nonlinear refraction dynamics of solvents and gases',
    authors: ['P Zhao', 'M Reichert', 'TR Ensley', 'WM Shensky III', 'AG Mott', 'DJ Hagan', '...'],
    venue: 'Nonlinear Frequency Generation and Conversion: Materials, Devices, and …',
    year: 2016,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Nondegenerate two-and three-photon nonlinearities in semiconductors',
    authors: ['M Reichert', 'P Zhao', 'HS Pattanaik', 'DJ Hagan', 'EW Van Stryland'],
    venue: 'Ultrafast Bandgap Photonics 9835, 23-31',
    year: 2016,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Nonlinear solid-state filter based on photochromism induced by 2-photon absorption in a dye-doped sol-gel',
    authors: ['R Gvishi', 'P Zhao', 'H Hu', 'G Strum', 'A Tal', 'S Grinvald', 'G Bar', 'L Bekere', '...'],
    venue: 'Light Manipulating Organic Materials and Devices 9181, 63-71',
    year: 2014,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Quantum yield measurement of organometallic complexes using double pump probe technique',
    authors: ['S Tofighi', 'P Zhao', "RM O'Donnell", 'J Shi', 'PY Zavalij', 'MV Bondar', 'DJ Hagan', '...'],
    venue: '2019 IEEE Research and Applications of Photonics in Defense Conference …',
    year: 2019,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Dispersion of extremely nondegenerate nonlinear refraction in semiconductors',
    authors: ['P Zhao', 'DJ Hagan', 'EW Van Stryland'],
    venue: '2017 IEEE Photonics Conference (IPC), 711-712',
    year: 2017,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Extremely Nondegenerate Two-photon Processes in Semiconductors',
    authors: ['DJ Hagan', 'HS Pattanaik', 'P Zhao', 'M Reichert', 'EW Van Stryland'],
    venue: 'International Conference on Photonics, Optics and Laser Technology 2, 65-69',
    year: 2017,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Nondegenerate nonlinear refraction, absorption, and gain in semiconductors',
    authors: ['DJ Hagan', 'M Reichert', 'P Zhao', 'HS Pattanaik', 'EW Van Stryland'],
    venue: 'SPIE Ultrafast Bandgap Photonics II',
    year: 2017,
    type: 'conference',
    tags: [],
  },
];

const PATENT_PUBLICATIONS: Publication[] = [
  {
    title: 'Cylindrical Retroreflector Array for Rotation Tracking',
    authors: ['Peng Zhao'],
    year: 2023,
    type: 'patent',
    patentNumber: 'US 2023/0086536 A1',
    status: 'Issued',
    tags: ['Optics', 'Hardware'],
    abstract:
      'A cylindrical retroreflector array that returns incident light along the axis of rotation, enabling rotational position tracking in a compact optical package.',
  },
  {
    title: 'Optical Sensing of Translational and Rotational Shaft Movements',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'US 63/541,246',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'System Design'],
    abstract:
      'An optical architecture that resolves both translational and rotational movement of a shaft from a single sensing path.',
  },
  {
    title: 'Single Photon Avalanche Diodes for Rotational and Translational Input Detection',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'US 18/892,374',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'Edge AI'],
    abstract: 'Applying single-photon avalanche diode arrays to joint rotational and translational input detection.',
  },
];

export const PUBLICATIONS: Publication[] = [
  ...JOURNAL_PUBLICATIONS,
  ...PROCEEDING_PUBLICATIONS,
  ...PATENT_PUBLICATIONS,
];
