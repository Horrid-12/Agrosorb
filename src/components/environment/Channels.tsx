import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh, MeshStandardMaterial } from 'three'
import { LAYOUT, RUNOFF_PATHS, samplePolyline } from './layout'
import { useSimulationStore } from '@/stores/simulationStore'
import { DESIGN_FLOW_RATE, RAIN } from '@/simulation/models/constants'
import { POLLUTION_SCENARIOS } from '@/data/pollutionScenarios'
import { nightFactor } from './daylight'

const CLEAN_WATER = new THREE.Color('#4299c7')
const NIGHT_WATER = new THREE.Color('#203a4a')
const DEEP_SOIL = new THREE.Color('#4a3320')

interface SurfaceDef {
  key: string
  width: number
  depth: number
  x: number
  z: number
  baseY: number
  opacity: number
  ripple: boolean
}

/**
 * All moving water in the scene: the river, the runoff collection
 * channels and the field puddles that appear during heavy rain.
 *
 * Every surface is driven by the simulation state: colour follows the
 * simulated turbidity and scenario art direction, the water level rises
 * with rainfall / hydraulic overload, and puddle opacity follows storm
 * intensity. Colours are a visual reading of simulation parameters — not
 * a measurement.
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

  const surfaces: SurfaceDef[] = [
    {
      key: 'river',
      width: riverWidth,
      depth: riverLength,
      x: river.xMin + riverWidth / 2,
      z: river.zMin + riverLength / 2,
      baseY: river.y,
      opacity: 0.9,
      ripple: true,
    },
    {
      key: 'main',
      width: main.xMax - main.xMin,
      depth: main.zMax - main.zMin,
      x: (main.xMin + main.xMax) / 2,
      z: (main.zMin + main.zMax) / 2,
      baseY: 0.2,
      opacity: 0.8,
      ripple: false,
    },
    {
      key: 'cross',
      width: cross.xMax - cross.xMin,
      depth: cross.zMax - cross.zMin,
      x: (cross.xMin + cross.xMax) / 2,
      z: (cross.zMin + cross.zMax) / 2,
      baseY: 0.2,
      opacity: 0.8,
      ripple: false,
    },
    {
      key: 'outlet',
      width: outlet.xMax - outlet.xMin,
      depth: outlet.zMax - outlet.zMin,
      x: (outlet.xMin + outlet.xMax) / 2,
      z: (outlet.zMin + outlet.zMax) / 2,
      baseY: 0.2,
      opacity: 0.65,
      ripple: false,
    },
  ]

  const meshes = useRef<(Mesh | null)[]>([])
  const mats = useRef<(MeshStandardMaterial | null)[]>([])
  const puddleMats = useRef<(MeshStandardMaterial | null)[]>([])
  const scratch = useRef(new THREE.Color())

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useSimulationStore.getState()
    const visuals = POLLUTION_SCENARIOS[s.pollutionScenario].visuals
    const flow = s.phase === 'runoff' ? 1 : s.phase === 'raining' ? s.rainIntensity : 0
    const wet = flow > 0 || s.phase === 'runoff'
    const night = nightFactor(s.timeOfDay)

    // Colour: clean blue → scenario tint → suspended sediment. Turbidity is
    // the simulated driver; night simply darkens the same water.
    const muddy = Math.min(1, s.influent.turbidity / 160)
    const target = scratch.current
      .copy(CLEAN_WATER)
      .lerp(new THREE.Color(visuals.waterTint), 0.42)
      .lerp(new THREE.Color(visuals.sedimentColor), muddy * 0.68)
      .lerp(NIGHT_WATER, night * 0.5)

    const flood = Math.min(
      1,
      flow * visuals.floodPotential * 0.55 +
        Math.max(0, s.flowRate / DESIGN_FLOW_RATE - 1) * 0.4,
    )
    const levelLift = 0.02 + flow * 0.13 + flood * 0.05

    meshes.current.forEach((mesh, i) => {
      if (!mesh) return
      const def = surfaces[i]
      mesh.position.y = def.baseY + levelLift
      mesh.scale.set(1 + flood * 0.16, 1 + flood * 0.1, 1)
    })

    mats.current.forEach((mat, i) => {
      if (!mat) return
      const def = surfaces[i]
      mat.color.lerp(target, Math.min(1, dt * 2.2))
      mat.opacity = def.opacity + flow * 0.08
      if (def.ripple) {
        // Ripple cadence follows the simulated flow, so a faster runoff
        // event visibly moves the river surface more quickly.
        const rippleSpeed = 1.1 + s.flowRate * 0.09 + flow * 0.7
        mat.emissiveIntensity =
          0.1 + Math.sin(clock.elapsedTime * rippleSpeed + def.z) * 0.05 + flow * 0.08
      }
    })

    // Field puddles fade in with storm intensity and reflect the sediment.
    const puddleTarget = wet
      ? Math.min(0.85, 0.18 + s.rainIntensity * 0.5 + s.erosionIntensity * 0.18)
      : 0
    const puddleColor = scratch.current
      .copy(DEEP_SOIL)
      .lerp(new THREE.Color(visuals.sedimentColor), 0.5)
      .lerp(NIGHT_WATER, night * 0.4)
    puddleMats.current.forEach((mat) => {
      if (!mat) return
      mat.opacity += (puddleTarget - mat.opacity) * Math.min(1, dt * 2.5)
      mat.color.lerp(puddleColor, Math.min(1, dt * 2))
    })
  })

  const puddles: Array<[number, number]> = [
    [(LAYOUT.fields.A.xMin + LAYOUT.fields.A.xMax) / 2, (LAYOUT.fields.A.zMin + LAYOUT.fields.A.zMax) / 2],
    [(LAYOUT.fields.B.xMin + LAYOUT.fields.B.xMax) / 2, (LAYOUT.fields.B.zMin + LAYOUT.fields.B.zMax) / 2],
    [(LAYOUT.fields.C.xMin + LAYOUT.fields.C.xMax) / 2, (LAYOUT.fields.C.zMin + LAYOUT.fields.C.zMax) / 2],
  ]

  return (
    <group>
      {surfaces.map((surface, i) => (
        <mesh
          key={surface.key}
          ref={(m) => {
            meshes.current[i] = m
          }}
          position={[surface.x, surface.baseY, surface.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[surface.width, surface.depth]} />
          <meshStandardMaterial
            ref={(m) => {
              mats.current[i] = m
            }}
            color="#4299c7"
            transparent
            opacity={surface.opacity}
            roughness={0.15}
            metalness={0.1}
            emissive="#4299c7"
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}

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

/**
 * Small water packets advancing along a runoff flow path, visualizing
 * polluted water travelling from the fields toward the collection
 * system. Speed follows the simulated flow rate and rainfall; colour
 * follows the simulated turbidity. Cheap: 6 small boxes per path.
 */
function RunoffPulses({
  path,
  active,
}: {
  path: Array<[number, number]>
  active: boolean
}) {
  const refs = useRef<(Mesh | null)[]>([])
  const mats = useRef<(MeshStandardMaterial | null)[]>([])
  const scratch = useRef(new THREE.Color())

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useSimulationStore.getState()
    const visuals = POLLUTION_SCENARIOS[s.pollutionScenario].visuals
    const muddy = Math.min(1, s.influent.turbidity / 160)
    const targetColor = scratch.current
      .copy(CLEAN_WATER)
      .lerp(new THREE.Color(visuals.waterTint), 0.35)
      .lerp(new THREE.Color(visuals.sedimentColor), muddy * 0.55)

    mats.current.forEach((mat) => {
      if (mat) mat.color.lerp(targetColor, Math.min(1, dt * 2))
    })

    // Flow rate and rainfall genuinely change travel speed.
    const speed = 0.04 + s.flowRate * 0.011 + s.rainIntensity * 0.028
    const t = clock.elapsedTime * speed
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
          <meshStandardMaterial
            ref={(m) => {
              mats.current[i] = m
            }}
            color="#7fc4e8"
            transparent
            opacity={0.75}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}
