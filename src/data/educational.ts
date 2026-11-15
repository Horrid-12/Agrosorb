export interface LearnTopic {
  id: string
  title: string
  icon: string
  summary: string
  body: string[]
  /** Optional key fact shown as a highlighted callout. */
  fact?: string
}

/**
 * Educational content for the Learning Center and the landing-page
 * "Learn About AgroSorb" / "How It Works" modals.
 */
export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: 'runoff',
    title: 'Agricultural Runoff',
    icon: 'cloud-rain',
    summary: 'Rain that flows over farmland, picking up soil and dissolved chemicals.',
    body: [
      'When rain falls on farmland, not all of it soaks into the soil. The excess flows across the surface as runoff.',
      'As it travels, runoff carries loose soil particles (which cause turbidity) and dissolved substances such as nutrients or pesticide residues applied to fields.',
      'Untreated runoff drains into streams, rivers and lakes, degrading water quality far beyond the farm itself.',
    ],
    fact: 'A single heavy storm can move tonnes of soil from bare fields into nearby waterways.',
  },
  {
    id: 'pollution',
    title: 'Water Pollution from Farms',
    icon: 'droplets',
    summary: 'Two pollutant families: suspended particles and dissolved contaminants.',
    body: [
      'Suspended particles are visible as cloudy, muddy water. They block sunlight, harm aquatic plants and carry other pollutants on their surfaces.',
      'Dissolved contaminants cannot be filtered out physically — they travel with the water as if invisible.',
      'This is why a good treatment train needs more than one process: something that removes particles, and something that captures dissolved molecules.',
    ],
  },
  {
    id: 'filtration',
    title: 'Physical Filtration',
    icon: 'filter',
    summary: 'Water squeezed through sand and gravel leaves particles behind.',
    body: [
      'Filtration works like a sieve at the scale of grains. As water winds through the gaps between sand grains, suspended particles get trapped by straining and by sticking to grain surfaces.',
      'Finer media and deeper beds remove more particles — but they also slow the water down.',
      'Coarse gravel is placed underneath to support the fine layers and let treated water drain freely.',
    ],
  },
  {
    id: 'adsorption',
    title: 'Adsorption',
    icon: 'magnet',
    summary: 'Molecules sticking to the surface of a solid — not to be confused with absorption.',
    body: [
      'Adsorption is a surface process: dissolved molecules collide with a solid surface and stick to it through intermolecular forces.',
      'A material with enormous internal surface area can capture a surprising amount of dissolved contamination.',
      'Contact time matters. The longer the water stays in contact with the adsorbent, the greater the fraction of molecules that find a surface to stick to.',
    ],
    fact: 'Adsorption = molecules attach to a surface. Absorption = molecules soak into the bulk of a material.',
  },
  {
    id: 'carbon',
    title: 'Activated Carbon',
    icon: 'circle',
    summary: 'Carbon riddled with microscopic pores — one gram has a huge surface area.',
    body: [
      'Activated carbon is made by heating carbon-rich material and then "activating" it, opening millions of microscopic pores.',
      'Those pores give it an internal surface area of hundreds of square metres per gram, making it a powerful adsorbent for many dissolved organic molecules.',
      'In this simulator, activated carbon is the layer that targets the dissolved model contaminant.',
    ],
    fact: 'One gram of activated carbon can expose an internal surface area comparable to a tennis court.',
  },
  {
    id: 'environment',
    title: 'Environmental Implications',
    icon: 'leaf',
    summary: 'Treating runoff protects rivers, ecosystems and drinking water downstream.',
    body: [
      'Simple treatment trains — sedimentation, filtration, adsorption — can dramatically reduce the pollutant load leaving a farm.',
      'Cleaner discharge water means healthier aquatic habitats, safer recreational rivers and lower treatment costs for downstream drinking-water plants.',
      'On-site treatment is one part of a wider strategy alongside buffer strips, cover crops and careful agrochemical use.',
    ],
  },
  {
    id: 'limits',
    title: 'Limitations of This Simulator',
    icon: 'alert-triangle',
    summary: 'AgroSorb is an educational model — its numbers are simulated, not measured.',
    body: [
      'The water-quality values in AgroSorb come from a simplified, clearly documented mathematical model. They are not laboratory measurements and must not be read as real-world performance data.',
      'Real filter design depends on grain-size distribution, media age, biological activity, hydraulic loading and the specific chemistry of each pollutant.',
      'The "contaminant" here is a generic model compound used to teach adsorption concepts — it does not represent any specific pesticide, and no pesticide-removal claims are made.',
    ],
    fact: 'Use AgroSorb to understand relationships — flow, contact time, layer order — not to design real hardware.',
  },
]

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Rain falls on the fields',
    text: 'Set the rainfall intensity and watch the storm roll over the crop fields.',
  },
  {
    step: 2,
    title: 'Runoff mobilizes pollutants',
    text: 'Surface water picks up soil particles and a dissolved model contaminant as it drains toward the collection channel.',
  },
  {
    step: 3,
    title: 'Configure the filter column',
    text: 'Stack gravel, sand and activated carbon layers in any order and depth you like.',
  },
  {
    step: 4,
    title: 'Water is treated',
    text: 'The engine computes turbidity removal, adsorption of the model contaminant and contact time for your exact configuration.',
  },
  {
    step: 5,
    title: 'Compare and learn',
    text: 'The dashboard shows before/after water quality, removal efficiency and a full history of your experiments.',
  },
]

export const ABOUT_TEXT = [
  'AgroSorb is an educational simulator for environmental engineering education. It pairs a small physical demonstration model with this interactive web experience.',
  'The web simulator models a filtration column treating agricultural runoff: suspended particles are removed by physical filtration, while a dissolved model contaminant is captured by adsorption onto activated carbon.',
  'All water-quality numbers are generated by a deterministic, documented educational model. They are simulated values, deliberately distinct from laboratory measurements.',
]
