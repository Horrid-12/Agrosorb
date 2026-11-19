import { useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh, MeshStandardMaterial } from 'three'
import { LAYOUT } from './layout'
import { useSimulationStore } from '@/stores/simulationStore'
import { MATERIALS } from '@/data/materials'
import { POLLUTION_SCENARIOS } from '@/data/pollutionScenarios'
import { isLayerEnabled } from '@/simulation/engine/filtrationEngine'
import { TREATMENT } from '@/simulation/models/constants'

const LAYER_CM_TO_WORLD = 0.42 // cm of bed depth → world height units
const WET_TINT = new THREE.Color('#4299c7')
const DISABLED_TINT = new THREE.Color('#56605b')
const LAYER_SCRATCH = new THREE.Color()

const PIPE_MATERIAL = (
  <meshStandardMaterial color="#8b9aa3" roughness={0.5} metalness={0.3} />
)

/**
 * In-scene Html labels fade out and stop taking clicks while a HUD panel
 * is open, so they never peek out from under (or fight with) the panel.
 */
function labelStyle(hidden: boolean): CSSProperties {
  return {
    opacity: hidden ? 0 : 1,
    transition: 'opacity 160ms ease',
    pointerEvents: hidden ? 'none' : 'auto',
  }
}

/**
 * Spherical elbow joint where two pipe segments meet. Two cylinders
 * joined at an angle leave a wedge-shaped gap; a sphere of matching
 * radius rounds the corner so the run reads as one continuous pipe.
 */
function PipeJoint({ at, radius = 0.28 }: { at: [number, number, number]; radius?: number }) {
  return (
    <mesh castShadow position={at}>
      <sphereGeometry args={[radius, 12, 10]} />
      {PIPE_MATERIAL}
    </mesh>
  )
}

/**
 * A pipe segment drawn between two exact 3D points. Using endpoints
 * (instead of hand-placed positions + rotations) guarantees pipes are
 * always physically connected — no floating segments.
 */
function Pipe({ from, to, radius = 0.26 }: { from: [number, number, number]; to: [number, number, number]; radius?: number }) {
  const { mid, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const dir = end.clone().sub(start)
    const len = dir.length()
    const midPoint = start.clone().add(end).multiplyScalar(0.5)
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    )
    return { mid: midPoint, quaternion: q, length: len }
  }, [from, to])

  return (
    <mesh castShadow position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      {PIPE_MATERIAL}
    </mesh>
  )
}

/**
 * Small water packets travelling through a pipe segment while `active`.
 * Visualizes influent entering the column / treated water leaving it.
 */
function PipeFlow({
  from,
  to,
  active,
  count = 4,
  radius = 0.16,
}: {
  from: [number, number, number]
  to: [number, number, number]
  active: boolean
  count?: number
  radius?: number
}) {
  const { start, end } = useMemo(
    () => ({ start: new THREE.Vector3(...from), end: new THREE.Vector3(...to) }),
    [from, to],
  )
  const refs = useRef<(THREE.Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.5
    for (let i = 0; i < count; i++) {
      const m = refs.current[i]
      if (!m) continue
      m.visible = active
      if (active) {
        m.position.lerpVectors(start, end, (t + i / count) % 1)
      }
    }
  })

  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(m) => {
            refs.current[i] = m
          }}
        >
          <sphereGeometry args={[radius, 8, 6]} />
          <meshStandardMaterial color="#7fc4e8" transparent opacity={0.85} roughness={0.2} emissive="#4299c7" emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * The interactive filtration station: a glass column holding the user's
 * configured layers (read live from the store), an inlet pipe from the
 * collection channel and a treated-water tank.
 *
 * During a simulation the treatment sequence animates here:
 *   filling   — influent water rises above the media bed
 *   filtering — media beds wet up from the top layer downward
 *   draining  — the water head drops as treated water leaves for the tank
 *
 * Clicking the station opens the filter configurator.
 */
