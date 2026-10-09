export interface CVEntryData {
  role: string;
  org: string;
  location?: string;
  start: string;
  end: string;
  /** Rendered as `· Present` when true. */
  current?: boolean;
  highlights: string[];
}

export interface CVEducation {
  degree: string;
  org: string;
  location?: string;
  start: string;
  end: string;
  detail?: string;
}

export interface CVPatent {
  title: string;
  number: string;
  status: 'Issued' | 'Filed';
  date?: string;
}

// The headline figures are not restated here. They are defined once in
// `src/data/metrics.ts` as `HEADLINE_METRICS` and consumed by this page,
// /publications, and the home page. Import them from there.

export const CV_SUMMARY =
  'A camera and optical systems engineer with a proven track record of shipping solutions for multiple products from concept to mass production. Specializes in developing end-to-end simulation frameworks by integrating optics, sensor and imaging pipelines, and virtual experiences across technical domains. Able to synthesize design trade-offs and drive cross-functional outcomes. Experience spanning build cycles in manufacturing, testing, and spec engineering for high-volume production.';

export const CV_EXPERIENCE: CVEntryData[] = [
  {
    role: 'Eye and Face Tracking Systems Engineer',
    org: 'Meta',
    location: 'Sunnyvale, CA',
    start: '2024.02',
    end: '',
    current: true,
    highlights: [
      'Leads the optical design and architecture for advanced eye and face tracking camera systems across all Meta VR products, and roadmap explorations.',
      'Developed end-to-end frameworks of full optical systems including camera module, ET/FT illumination, and display viewing optics, with an imaging pipeline supporting high-fidelity rendering. Deeply integrated with software platforms to accurately model user experience.',
      'Designed system-level KPIs for ET/FT, established factory testing protocols, and demonstrated production quality and yield over builds.',
    ],
  },
  {
    role: 'Sensing Hardware Engineer',
    org: 'Apple',
    location: 'Cupertino, CA',
    start: '2020.06',
    end: '2024.03',
    highlights: [
      "Led optical design of Apple's first coherent optical sensor for velocity tracking; shipped with Apple Watch Ultra in Fall 2022.",
      'Updated the optical design of an image tracking based sensor; shipped with Apple Vision Pro in Fall 2023.',
      'Invented a new microstructure optical surface with enhanced retroreflection (patent issued), leading to significant cost and size reduction at system level; shipped in all SKUs of Apple Watch in Fall 2025.',
      'Invented a novel optical architecture of an image tracking sensor capable of tracking both rotation and translation (patent filed).',
    ],
  },
  {
    role: 'Senior Design Engineer / Team Lead',
    org: 'ASML',
    location: 'Wilton, CT',
    start: '2017.11',
    end: '2020.06',
    highlights: [
      'Solved a polarization crosstalk issue to enable the launch of the first-generation polarization-resolved ORION wafer alignment sensor.',
      'Led technical development of a new wavelength demultiplexer module, delivering vendor specification, prototype builds, and machine integration.',
      'Led a cross-functional team developing a €2M production tester for next-generation product build and qualification, advancing both hardware and algorithm levels to achieve sub-nanometer motion accuracy KPIs.',
      'Invented a new solid-state spectral filter module for a supercontinuum laser (internal IP publication).',
    ],
  },
  {
    role: 'Postdoctoral Research Associate',
    org: 'CREOL, University of Central Florida',
    location: 'Orlando, FL',
    start: '2016.10',
    end: '2017.11',
    highlights: [
      'Developed a novel nonlinear optical spectrometer based on supercontinuum.',
      'Developed a numerical model for double pump-probe interactions in new Ir(III) complexes.',
      'Led an NSF I-Corps program exploring commercialization of laser refrigeration technology for thermal management in electronics.',
      'Funded by the UCF Pre-eminent Postdoctoral Program (P3) and an NSF I-Corps Site Grant.',
    ],
  },
  {
    role: 'Graduate Research Assistant',
    org: 'CREOL, University of Central Florida',
    location: 'Orlando, FL',
    start: '2012.08',
    end: '2016.10',
    highlights: [
      'First-ever observation of nondegenerate nonlinear refraction and three-photon absorption in semiconductors, and molecular responses in solvents and gases.',
      'Pioneered a novel two-photon, FRET-enhanced photochromic molecule for strong, broadband optical limiting applications.',
    ],
  },
  {
    role: 'Graduate Research and Teaching Assistant',
    org: 'Case Western Reserve University',
    location: 'Cleveland, OH',
    start: '2010.08',
    end: '2012.08',
    highlights: [
      'Designed (using FDTD) and fabricated micro-dome structures to enhance the light extraction efficiency of III-nitride based LEDs.',
    ],
  },
];

export const CV_EDUCATION: CVEducation[] = [
  {
    degree: 'Ph.D. in Optics and Photonics',
    org: 'University of Central Florida, CREOL',
    start: '2012.08',
    end: '2016.10',
    detail:
      'Advisors: Eric W. Van Stryland and David J. Hagan. Dissertation: Ultrafast Mechanisms of Nonlinear Refraction and Two-photon Photochromism.',
  },
  {
    degree: 'M.S. in Electrical Engineering',
    org: 'Case Western Reserve University, EECS',
    start: '2010.08',
    end: '2012.08',
    detail:
      'Advisor: Hongping Zhao. Thesis: Analysis of Light Extraction Efficiency Enhancement for Deep Ultraviolet and Visible Light-Emitting Diodes with III-Nitride Micro Domes.',
  },
  {
    degree: 'B.S. in Measuring and Controlling Technology and Instruments',
    org: 'Tianjin University',
    start: '2006.08',
    end: '2010.08',
    detail:
      'Precision Instruments and Optoelectronics Engineering. Thesis: Design and optimization of a mobile LED backlight module.',
  },
];

export const CV_PATENTS: CVPatent[] = [
  {
    title: 'Cylindrical Retroreflector Array for Rotation Tracking',
    number: 'US 2023/0086536 A1',
    status: 'Issued',
    date: '2023.03',
  },
  {
    title: 'Optical Sensing of Translational and Rotational Shaft Movements',
    number: 'US 63/541,246',
    status: 'Filed',
  },
  {
    title: 'Single Photon Avalanche Diodes for Rotational and Translational Input Detection',
    number: 'US 18/892,374',
    status: 'Filed',
  },
];

export const CV_LINKS = {
  email: 'peng.zhao1@outlook.com',
  location: 'SF Bay Area, CA',
  github: 'https://github.com/pengzhao-ai',
  linkedin: 'https://www.linkedin.com/in/peng-zhao-nlo/',
  scholar: 'https://scholar.google.com/citations?user=w0H4EiQAAAAJ&hl=en&authuser=1',
  orcid: 'https://orcid.org/0000-0001-6370-4206',
  x: 'https://x.com/pengzha0',
};
