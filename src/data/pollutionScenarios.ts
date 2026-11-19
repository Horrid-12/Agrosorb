import type {
  PollutionScenario,
  PollutionScenarioId,
  WaterQuality,
} from '@/types'

/**
 * Selectable environmental scenarios.
 *
 * IMPORTANT: every number below is an ILLUSTRATIVE educational assumption.
 * `baseline` describes simulated influent at full rainfall and full erosion.
 * The response factors blend between "gentle conditions" and that baseline
 * so that the rainfall and erosion controls genuinely change the influent.
 * These are not calibrated field measurements and must not be presented as
 * real-world runoff chemistry.
 */
export const POLLUTION_SCENARIOS: Record<PollutionScenarioId, PollutionScenario> = {
  'soil-erosion': {
    id: 'soil-erosion',
    name: 'Soil Erosion',
    tagline: 'Bare fields bleed into the river',
    brief:
      'Heavy rain is stripping topsoil from bare fields. The runoff is thick with suspended sediment, so physical filtration is the main lever. Watch turbidity, sediment build-up and filter loading.',
    icon: 'erosion',
    baseline: { turbidity: 130, contaminant: 2.2, nitrate: 3.5, phosphate: 2.8, pH: 6.5 },
    response: {
      turbidityRain: 0.82,
      turbidityErosion: 0.58,
      contaminantRain: 0.7,
      nitrateRain: 0.8,
      phosphateRain: 0.78,
      phosphateErosion: 0.45,
    },
    start: { rainIntensity: 0.85, erosionIntensity: 0.9, flowRate: 3, timeOfDay: 13 },
    visuals: {
      waterTint: '#6f8f74',
      sedimentColor: '#8a6138',
      tracerColor: '#8a6138',
      nutrientColor: '#a4c45a',
      nutrients: false,
      sediment: true,
      algaePotential: 0.1,
      floodPotential: 0.4,
    },
    notes: [
      'Sediment is shown as brown suspended particles — a visual tracer for turbidity.',
      'Sand removes far more suspended solids per centimetre than coarse gravel.',
      'Filter loading rises as captured sediment accumulates; loaded beds are less effective.',
    ],
  },

  'pesticide-runoff': {
    id: 'pesticide-runoff',
    name: 'Pesticide Runoff',
    tagline: 'Dissolved tracer after field treatment',
    brief:
      'Recently treated fields are washing off a dissolved model contaminant. Coloured particles in the scene are visual tracers only — they are not pesticide molecules. Adsorption onto activated carbon is the modelled removal mechanism.',
    icon: 'pesticide',
    baseline: { turbidity: 55, contaminant: 18, nitrate: 4, phosphate: 2.2, pH: 6.3 },
    response: {
      turbidityRain: 0.75,
      turbidityErosion: 0.4,
      contaminantRain: 0.88,
      nitrateRain: 0.8,
      phosphateRain: 0.75,
      phosphateErosion: 0.3,
    },
    start: { rainIntensity: 0.75, erosionIntensity: 0.35, flowRate: 4, timeOfDay: 11 },
    visuals: {
      waterTint: '#5b96a7',
      sedimentColor: '#8a6138',
      tracerColor: '#b05f8f',
      nutrientColor: '#a4c45a',
      nutrients: false,
      sediment: false,
      algaePotential: 0.15,
      floodPotential: 0.3,
    },
    notes: [
      'Coloured tracer particles are an illustration of the dissolved model contaminant — not real pesticide molecules.',
      'Physical media alone capture very little dissolved contaminant; activated carbon is the modelled adsorbent.',
      'Removal is partial in the model. AgroSorb does not claim complete pesticide removal.',
    ],
  },

  'fertilizer-pollution': {
    id: 'fertilizer-pollution',
    name: 'Fertilizer Pollution',
    tagline: 'Nutrient-rich runoff feeds the river',
    brief:
      'Runoff carries elevated simulated nitrate and phosphate. The column can retain some phosphate and only weakly attenuate nitrate — the scene shows a receiving-water algal bloom as a visual consequence, not a measured ecological prediction.',
    icon: 'fertilizer',
    baseline: { turbidity: 60, contaminant: 3, nitrate: 16, phosphate: 7.5, pH: 6.8 },
    response: {
      turbidityRain: 0.7,
      turbidityErosion: 0.36,
      contaminantRain: 0.65,
      nitrateRain: 0.85,
      phosphateRain: 0.82,
      phosphateErosion: 0.35,
    },
    start: { rainIntensity: 0.7, erosionIntensity: 0.45, flowRate: 3, timeOfDay: 14 },
    visuals: {
      waterTint: '#5d9a84',
      sedimentColor: '#8a6138',
      tracerColor: '#b05f8f',
      nutrientColor: '#b7d44e',
      nutrients: true,
      sediment: false,
      algaePotential: 1,
      floodPotential: 0.4,
    },
    notes: [
      'Nitrate is only weakly attenuated by the modelled media — real nitrate control usually needs biological or ion-exchange processes.',
      'Phosphate is partly retained by media contact in this simplified model.',
      'Algal bloom size is driven by the simulated nutrient load reaching receiving water.',
    ],
  },

  'mixed-contamination': {
    id: 'mixed-contamination',
    name: 'Mixed Contamination',
    tagline: 'Sediment, chemicals and nutrients together',
    brief:
      'A combined runoff event carries suspended sediment, a dissolved model contaminant and nutrients. Multiple water-quality indicators respond at once, making the layer order and media condition more important.',
    icon: 'mixed',
    baseline: { turbidity: 110, contaminant: 12, nitrate: 11, phosphate: 5.5, pH: 6.4 },
    response: {
      turbidityRain: 0.8,
      turbidityErosion: 0.55,
      contaminantRain: 0.82,
      nitrateRain: 0.82,
      phosphateRain: 0.78,
      phosphateErosion: 0.35,
    },
    start: { rainIntensity: 0.7, erosionIntensity: 0.65, flowRate: 3, timeOfDay: 15 },
    visuals: {
      waterTint: '#658b78',
      sedimentColor: '#8a6138',
      tracerColor: '#b05f8f',
      nutrientColor: '#b7d44e',
      nutrients: true,
      sediment: true,
      algaePotential: 0.7,
      floodPotential: 0.6,
    },
    notes: [
      'Physical filtration and adsorption are both needed here.',
      'Fine media above carbon shields its pores from sediment fouling.',
      'Media condition controls how much capacity remains before the run.',
    ],
  },

  'extreme-rainfall': {
    id: 'extreme-rainfall',
    name: 'Extreme Rainfall',
    tagline: 'The channel cannot keep up',
    brief:
      'A storm event exceeds the treatment train design flow. Water levels rise, channels overflow and the filter is hydraulically overloaded: contact time collapses and part of the flow bypasses the media in the model.',
    icon: 'storm',
    baseline: { turbidity: 150, contaminant: 10, nitrate: 9, phosphate: 4.5, pH: 6.6 },
    response: {
      turbidityRain: 0.88,
      turbidityErosion: 0.6,
      contaminantRain: 0.8,
      nitrateRain: 0.85,
      phosphateRain: 0.8,
      phosphateErosion: 0.35,
    },
    start: { rainIntensity: 1, erosionIntensity: 0.95, flowRate: 6, timeOfDay: 17 },
    visuals: {
      waterTint: '#5a7f74',
      sedimentColor: '#7d5732',
      tracerColor: '#b05f8f',
      nutrientColor: '#b7d44e',
      nutrients: true,
      sediment: true,
      algaePotential: 0.4,
      floodPotential: 1,
    },
    notes: [
      'Flow above the 4 L/min design rate shortens contact time.',
      'Excess flow also bypasses part of the media in the model — treatment performance drops.',
      'Overflow effects in the scene are driven by the same flow and rainfall parameters.',
    ],
  },
}

