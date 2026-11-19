import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MeshStandardMaterial } from 'three'
import { LAYOUT, mulberry32 } from './layout'
import { useSimulationStore } from '@/stores/simulationStore'
import { POLLUTION_SCENARIOS } from '@/data/pollutionScenarios'

interface Rill {
  id: string
  x: number
  z: number
  length: number
  width: number
  rot: number
}

/**
 * Soil-erosion visuals: dark runoff rills and a soil-loss overlay on each
 * field. Opacity and size are driven by the erosion and rainfall controls,
 * so this is a visual reading of the simulation parameter rather than a
 * looping decoration.
 */
export function Erosion() {
  const materials = useRef<(MeshStandardMaterial | null)[]>([])
  const overlays = useRef<(MeshStandardMaterial | null)[]>([])

  const rills = useMemo<Rill[]>(() => {
    const rng = mulberry32(314)
    const list: Rill[] = []
    Object.entries(LAYOUT.fields).forEach(([key, f], fieldIdx) => {
      for (let i = 0; i < 6; i++) {
        list.push({
          id: `${key}-${i}`,
          x: f.xMin + 0.8 + rng() * (f.xMax - f.xMin - 1.6),
          z: f.zMin + 0.8 + rng() * (f.zMax - f.zMin - 1.6),
          length: 2.2 + rng() * 4,
          width: 0.1 + rng() * 0.12,
          rot: -0.5 + fieldIdx * 0.18 + rng() * 0.5,
        })
      }
    })
    return list
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useSimulationStore.getState()
    const visuals = POLLUTION_SCENARIOS[s.pollutionScenario].visuals
    const raining = s.phase === 'raining' || s.phase === 'runoff'
    const wet = raining ? 1 : 0.12
    const strength = s.erosionIntensity * wet
    const target = Math.min(0.8, strength * 0.9)
    const overlayTarget = Math.min(0.55, strength * 0.55)

    materials.current.forEach((mat) => {
      if (!mat) return
      mat.opacity += (target - mat.opacity) * Math.min(1, dt * 3)
      mat.color.set(visuals.sedimentColor)
    })
    overlays.current.forEach((mat) => {
      if (!mat) return
      mat.opacity += (overlayTarget - mat.opacity) * Math.min(1, dt * 2)
    })
  })

  return (
    <group>
      {/* Soil-loss tint over each field */}
      {Object.entries(LAYOUT.fields).map(([key, f], i) => (
        <mesh
          key={`overlay-${key}`}
          position={[(f.xMin + f.xMax) / 2, 0.235, (f.zMin + f.zMax) / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[f.xMax - f.xMin - 0.6, f.zMax - f.zMin - 0.6]} />
          <meshStandardMaterial
            ref={(m) => {
              overlays.current[i] = m
            }}
            color="#5d4029"
            transparent
            opacity={0}
            roughness={1}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Erosion rills */}
      {rills.map((rill, i) => (
        <mesh
          key={rill.id}
          position={[rill.x, 0.245, rill.z]}
          rotation={[-Math.PI / 2, 0, rill.rot]}
        >
          <planeGeometry args={[rill.width, rill.length]} />
          <meshStandardMaterial
            ref={(m) => {
              materials.current[i] = m
            }}
            color="#8a6138"
            transparent
            opacity={0}
            roughness={1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
