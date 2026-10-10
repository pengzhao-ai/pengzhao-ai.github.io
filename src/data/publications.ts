import type { Publication } from '~/types';

/**
 * Publications-page text. `summary` and `citations` are verbatim from the
 * owner's résumé (Publications section: "13 Journals, 8 Refereed Proceedings,
 * and 28 Conference Presentations. Google Scholar (Link): Total Citations:
 * 750+ (as of 2025.4); h-index: 11").
 */
export const PUBLICATION_METRICS = {
  scholarUrl: 'https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1',
  orcidUrl: 'https://orcid.org/0000-0001-6370-4206',
  summary: '13 Journals, 8 Refereed Proceedings, and 28 Conference Presentations.',
  citations: 'Total Citations: 750+ (as of 2025.4); h-index: 11',
};

/**
 * The papers, transcribed from the owner's ORCID record (fetched 2026-10-09
 * from https://pub.orcid.org/v3.0/0000-0001-6370-4206/works). ORCID is the
 * source the owner chose after the Google-Scholar-scraped list read as
 * inaccurate (namesake entries). Titles, venues, years, and DOIs are as
 * ORCID states them, with four editorial notes:
 *
 * - Every ORCID `journal-article` is listed except the 2016 Optics Express
 *   erratum of the 2015 beam-deflection paper (a correction notice, not a
 *   paper). That 2015 paper, the 2012 LED journal papers, and the rest of
 *   the résumé's "13 Journals" are not in ORCID — add them there to have
 *   them listed here.
 * - Conference entries are deduplicated by title (the four 2014 "CS2"
 *   records and the two 2014 "Förster resonance" records each describe one
 *   presentation indexed several times), and the publisher-collection
 *   placeholder venue "Optics InfoBase Conference Papers" is omitted — it
 *   names the index, not the conference.
 * - Papers carry no `authors`: ORCID summaries do not hold complete
 *   contributor lists, so printing "Peng Zhao" alone would misstate the
 *   authorship. The DOI link carries the full record.
 * - One title's chemical notation is capitalized ("ir(iii)" → "Ir(III)");
 *   everything else is verbatim.
 *
 * Do not add entries from Google Scholar or any other unsourced list: the
 * site must not publish invented or mis-attributed publications.
 */
const JOURNAL_PUBLICATIONS: Publication[] = [
  {
    title: 'Nondegenerate three-photon absorption in zinc-blende semiconductors',
    venue: 'Optics Express',
    year: 2025,
    type: 'journal',
    tags: [],
    doi: '10.1364/OE.543020',
  },
  {
    title:
      'Cationic Polyelectrolyte for Anionic Cyanines: An Efficient Way To Translate Molecular Properties into Material Properties',
    venue: 'Journal of the American Chemical Society',
    year: 2019,
    type: 'journal',
    tags: [],
    doi: '10.1021/jacs.9b08877',
  },
  {
    title: 'Fast Triplet Population in Iridium(III) Complexes with Less than Unity Singlet to Triplet Quantum Yield',
    venue: 'The Journal of Physical Chemistry C',
    year: 2019,
    type: 'journal',
    tags: [],
    doi: '10.1021/acs.jpcc.9b00539',
  },
  {
    title: 'Temporal and polarization dependence of the nonlinear optical response of solvents',
    venue: 'Optica',
    year: 2018,
    type: 'journal',
    tags: [],
    doi: '10.1364/OPTICA.5.000583',
  },
  {
    title:
      'Dual Emissive Multinuclear Iridium(III) Complexes in Solutions: Linear Photophysical Properties, Two-Photon Absorption Spectra, and Photostability',
    venue: 'The Journal of Physical Chemistry C',
    year: 2018,
    type: 'journal',
    tags: [],
    doi: '10.1021/acs.jpcc.7b12623',
  },
  {
    title: 'Electronic Nature of New Ir(III) Complexes: Linear Spectroscopic and Nonlinear Optical Properties',
    venue: 'The Journal of Physical Chemistry C',
    year: 2017,
    type: 'journal',
    tags: [],
    doi: '10.1021/acs.jpcc.7b06254',
  },
  {
    title:
      'Chromenes involving a two-photon absorbing moiety: Photochromism via intramolecular resonance energy transfer',
    venue: 'New Journal of Chemistry',
    year: 2016,
    type: 'journal',
    tags: [],
    doi: '10.1039/c5nj02490k',
  },
  {
    title: 'Dispersion of nondegenerate nonlinear refraction in semiconductors',
    venue: 'Optics Express',
    year: 2016,
    type: 'journal',
    tags: [],
    doi: '10.1364/OE.24.024907',
  },
  {
    title: 'Zwitterionic Cyanine-Cyanine Salt: Structure and Optical Properties',
    venue: 'Journal of Physical Chemistry C',
    year: 2016,
    type: 'journal',
    tags: [],
    doi: '10.1021/acs.jpcc.6b03037',
  },
  {
    title: 'Temporal, spectral, and polarization dependence of the nonlinear optical response of carbon disulfide',
    venue: 'Optica',
    year: 2014,
    type: 'journal',
    tags: [],
    doi: '10.1364/OPTICA.1.000436',
  },
];

