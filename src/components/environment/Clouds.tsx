import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MeshStandardMaterial } from 'three'
import { mulberry32 } from './layout'
import { useSimulationStore } from '@/stores/simulationStore'
import { nightFactor } from './daylight'

const CLOUD_COUNT = 8
const DAY_CLOUD = new THREE.Color('#f7f3e8')
const STORM_CLOUD = new THREE.Color('#7f8f96')
const NIGHT_CLOUD = new THREE.Color('#35404e')
const TARGET_CLOUD = new THREE.Color()

interface CloudDef {
  x: number
  y: number
  z: number
  scale: number
  speed: number
  puffs: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }>
}

/**
 * Low-poly comic clouds drifting with the storm. They darken and grow with
 * rainfall and fade into deep blue at night. Drift is updated imperatively
 * in `useFrame`, so no React renders occur while they move.
 */
export function Clouds() {
  const groups = useRef<(THREE.Group | null)[]>([])
  const materials = useRef<MeshStandardMaterial[]>([])

  const clouds = useMemo<CloudDef[]>(() => {
    const rng = mulberry32(808)
    return Array.from({ length: CLOUD_COUNT }, () => ({
      x: -70 + rng() * 140,
      y: 28 + rng() * 10,
      z: -50 + rng() * 100,
      scale: 0.8 + rng() * 0.8,
      speed: 0.6 + rng() * 0.8,
      puffs: Array.from({ length: 4 }, () => ({
        x: (rng() - 0.5) * 5,
        y: (rng() - 0.5) * 0.9,
        z: (rng() - 0.5) * 2.4,
        sx: 1.3 + rng() * 1.2,
        sy: 0.45 + rng() * 0.35,
        sz: 0.9 + rng() * 0.8,
      })),
    }))
  }, [])

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useSimulationStore.getState()
    const night = nightFactor(s.timeOfDay)
    const storm = s.rainIntensity
    const active = s.phase === 'raining' || s.phase === 'runoff'
    const wind = 0.25 + storm * 1.5 + (s.phase === 'runoff' ? 0.8 : 0)
    const t = clock.elapsedTime

    groups.current.forEach((group, i) => {
      if (!group) return
      const def = clouds[i]
      group.position.x += wind * def.speed * dt
      if (group.position.x > 75) group.position.x = -75
      group.position.y = def.y + Math.sin(t * 0.12 + i) * 0.35
      const scale = def.scale * (active ? 1 + storm * 0.25 : 1)
      group.scale.setScalar(scale)
    })

    const target = TARGET_CLOUD
      .copy(DAY_CLOUD)
      .lerp(STORM_CLOUD, Math.min(0.75, storm * 0.7))
      .lerp(NIGHT_CLOUD, night * 0.6)

    materials.current.forEach((mat) => {
      mat.color.lerp(target, Math.min(1, dt * 1.5))
      mat.opacity = 0.82
    })
  })

  return (
    <group>
      {clouds.map((cloud, i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g
          }}
          position={[cloud.x, cloud.y, cloud.z]}
        >
          {cloud.puffs.map((puff, j) => (
            <mesh key={j} position={[puff.x, puff.y, puff.z]} scale={[puff.sx, puff.sy, puff.sz]}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                ref={(m) => {
                  if (m && !materials.current.includes(m)) materials.current.push(m)
                }}
                color="#f7f3e8"
                roughness={0.95}
                flatShading
                transparent
                opacity={0.82}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