export function FiltrationStation() {
  const layers = useSimulationStore((s) => s.layers)
  const setPanel = useSimulationStore((s) => s.setPanel)
  const setStationInspecting = useSimulationStore((s) => s.setStationInspecting)
  const panel = useSimulationStore((s) => s.panel)
  const station = LAYOUT.station

  const waterHead = useRef<Mesh>(null)
  const waterHeadMat = useRef<MeshStandardMaterial>(null)
  const sedimentCake = useRef<Mesh>(null)
  const sedimentMat = useRef<MeshStandardMaterial>(null)
  /** Wetness 0..1 per layer (keyed by layer id, in stack order bottom→top). */
  const layerWet = useRef<Map<string, number>>(new Map())
  const layerMats = useRef<Map<string, MeshStandardMaterial>>(new Map())

  // Stack layers bottom-up (gravel sits at the bottom of the glass tube).
  // The cm→world scale shrinks for very deep columns so the bed always
  // fits inside the glass instead of overflowing the cap.
  const stack = [...layers].reverse()
  const totalThickness = layers.reduce((sum, l) => sum + l.thickness, 0)
  const layerScale = Math.min(LAYER_CM_TO_WORLD, 5.2 / Math.max(totalThickness, 1))
  let cursorY = 0.4
  const layerMeshes = stack.map((layer) => {
    const h = Math.max(0.25, layer.thickness * layerScale)
    const y = cursorY + h / 2
    cursorY += h
    return { key: layer.id, material: layer.material, h, y, enabled: isLayerEnabled(layer) }
  })
  const stackTop = cursorY

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const {
      treatmentStage: stage,
      stageElapsed,
      layers: liveLayers,
      influent,
      pollutionScenario,
      pendingResult,
      result,
    } = useSimulationStore.getState()
    const duration = TREATMENT.stageDurations[stage as keyof typeof TREATMENT.stageDurations] ?? 0
    const sp = duration > 0 ? Math.min(1, stageElapsed / duration) : 0

    /* Water head above the media bed */
    let headTarget = 0
    if (stage === 'filling') headTarget = sp
    else if (stage === 'filtering') headTarget = 1
    else if (stage === 'draining') headTarget = 1 - sp

    if (waterHead.current) {
      const s = waterHead.current.scale
      s.y += (Math.max(0.001, headTarget) - s.y) * Math.min(1, dt * 5)
      waterHead.current.visible = s.y > 0.02
    }
    if (waterHeadMat.current) {
      // Water appearance follows simulated turbidity, not a decorative tint.
      const visuals = POLLUTION_SCENARIOS[pollutionScenario].visuals
      const muddy = Math.min(1, influent.turbidity / 150)
      const clean = new THREE.Color('#4299c7')
      const dirty = new THREE.Color(visuals.sedimentColor)
      waterHeadMat.current.color.copy(clean).lerp(dirty, muddy * 0.85)
      waterHeadMat.current.emissiveIntensity = 0.25 + Math.sin(performance.now() * 0.0022) * 0.15
    }

    // Sediment cake building on top of the media during/after a run.
    if (sedimentCake.current && sedimentMat.current) {
      const output = pendingResult ?? result
      const loading = output?.filterLoading ?? 0
      const activeCake = loading > 0.02 && (stage === 'filtering' || stage === 'draining' || stage === 'done')
      sedimentCake.current.visible = activeCake
      if (activeCake) {
        const visuals = POLLUTION_SCENARIOS[pollutionScenario].visuals
        sedimentMat.current.color.set(visuals.sedimentColor)
        sedimentMat.current.opacity = 0.55 + loading * 0.4
        const target = 0.06 + loading * 0.35
        sedimentCake.current.scale.y += (target - sedimentCake.current.scale.y) * Math.min(1, dt * 3)
      }
    }

    /* Media beds wet up from the top layer downward during filtering */
    const count = liveLayers.length
    const wetCount = stage === 'filtering' ? Math.ceil(sp * count) : stage === 'draining' || stage === 'done' ? count : 0
    // stack index j: 0 = bottom … count-1 = top. Top-down wetting wets
    // layers with j >= count - wetCount.
    layerMeshes.forEach((l, j) => {
      const target = j >= count - wetCount ? 1 : 0
      const prev = layerWet.current.get(l.key) ?? 0
      const next = prev + (target - prev) * Math.min(1, dt * 3)
      layerWet.current.set(l.key, next)
      const mat = layerMats.current.get(l.key)
      if (mat) {
        LAYER_SCRATCH.set(MATERIALS[l.material].color)
        if (!l.enabled) LAYER_SCRATCH.lerp(DISABLED_TINT, 0.65)
        mat.color.copy(LAYER_SCRATCH).lerp(WET_TINT, next * 0.4)
      }
    })
  })

  const openInspection = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    const next = panel === 'inspection' ? null : 'inspection'
    setPanel(next)
    setStationInspecting(next === 'inspection')
  }

  return (
    <group>
      {/* Concrete platform */}
      <mesh receiveShadow castShadow position={[station.x, 0.3, station.z]}>
        <boxGeometry args={[7, 0.6, 7]} />
        <meshStandardMaterial color="#a8a294" roughness={0.9} />
      </mesh>
      <mesh receiveShadow position={[station.x, 0.62, station.z]}>
        <boxGeometry args={[6.6, 0.08, 6.6]} />
        <meshStandardMaterial color="#b7b2a4" roughness={0.9} />
      </mesh>

      {/* Inlet pipe: from the collection channel into the column base */}
      <Pipe from={[9.9, 0.9, 12.4]} to={[9.9, 0.9, 15.6]} radius={0.28} />
      <InletFlow />

      {/* Glass column */}
      <mesh castShadow position={[station.x, 0.6 + 3, station.z]}>
        <cylinderGeometry args={[2, 2, 6, 20, 1, true]} />
        <meshStandardMaterial
          color="#b9d9e8"
          transparent
          opacity={0.22}
          roughness={0.05}
          metalness={0.1}
          side={2 /* DoubleSide */}
        />
      </mesh>

      {/* Water head above the media bed (animates during treatment) */}
      <mesh position={[station.x, 0.6 + stackTop + 0.35, station.z]} ref={waterHead} visible={false} scale={[1, 0.001, 1]}>
        <cylinderGeometry args={[1.85, 1.85, 0.7, 20]} />
        <meshStandardMaterial ref={waterHeadMat} color="#4299c7" transparent opacity={0.5} emissive="#4299c7" emissiveIntensity={0.3} roughness={0.2} />
      </mesh>

      {/* Media layers */}
      {layerMeshes.map((l) => (
        <mesh key={l.key} castShadow position={[station.x, 0.6 + l.y, station.z]}>
          <cylinderGeometry args={[1.88, 1.88, l.h, 20]} />
          <meshStandardMaterial
            color={MATERIALS[l.material].color}
            roughness={0.95}
            flatShading
            ref={(m) => {
              if (m) layerMats.current.set(l.key, m)
              else layerMats.current.delete(l.key)
            }}
          />
        </mesh>
      ))}

      <ColumnTracers baseY={0.7} topY={0.6 + stackTop} />

      {/* Sediment cake on top of the active media (loading visual) */}
      <mesh
        ref={sedimentCake}
        visible={false}
        position={[station.x, 0.6 + stackTop + 0.08, station.z]}
        scale={[1, 0.06, 1]}
      >
        <cylinderGeometry args={[1.86, 1.86, 1, 20]} />
        <meshStandardMaterial ref={sedimentMat} color="#8a6138" transparent opacity={0.7} roughness={1} />
      </mesh>

      {/* Column cap + outlet plumbing to the treated tank */}
      <mesh castShadow position={[station.x, 6.7, station.z]}>
        <cylinderGeometry args={[2.3, 2.3, 0.35, 20]} />
        <meshStandardMaterial color="#5f6d68" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Run diagonally from the cap across to the tank, then drop into it */}
      <Pipe from={[11.6, 6.55, 16.5]} to={[22, 5.5, 19.4]} />
      <PipeJoint at={[22, 5.5, 19.4]} />
      <Pipe from={[22, 5.5, 19.4]} to={[22, 2.3, 19.4]} />
      <OutletFlow />

      {/* Click target (invisible cylinder around the column) */}
      <mesh
        position={[station.x, 3.6, station.z]}
        onClick={openInspection}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <cylinderGeometry args={[2.6, 2.6, 6.8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html
        position={[station.x, 8.4, station.z]}
        center
        distanceFactor={26}
        zIndexRange={[10, 0]}
        style={labelStyle(panel != null)}
      >
        <button
          onClick={openInspection}
          className="whitespace-nowrap rounded-full border border-ag-ui-border bg-ag-ui/85 px-3 py-1 text-[11px] font-semibold text-ag-sand shadow-panel transition hover:bg-ag-ui-light cursor-pointer"
        >
          Filtration Station · click to inspect
        </button>
      </Html>

      <TreatedTank />
    </group>
  )
}

