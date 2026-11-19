import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh, MeshStandardMaterial } from 'three'
import { LAYOUT } from './layout'
import { useSimulationStore } from '@/stores/simulationStore'
import { POLLUTION_SCENARIOS } from '@/data/pollutionScenarios'
import { DESIGN_FLOW_RATE } from '@/simulation/models/constants'

/**
 * Channel overflow / flooding effects. Intensity is derived from rainfall,
 * scenario flood susceptibility and hydraulic load (with the committed
 * engine overflow flag taking precedence when a result exists).
 */
export function Overflow() {
  const spills = useRef<(Mesh | null)[]>([])
  const mats = useRef<(MeshStandardMaterial | null)[]>([])
  const flood = useRef(0)

  const main = LAYOUT.mainChannel
  const cross = LAYOUT.crossChannel
  const station = LAYOUT.station

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useSimulationStore.getState()
    const visuals = POLLUTION_SCENARIOS[s.pollutionScenario].visuals
    const output = s.pendingResult ?? s.result
    const flowLoad = s.flowRate / DESIGN_FLOW_RATE
    const storm =
      s.phase === 'runoff' ? 1 : s.phase === 'raining' ? s.rainIntensity : 0
    const overflowFlag = output?.overflow ?? flowLoad > 1
    const target = Math.min(
      1,
      storm * visuals.floodPotential * 0.8 +
        Math.max(0, flowLoad - 1) * 0.35 +
        (overflowFlag ? 0.35 : 0),
    )

    flood.current += (target - flood.current) * Math.min(1, dt * 2.2)
    const f = flood.current
    const t = clock.elapsedTime

    spills.current.forEach((mesh, i) => {
      if (!mesh) return
      mesh.visible = f > 0.03
      const pulse = 1 + Math.sin(t * 1.2 + i) * 0.025
      mesh.scale.set(pulse, 1, pulse)
    })
    mats.current.forEach((mat) => {
      if (!mat) return
      mat.opacity = Math.min(0.6, f * 0.55)
      mat.color.set(visuals.sedimentColor)
    })
  })

  const spillDefs: Array<{
    position: [number, number, number]
    size: [number, number]
  }> = [
    { position: [main.xMin - 0.9, 0.24, (main.zMin + main.zMax) / 2], size: [2.2, main.zMax - main.zMin] },
    { position: [main.xMax + 0.9, 0.24, (main.zMin + main.zMax) / 2], size: [2.2, main.zMax - main.zMin] },
    { position: [(cross.xMin + cross.xMax) / 2, 0.24, cross.zMin - 0.8], size: [cross.xMax - cross.xMin, 1.8] },
    { position: [(cross.xMin + cross.xMax) / 2, 0.24, cross.zMax + 0.8], size: [cross.xMax - cross.xMin, 1.8] },
    { position: [station.x, 0.2, station.z], size: [9, 9] },
  ]

  return (
    <group>
      {spillDefs.map((def, i) => (
        <mesh
          key={i}
          ref={(m) => {
            spills.current[i] = m
          }}
          visible={false}
          position={def.position}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={def.size} />
          <meshStandardMaterial
            ref={(m) => {
              mats.current[i] = m
            }}
            color="#8a6138"
            transparent
            opacity={0}
            roughness={0.25}
            depthWrite={false}
          />
        </mesh>
      ))}
      <OverflowFoam />
    </group>
  )
}

const FOAM_COUNT = 36
const FOAM_AREA = { x: 10, z: 16.5, radius: 3.2 }

/** Small pale foam flecks around the station during overflow. */
function OverflowFoam() {
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.PointsMaterial>(null)

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(FOAM_COUNT * 3)
    const speeds = new Float32Array(FOAM_COUNT)
    for (let i = 0; i < FOAM_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * FOAM_AREA.radius
      positions[i * 3] = FOAM_AREA.x + Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.25
      positions[i * 3 + 2] = FOAM_AREA.z + Math.sin(angle) * radius
      speeds[i] = 0.4 + Math.random() * 0.8
    }
    return { positions, speeds }
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = useSimulationStore.getState()
    const flowLoad = s.flowRate / DESIGN_FLOW_RATE
    const active = s.phase === 'runoff' && flowLoad > 1
    if (!points.current || !material.current) return
    points.current.visible = active
    material.current.opacity += ((active ? 0.75 : 0) - material.current.opacity) * Math.min(1, dt * 3)
    if (!active) return
    const attr = points.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < FOAM_COUNT; i++) {
      const angle = Math.atan2(arr[i * 3 + 2] - FOAM_AREA.z, arr[i * 3] - FOAM_AREA.x)
      const radius = Math.hypot(arr[i * 3] - FOAM_AREA.x, arr[i * 3 + 2] - FOAM_AREA.z)
      const next = radius + speeds[i] * dt
      if (next > FOAM_AREA.radius + 1.2) {
        arr[i * 3] = FOAM_AREA.x + Math.cos(angle) * 0.2
        arr[i * 3 + 2] = FOAM_AREA.z + Math.sin(angle) * 0.2
      } else {
        arr[i * 3] = FOAM_AREA.x + Math.cos(angle) * next
        arr[i * 3 + 2] = FOAM_AREA.z + Math.sin(angle) * next
      }
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={points} visible={false} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        color="#e8f1ea"
        size={0.18}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  )
}