export const POLLUTION_SCENARIO_ORDER: PollutionScenarioId[] = [
  'soil-erosion',
  'pesticide-runoff',
  'fertilizer-pollution',
  'mixed-contamination',
  'extreme-rainfall',
]

/** Guard for persisted state or scenario ids from older versions. */
export function isPollutionScenarioId(id: string): id is PollutionScenarioId {
  return id in POLLUTION_SCENARIOS
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function round(v: number, decimals = 2) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** Linear blend from the "gentle" share to 1 as a control goes 0 → 1. */
function responseScale(sensitivity: number, control: number): number {
  const s = clamp(sensitivity, 0, 0.95)
  return (1 - s) + s * clamp(control, 0, 1)
}

/**
 * Derive simulated influent chemistry from a scenario and the current
 * rainfall / erosion controls. Pure and deterministic.
 */
export function deriveScenarioInfluent(
  scenario: PollutionScenario,
  rainIntensity: number,
  erosionIntensity: number,
): WaterQuality {
  const r = clamp(rainIntensity, 0, 1)
  const e = clamp(erosionIntensity, 0, 1)
  const resp = scenario.response

  return {
    turbidity: round(
      scenario.baseline.turbidity *
        responseScale(resp.turbidityRain, r) *
        responseScale(resp.turbidityErosion, e),
      1,
    ),
    contaminant: round(
      scenario.baseline.contaminant * responseScale(resp.contaminantRain, r),
      2,
    ),
    nitrate: round(scenario.baseline.nitrate * responseScale(resp.nitrateRain, r), 2),
    phosphate: round(
      scenario.baseline.phosphate *
        responseScale(resp.phosphateRain, r) *
        responseScale(resp.phosphateErosion, e),
      2,
    ),
    pH: round(scenario.baseline.pH, 2),
  }
}

/** Maximum values used by the chemistry sliders (simulated units). */
export const INFLUENT_LIMITS = {
  turbidity: { min: 0, max: 200, step: 1, unit: 'NTU' },
  contaminant: { min: 0, max: 30, step: 0.5, unit: 'mg/L' },
  nitrate: { min: 0, max: 25, step: 0.5, unit: 'mg/L' },
  phosphate: { min: 0, max: 15, step: 0.1, unit: 'mg/L' },
  pH: { min: 5, max: 8.5, step: 0.1, unit: 'pH' },
} as const