/**
 * Dissolved/suspended tracers moving down through the configured media.
 * Colours and counts are driven by the active scenario and influent
 * chemistry, so the column visibly changes when the pollution scenario or
 * concentration controls change. These are visual tracers, not molecules.
 */
function ColumnTracers({ baseY, topY }: { baseY: number; topY: number }) {
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.PointsMaterial>(null)
  const SEDIMENT = 20
  const CONTAMINANT = 18
  const NUTRIENT = 14
  const MAX = SEDIMENT + CONTAMINANT + NUTRIENT

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(MAX * 3)
    const speeds = new Float32Array(MAX)
    for (let i = 0; i < MAX; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.sqrt(Math.random()) * 1.55
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = baseY + Math.random() * Math.max(0.1, topY - baseY)
      positions[i * 3 + 2] = Math.sin(angle) * radius
      speeds[i] = 0.8 + Math.random() * 1.4
    }
    return { positions, speeds }
  }, [baseY, topY, MAX])

  const colors = useMemo(() => {
    const colors = new Float32Array(MAX * 3)
    const sediment = new THREE.Color('#8a6138')
    const contaminant = new THREE.Color('#b05f8f')
    const nutrient = new THREE.Color('#b7d44e')
    for (let i = 0; i < MAX; i++) {
      const c = i < SEDIMENT ? sediment : i < SEDIMENT + CONTAMINANT ? contaminant : nutrient
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return colors
  }, [MAX])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = useSimulationStore.getState()
    const stage = s.treatmentStage
    const flowing = stage === 'filtering' || stage === 'draining'
    if (!points.current || !material.current) return

    const visuals = POLLUTION_SCENARIOS[s.pollutionScenario].visuals
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

    points.current.visible = flowing && active > 0
    // Preserve species ordering: inactive tracers are parked far below the
    // scene rather than truncating the draw range (which would show the
    // wrong species first when a category is absent).
    points.current.geometry.setDrawRange(0, MAX)
    material.current.opacity = flowing ? 0.85 : 0
    if (!flowing) return

    const attr = points.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const speedFactor = 0.35 + s.flowRate * 0.12
    for (let i = 0; i < MAX; i++) {
      const visible =
        i < SEDIMENT
          ? i < sedimentCount
          : i < SEDIMENT + CONTAMINANT
            ? i - SEDIMENT < contaminantCount
            : i - SEDIMENT - CONTAMINANT < nutrientCount
      if (!visible) {
        arr[i * 3 + 1] = -1000
        continue
      }
      arr[i * 3 + 1] -= speeds[i] * speedFactor * dt
      if (arr[i * 3 + 1] < baseY) {
        arr[i * 3 + 1] = topY
      }
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={points} position={[LAYOUT.station.x, 0, LAYOUT.station.z]} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        vertexColors
        size={0.22}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  )
}

