import type { FilterMaterial } from '@/types'

export interface MaterialDef {
  id: FilterMaterial
  name: string
  color: string
  /** Short UI description. */
  blurb: string
  /** Density-ish factor: kg of material mapped to bed depth (cm per kg). */
  depthPerUnit: number
  icon: 'layers' | 'waves' | 'circle'
}

/**
 * The three filter media available in the virtual filtration column.
 * Colors are shared between the 3D scene and the configurator UI so the
 * column always reads consistently.
 */
export const MATERIALS: Record<FilterMaterial, MaterialDef> = {
  gravel: {
    id: 'gravel',
    name: 'Gravel',
    color: '#8f887b',
    blurb: 'Coarse support bed. Drains water quickly and traps the largest particles.',
    depthPerUnit: 1.0,
    icon: 'layers',
  },
  sand: {
    id: 'sand',
    name: 'Sand',
    color: '#d8c49a',
    blurb: 'Fine physical filter. Excellent at removing suspended particles (turbidity).',
    depthPerUnit: 1.4,
    icon: 'waves',
  },
  carbon: {
    id: 'carbon',
    name: 'Activated Carbon',
    color: '#343434',
    blurb: 'Porous adsorbent. Captures dissolved model contaminants through adsorption.',
    depthPerUnit: 1.8,
    icon: 'circle',
  },
}

export const MATERIAL_ORDER: FilterMaterial[] = ['gravel', 'sand', 'carbon']