const CONFERENCE_PUBLICATIONS: Publication[] = [
  {
    title: 'Excited-state nonlinearities of Ir(III) complexes',
    year: 2017,
    type: 'conference',
    tags: [],
    doi: '10.1364/CLEO_AT.2017.JTh2A.30',
  },
  {
    title: 'Near-IR white light continuum for broadband Z-scan nonlinear spectroscopy',
    year: 2017,
    type: 'conference',
    tags: [],
    doi: '10.1364/NLO.2017.NTu1B.7',
  },
  {
    title: 'Nondegenerate, transient nonlinear refraction of indium tin oxide excited at epsilon-near-zero',
    year: 2017,
    type: 'conference',
    tags: [],
    doi: '10.1364/NLO.2017.NW1A.3',
  },
  {
    title: 'Time-resolved nonlinear refraction of indium tin oxide at epsilon near zero',
    year: 2017,
    type: 'conference',
    tags: [],
    doi: '10.1364/CLEO_QELS.2017.FM2F.2',
  },
  {
    title: 'Transient ring opening and closing of a two-photon photochromic molecule utilizing energy transfer',
    year: 2017,
    type: 'conference',
    tags: [],
    doi: '10.1364/CLEO_SI.2017.SW1M.3',
  },
  {
    title: 'Measurement of nonlinear optical response functions of common organic solvents',
    venue: '2016 Conference on Lasers and Electro-Optics, CLEO 2016',
    year: 2016,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Nondegenerate two-and three-photon nonlinearities in semiconductors',
    venue: 'Proceedings of SPIE - The International Society for Optical Engineering',
    year: 2016,
    type: 'conference',
    tags: [],
    doi: '10.1117/12.2223286',
  },
  {
    title: 'Nonlinear refraction dynamics of solvents and gases',
    venue: 'Proceedings of SPIE - The International Society for Optical Engineering',
    year: 2016,
    type: 'conference',
    tags: [],
    doi: '10.1117/12.2230485',
  },
  {
    title: 'Transient nonlinear refraction of organic solvents in liquid and gas phase',
    year: 2016,
    type: 'conference',
    tags: [],
    doi: '10.1364/UP.2016.UW4A.8',
  },
  {
    title: 'Beam deflection measurements of nondegenerate nonlinear refractive indices in direct-gap semiconductors',
    venue: 'CLEO: QELS - Fundamental Science, CLEO_QELS 2015',
    year: 2015,
    type: 'conference',
    tags: [],
    doi: '10.1364/CLEO_QELS.2015.FW3D.7',
  },
  {
    title: 'Measurement of Second Hyperpolarizability and Nuclear Rotational Response of Gas-phase Carbon Disulfide',
    venue: 'Nonlinear Optics, NLO 2015',
    year: 2015,
    type: 'conference',
    tags: [],
    doi: '10.1364/NLO.2015.NW4A.37',
  },
  {
    title: 'Beam deflection measurements of transient nonlinear refraction from coherent rotational revivals in air',
    venue: 'Frontiers in Optics, FiO 2014',
    year: 2014,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Comparison of second hyperpolarizability in liquid and gas phases of carbon disulfide',
    year: 2014,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Electronic nature of new Ir(III)-complexes: Linear spectroscopic and nonlinear optical properties',
    year: 2014,
    type: 'conference',
    tags: [],
    doi: '10.1364/FIO.2016.JW4A.183',
  },
  {
    title:
      'Förster resonance energy transfer within a donor-acceptor composite photochromic molecule through one- and two-photon absorption',
    year: 2014,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Measurement of nonlinear refraction dynamics of CS2',
    year: 2014,
    type: 'conference',
    tags: [],
  },
  {
    title: 'Nondegenerate nonlinear refraction in semiconductors',
    year: 2014,
    type: 'conference',
    tags: [],
    doi: '10.1364/FIO.2016.JTh2A.26',
  },
  {
    title: 'Energy transfer within a donor-acceptor photochromic molecule',
    year: 2013,
    type: 'conference',
    tags: [],
  },
];

/**
 * The patents, verbatim from the résumé's Patents section (the doubled
 * opening quote in the résumé's third entry and the missing closing quote
 * are normalized; the wording is unchanged).
 */
const PATENT_PUBLICATIONS: Publication[] = [
  {
    title: 'Cylindrical Retroreflector Array for Rotation Tracking',
    authors: ['Peng Zhao'],
    year: 2023,
    type: 'patent',
    patentNumber: 'US Patent Publication No. US20230086536A1',
    status: 'Issued · Date of Publication: 03/23/2023',
    tags: ['Optics', 'Hardware'],
  },
  {
    title: 'Optical Sensing of Translational and Rotational Shaft Movements',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'US Patent Application No. US63541246',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'System Design'],
  },
  {
    title: 'Single Photon Avalanche Diodes for Rotational and Translational Input Detection',
    authors: ['Peng Zhao'],
    year: 2024,
    type: 'patent',
    patentNumber: 'Application No. US18892374',
    status: 'Filed',
    tags: ['Optics', 'Hardware', 'Edge AI'],
  },
];

export const PUBLICATIONS: Publication[] = [
  ...JOURNAL_PUBLICATIONS,
  ...CONFERENCE_PUBLICATIONS,
  ...PATENT_PUBLICATIONS,
];
