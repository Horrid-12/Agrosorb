import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MeshStandardMaterial } from 'three'
import { LAYOUT, RUNOFF_PATHS, samplePolyline } from './layout'
import { useSimulationStore } from '@/stores/simulationStore'
import { RAIN } from '@/simulation/models/constants'

const WATER_COLOR = '#4299c7'

function WaterSurface({
  width,
  depth,
  position,
  opacity = 0.85,
  ripple = true,
}: {
  width: number
  depth: number
  position: [number, number, number]
  opacity?: number
  ripple?: boolean
}) {
  const mat = useRef<MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (ripple && mat.current) {
      mat.current.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 1.6 + position[2]) * 0.06
    }
  })
  return (
    // No receiveShadow: shadow sampling on transparent water planes causes
    // banding artifacts. Water is kept well clear of ground overlays
    // (paths, grass caps) to avoid z-fighting stripes.
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        ref={mat}
        color={WATER_COLOR}
        transparent
        opacity={opacity}
        roughness={0.15}
        metalness={0.1}
        emissive={WATER_COLOR}
        emissiveIntensity={0.12}
      />
    </mesh>
  )
}

/**
 * All moving water in the scene: the river, the runoff collection
 * channels and the field puddles that appear during heavy rain.
 * Water surfaces subtly pulse; puddles fade in with storm intensity.
 */
export function Channels() {
  const river = LAYOUT.river
  const riverWidth = river.xMax - river.xMin
  const riverLength = river.zMax - river.zMin

  const main = LAYOUT.mainChannel
  const cross = LAYOUT.crossChannel
  const outlet = LAYOUT.outletChannel

  const rainIntensity = useSimulationStore((s) => s.rainIntensity)
  const phase = useSimulationStore((s) => s.phase)

  // Runoff visibly flows toward the collection system during a runoff
  // event, or under sustained heavy rain.
  const flowActive =
    phase === 'runoff' || (phase === 'raining' && rainIntensity >= RAIN.runoffThreshold)

  const puddleMats = useRef<(MeshStandardMaterial | null)[]>([])

  useFrame((_, dt) => {
    // Puddles only appear while it is actually raining or during a
    // runoff event — not just because the slider is set high.
    const raining = phase === 'raining' && rainIntensity >= RAIN.runoffThreshold
    const wet = phase === 'runoff' || raining
    const target = wet ? Math.min(0.85, 0.15 + rainIntensity * 0.7) : 0
    puddleMats.current.forEach((m) => {
      if (m) m.opacity += (target - m.opacity) * Math.min(1, dt * 2.5)
    })
  })

  const puddles: Array<[number, number]> = [
    [(LAYOUT.fields.A.xMin + LAYOUT.fields.A.xMax) / 2, (LAYOUT.fields.A.zMin + LAYOUT.fields.A.zMax) / 2],
    [(LAYOUT.fields.B.xMin + LAYOUT.fields.B.xMax) / 2, (LAYOUT.fields.B.zMin + LAYOUT.fields.B.zMax) / 2],
    [(LAYOUT.fields.C.xMin + LAYOUT.fields.C.xMax) / 2, (LAYOUT.fields.C.zMin + LAYOUT.fields.C.zMax) / 2],
  ]

  return (
    <group>
      {/* River along the west edge */}
      <WaterSurface width={riverWidth} depth={riverLength} position={[river.xMin + riverWidth / 2, river.y, river.zMin + riverLength / 2]} />

      {/* Collection channels (thin, deeper looking) — raised above the
          grass/path surfaces so they never z-fight with them */}
      <WaterSurface width={main.xMax - main.xMin} depth={main.zMax - main.zMin} position={[(main.xMin + main.xMax) / 2, 0.2, (main.zMin + main.zMax) / 2]} opacity={0.8} ripple={false} />
      <WaterSurface width={cross.xMax - cross.xMin} depth={cross.zMax - cross.zMin} position={[(cross.xMin + cross.xMax) / 2, 0.2, (cross.zMin + cross.zMax) / 2]} opacity={0.8} ripple={false} />
      <WaterSurface width={outlet.xMax - outlet.xMin} depth={outlet.zMax - outlet.zMin} position={[(outlet.xMin + outlet.xMax) / 2, 0.2, (outlet.zMin + outlet.zMax) / 2]} opacity={0.65} ripple={false} />

      {/* Runoff pulses travelling field → channels → station inlet */}
      {RUNOFF_PATHS.map((path, i) => (
        <RunoffPulses key={i} path={path} active={flowActive} />
      ))}

      {/* Runoff puddles on the fields (fade with storm intensity) */}
      {puddles.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.28, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.5, 3]} />
          <meshStandardMaterial
            ref={(m) => {
              puddleMats.current[i] = m
            }}
            color="#6f5233"
            transparent
            opacity={0}
            roughness={0.25}
          />
        </mesh>
      ))}
    </group>
  )
}

const PULSES_PER_PATH = 6
const PULSE_SPEED = 0.09 // polyline loops per second

/**
 * Small water packets advancing along a runoff flow path, visualizing
 * polluted water travelling from the fields toward the collection
 * system. Cheap: 6 small boxes per path, no instancing needed.
 */
function RunoffPulses({
  path,
  active,
}: {
  path: Array<[number, number]>
  active: boolean
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * PULSE_SPEED
    for (let i = 0; i < PULSES_PER_PATH; i++) {
      const m = refs.current[i]
      if (!m) continue
      m.visible = active
      if (active) {
        const [x, z] = samplePolyline(path, (t + i / PULSES_PER_PATH) % 1)
        m.position.set(x, 0.27, z)
      }
    }
  })

  return (
    <group>
      {Array.from({ length: PULSES_PER_PATH }, (_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(m) => {
            refs.current[i] = m
          }}
        >
          <boxGeometry args={[0.55, 0.14, 0.55]} />
          <meshStandardMaterial color="#7fc4e8" transparent opacity={0.75} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}
