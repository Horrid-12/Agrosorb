import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RUNOFF_PATHS, samplePolyline } from './layout'
import { useSimulationStore } from '@/stores/simulationStore'
import { POLLUTION_SCENARIOS } from '@/data/pollutionScenarios'
import { RAIN } from '@/simulation/models/constants'

const SEDIMENT = 120
const CONTAMINANT = 90
const NUTRIENT = 80
const MAX = SEDIMENT + CONTAMINANT + NUTRIENT

/**
 * Animated runoff tracers travelling from the fields through the collection
 * channels toward the station. The cloud contains three *visual* species:
 * suspended soil (brown), dissolved model contaminant (rose), and nutrients
 * (lime). Counts and colours follow the simulated influent and scenario.
 *
 * These particles are illustrations, not pesticide molecules or measurements.
 */
export function WaterParticles() {
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.PointsMaterial>(null)

  const { positions, pathIndex, offsets, speeds, colors } = useMemo(() => {
    const positions = new Float32Array(MAX * 3)
    const pathIndex = new Uint8Array(MAX)
    const offsets = new Float32Array(MAX)
    const speeds = new Float32Array(MAX)
    const colors = new Float32Array(MAX * 3)

    const sediment = new THREE.Color('#8a6138')
    const contaminant = new THREE.Color('#b05f8f')
    const nutrient = new THREE.Color('#b7d44e')

    for (let i = 0; i < MAX; i++) {
      pathIndex[i] = i % RUNOFF_PATHS.length
      offsets[i] = Math.random()
      speeds[i] = 0.55 + Math.random() * 0.75
      const c = i < SEDIMENT ? sediment : i < SEDIMENT + CONTAMINANT ? contaminant : nutrient
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    return { positions, pathIndex, offsets, speeds, colors }
  }, [])

  useFrame(({ clock }) => {
    const s = useSimulationStore.getState()
    const visuals = POLLUTION_SCENARIOS[s.pollutionScenario].visuals
    const flowing =
      s.phase === 'runoff' ||
      (s.phase === 'raining' && s.rainIntensity >= RAIN.runoffThreshold)

    if (!points.current || !material.current) return
    if (!flowing) {
      points.current.visible = false
      return
    }

    const sedimentCount = visuals.sediment
      ? Math.round(SEDIMENT * Math.min(1, s.influent.turbidity / 150))
      : 0
    const contaminantCount = Math.round(
      CONTAMINANT * Math.min(1, s.influent.contaminant / 18),
    )
    const nutrientCount = visuals.nutrients
      ? Math.round(NUTRIENT * Math.min(1, (s.influent.nitrate + s.influent.phosphate) / 22))
      : 0
    const active = sedimentCount + contaminantCount + nutrientCount

    points.current.visible = active > 0
    // Keep the species buffers intact: particles that are not part of the
    // current mix are parked below the terrain instead of shrinking the
    // draw range, which would otherwise expose the wrong species first.
    points.current.geometry.setDrawRange(0, MAX)
    material.current.opacity = 0.35 + s.rainIntensity * 0.5

    const speedFactor = 0.045 + s.flowRate * 0.012 + s.rainIntensity * 0.04
    const t = clock.elapsedTime * speedFactor
    const attr = points.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array

    for (let i = 0; i < MAX; i++) {
      const visible =
        i < SEDIMENT
          ? i < sedimentCount
          : i < SEDIMENT + CONTAMINANT
            ? i - SEDIMENT < contaminantCount
            : i - SEDIMENT - CONTAMINANT < nutrientCount
      if (!visible) {
        arr[i * 3] = 0
        arr[i * 3 + 1] = -1000
        arr[i * 3 + 2] = 0
        continue
      }
      const path = RUNOFF_PATHS[pathIndex[i]]
      const [x, z] = samplePolyline(path, (t * speeds[i] + offsets[i]) % 1)
      arr[i * 3] = x
      arr[i * 3 + 1] = 0.32 + (i % 3) * 0.015
      arr[i * 3 + 2] = z
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={points} visible={false} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        vertexColors
        size={0.26}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  )
}
