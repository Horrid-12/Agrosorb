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
    id: 'nutrients',
    title: 'Nutrient Pollution',
    icon: 'sprout',
    summary: 'Nitrate and phosphate feed algal blooms downstream.',
    body: [
      'Fertilizer and manure leave farmland as dissolved nitrate and phosphate. Unlike soil particles, they travel with the water and cannot simply be sieved out.',
      'In this simulator the column retains some phosphate through media contact, but only weakly attenuates nitrate. Real nitrate control usually needs biological denitrification or ion exchange.',
      'When nutrient-rich water reaches a river or pond it can feed an algal bloom — shown in the scene as a visual consequence of the simulated nutrient load, not an ecological prediction.',
    ],
    fact: 'A filter that looks clear can still be nutrient-rich: turbidity and dissolved nutrients are different problems.',
  },
  {
    id: 'loading',
    title: 'Loading, Clogging and Media Condition',
    icon: 'layers',
    summary: 'Filters have finite capacity — captured material changes performance.',
    body: [
      'Every bed accumulates what it captures. Suspended solids build up at the surface and inside the pore spaces; activated carbon gradually loses available adsorption sites.',
      'The inspection view shows this as a solids-loading meter and an adsorption-saturation meter. These are illustrative capacity indicators from the documented model, not bench measurements.',
      'Media condition reduces both filtration and adsorption effectiveness. A heavily exhausted bed can be disabled in the model so you can see how the column performs without it.',
    ],
    fact: 'Layer order matters: fine sand above carbon shields its pores from sediment, preserving adsorption capacity.',
  },
  {
    id: 'scenarios',
    title: 'Storm Scenarios and Overflow',
    icon: 'cloud-lightning',
    summary: 'Different pollution events stress a treatment train in different ways.',
    body: [
      'Soil erosion loads the water with suspended sediment; pesticide runoff carries a dissolved model contaminant; fertilizer pollution adds nitrate and phosphate; extreme rainfall overloads the hydraulics.',
      'Flow above the column design rate shortens contact time and, in this model, forces part of the flow to bypass the media untreated. The scene responds with rising water, overflow and a hydraulic-overload warning.',
      'Switching scenarios changes the simulated influent, the water colour, tracer particles, clouds, algae and flood effects together — all from the same parameters.',
    ],
    fact: 'The coloured particles are visual tracers, not pesticide molecules or measured concentrations.',
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
    title: 'Pick a pollution scenario',
    text: 'Choose soil erosion, pesticide runoff, fertilizer pollution, mixed contamination or extreme rainfall — or tune rainfall, erosion, flow and chemistry yourself.',
  },
  {
    step: 2,
    title: 'Rain mobilizes pollutants',
    text: 'Surface water picks up suspended soil, nutrients and a dissolved model contaminant as it drains toward the collection channel.',
  },
  {
    step: 3,
    title: 'Configure the filter column',
    text: 'Stack gravel, sand and activated carbon in any order and depth. Enable, reorder or exhaust beds to see how the train responds.',
  },
  {
    step: 4,
    title: 'Water is treated',
    text: 'The engine computes turbidity, contaminant, nitrate and phosphate removal, loading, contact time and hydraulic bypass for your exact configuration.',
  },
  {
    step: 5,
    title: 'Inspect and compare',
    text: 'Click the station to inspect each bed, then compare before/after water quality, removal charts and loading in the dashboard.',
  },
]

export const ABOUT_TEXT = [
  'AgroSorb is an educational simulator for environmental engineering education. It pairs a small physical demonstration model with this interactive web experience.',
  'The web simulator models a filtration column treating agricultural runoff: suspended particles are removed by physical filtration, a dissolved model contaminant is captured by adsorption onto activated carbon, and nutrients are attenuated only through the explicit mechanisms described in the model. Nitrate removal is deliberately weak — real nitrate control usually needs biological or ion-exchange processes.',
  'Five environmental scenarios — soil erosion, pesticide runoff, fertilizer pollution, mixed contamination and extreme rainfall — change the simulated influent, water visuals and environmental effects. Coloured particles are visual tracers, not pesticide molecules or measurements.',
  'All water-quality numbers are generated by a deterministic, documented educational model. They are simulated values, deliberately distinct from laboratory measurements, and no complete-removal claim is made.',
]