/** Influent packets entering the column while it fills and filters. */
function InletFlow() {
  const stage = useSimulationStore((s) => s.treatmentStage)
  const active = stage === 'filling' || stage === 'filtering'
  return <PipeFlow from={[9.9, 0.9, 12.4]} to={[9.9, 0.9, 15.6]} radius={0.18} active={active} />
}

/** Treated-water packets along the outlet plumbing during draining. */
function OutletFlow() {
  const stage = useSimulationStore((s) => s.treatmentStage)
  const active = stage === 'draining'
  return (
    <>
      <PipeFlow from={[11.6, 6.55, 16.5]} to={[22, 5.5, 19.4]} active={active} />
      <PipeFlow from={[22, 5.5, 19.4]} to={[22, 2.3, 19.4]} active={active} />
    </>
  )
}

/**
 * Collection tank. Water rises from the tank floor while treated water
 * drains in (stage 'draining'), holds at the run's efficiency level when
 * done, and empties on reset or when a new run starts.
 */
function TreatedTank() {
  const tank = LAYOUT.tank
  const panel = useSimulationStore((s) => s.panel)
  const water = useRef<Mesh>(null)
  const mat = useRef<MeshStandardMaterial>(null)
  const fill = useRef(0)
  const prevStage = useRef<string>('idle')

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const {
      treatmentStage: stage,
      stageElapsed,
      pendingResult,
      result,
      pollutionScenario,
    } = useSimulationStore.getState()
    const duration = TREATMENT.stageDurations.draining
    const sp = stage === 'draining' ? Math.min(1, stageElapsed / duration) : 0
    const eff = ((pendingResult ?? result)?.overallEfficiency ?? 0) / 100

    // New run started → tank starts empty again.
    if (stage === 'filling' && prevStage.current !== 'filling') fill.current = 0

    let target: number
    switch (stage) {
      case 'draining':
        target = eff * sp
        break
      case 'done':
        target = eff
        break
      case 'filtering':
        target = fill.current // hold while filtering
        break
      default:
        target = 0 // idle / error → empty (visual reset)
        break
    }

    fill.current += (target - fill.current) * Math.min(1, dt * 2.5)
    prevStage.current = stage

    if (water.current) {
      const f = Math.max(0.001, fill.current)
      water.current.scale.y = f
      // Keep the water bottom anchored at the tank floor (y ≈ 0.15).
      water.current.position.y = 0.15 + (1.9 * f) / 2
    }
    if (mat.current) {
      // Treated-water colour follows simulated final turbidity, not an
      // arbitrary efficiency threshold.
      const output = pendingResult ?? result
      const visuals = POLLUTION_SCENARIOS[pollutionScenario].visuals
      const finalTurbidity = output?.final.turbidity ?? 0
      const muddy = Math.min(1, finalTurbidity / 150)
      const targetColor = new THREE.Color('#4299c7').lerp(
        new THREE.Color(visuals.sedimentColor),
        muddy * 0.8,
      )
      mat.current.color.lerp(targetColor, Math.min(1, dt * 2))
    }
  })

  return (
    <group>
      <mesh castShadow position={[tank.x, 1.1, tank.z]}>
        <cylinderGeometry args={[1.7, 1.7, 2.2, 16, 1, true]} />
        <meshStandardMaterial color="#6e7d76" transparent opacity={0.55} roughness={0.3} side={2} />
      </mesh>
      <mesh position={[tank.x, 1.1, tank.z]} ref={water}>
        <cylinderGeometry args={[1.55, 1.55, 1.9, 16]} />
        <meshStandardMaterial ref={mat} color="#4299c7" transparent opacity={0.75} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[tank.x, 2.35, tank.z]}>
        <cylinderGeometry args={[1.9, 1.9, 0.3, 16]} />
        <meshStandardMaterial color="#5f6d68" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[tank.x, 0.05, tank.z]}>
        <cylinderGeometry args={[1.8, 1.8, 0.15, 16]} />
        <meshStandardMaterial color="#5f6d68" roughness={0.7} />
      </mesh>
      <Html
        position={[tank.x, 3.4, tank.z]}
        center
        distanceFactor={26}
        zIndexRange={[10, 0]}
        style={labelStyle(panel != null)}
      >
        <div className="whitespace-nowrap rounded-full border border-ag-ui-border bg-ag-ui/85 px-3 py-1 text-[11px] font-semibold text-ag-good shadow-panel">
          Treated Water
        </div>
      </Html>
    </group>
  )
}
