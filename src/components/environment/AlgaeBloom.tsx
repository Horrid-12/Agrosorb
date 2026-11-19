import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial } from 'three'
import { LAYOUT, mulberry32 } from './layout'
import { useSimulationStore } from '@/stores/simulationStore'
import { POLLUTION_SCENARIOS } from '@/data/pollutionScenarios'

interface Patch {
  x: number
  z: number
  r: number
  phase: number
}

/**
 * Receiving-water algal bloom. Size and opacity are derived from the
 * simulated nutrient load (final treated water when a result exists,
 * otherwise influent) and the scenario's bloom potential. It is a visual
 * consequence indicator, not an ecological prediction.
 */
export function AlgaeBloom() {
  const meshes = useRef<(Mesh | null)[]>([])
  const materials = useRef<(MeshStandardMaterial | null)[]>([])
  const level = useRef(0)

  const patches = useMemo<Patch[]>(() => {
    const rng = mulberry32(515)
    const list: Patch[] = []
    // River patches
    for (let i = 0; i < 9; i++) {
      list.push({
        x: LAYOUT.river.xMin + 1.5 + rng() * (LAYOUT.river.xMax - LAYOUT.river.xMin - 3),
        z: -24 + rng() * 48,
        r: 1.4 + rng() * 2.6,
        phase: rng() * Math.PI * 2,
      })
    }
    // Small receiving pond near the fields
    for (let i = 0; i < 5; i++) {
      list.push({
        x: LAYOUT.pond.x + (rng() - 0.5) * 5,
        z: LAYOUT.pond.z + (rng() - 0.5) * 4,
        r: 1 + rng() * 1.8,
        phase: rng() * Math.PI * 2,
      })
    }
    return list
  }, [])

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useSimulationStore.getState()
    const visuals = POLLUTION_SCENARIOS[s.pollutionScenario].visuals
    const output = s.pendingResult ?? s.result
    const nitrate = output?.final.nitrate ?? s.influent.nitrate
    const phosphate = output?.final.phosphate ?? s.influent.phosphate
    const target = visuals.nutrients
      ? Math.min(1, (nitrate + phosphate) / 18) * visuals.algaePotential
      : 0

    level.current += (target - level.current) * Math.min(1, dt * 1.4)
    const lv = level.current
    const t = clock.elapsedTime

    meshes.current.forEach((mesh, i) => {
      if (!mesh) return
      const patch = patches[i]
      const bob = 1 + Math.sin(t * 0.6 + patch.phase) * 0.06
      mesh.visible = lv > 0.015
      const scale = 0.45 + lv * 1.25
      mesh.scale.setScalar(scale * bob)
    })
    materials.current.forEach((mat) => {
      if (!mat) return
      mat.opacity = Math.min(0.62, lv * 0.75)
      // Slightly yellower as the bloom intensifies.
      mat.color.set(lv > 0.55 ? '#9dbb45' : '#7fae4e')
    })
  })

  return (
    <group>
      {patches.map((patch, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m
          }}
          visible={false}
          position={[patch.x, 0.3, patch.z]}
          rotation={[-Math.PI / 2, 0, patch.phase]}
        >
          <circleGeometry args={[patch.r, 12]} />
          <meshStandardMaterial
            ref={(m) => {
              materials.current[i] = m
            }}
            color="#7fae4e"
            transparent
            opacity={0}
            roughness={0.6}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
