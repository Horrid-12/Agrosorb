import { useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh, MeshStandardMaterial } from 'three'
import { LAYOUT } from './layout'
import { useSimulationStore } from '@/stores/simulationStore'
import { MATERIALS } from '@/data/materials'

const LAYER_CM_TO_WORLD = 0.42 // cm of bed depth → world height units

const PIPE_MATERIAL = (
  <meshStandardMaterial color="#8b9aa3" roughness={0.5} metalness={0.3} />
)

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
 * The interactive filtration station: a glass column holding the user's
 * configured layers (read live from the store), an inlet pipe from the
 * collection channel and a treated-water tank whose fill level tracks
 * the last simulation's overall efficiency.
 *
 * Clicking the station opens the filter configurator.
 */
export function FiltrationStation() {
  const layers = useSimulationStore((s) => s.layers)
  const setPanel = useSimulationStore((s) => s.setPanel)
  const panel = useSimulationStore((s) => s.panel)
  const station = LAYOUT.station

  const waterMat = useRef<MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (waterMat.current) {
      waterMat.current.emissiveIntensity = 0.25 + Math.sin(clock.elapsedTime * 2.2) * 0.15
    }
  })

  // Stack layers bottom-up (gravel sits at the bottom of the glass tube).
  const stack = [...layers].reverse()
  let cursorY = 0.4
  const layerMeshes = stack.map((layer) => {
    const h = Math.max(0.25, layer.thickness * LAYER_CM_TO_WORLD)
    const y = cursorY + h / 2
    cursorY += h
    return { key: layer.id, material: layer.material, h, y }
  })
  const stackTop = cursorY

  const openConfig = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    setPanel(panel === 'config' ? null : 'config')
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

      {/* Water head above the media bed (only while processing) */}
      <mesh position={[station.x, stackTop + 0.35, station.z]}>
        <cylinderGeometry args={[1.85, 1.85, 0.7, 20]} />
        <meshStandardMaterial ref={waterMat} color="#4299c7" transparent opacity={0.5} emissive="#4299c7" emissiveIntensity={0.3} roughness={0.2} />
      </mesh>

      {/* Media layers */}
      {layerMeshes.map((l) => (
        <mesh key={l.key} castShadow position={[station.x, 0.6 + l.y, station.z]}>
          <cylinderGeometry args={[1.88, 1.88, l.h, 20]} />
          <meshStandardMaterial color={MATERIALS[l.material].color} roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* Column cap + outlet plumbing to the treated tank */}
      <mesh castShadow position={[station.x, 6.7, station.z]}>
        <cylinderGeometry args={[2.3, 2.3, 0.35, 20]} />
        <meshStandardMaterial color="#5f6d68" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Run diagonally from the cap across to the tank, then drop into it */}
      <Pipe from={[11.6, 6.55, 16.5]} to={[22, 5.5, 19.4]} />
      <Pipe from={[22, 5.5, 19.4]} to={[22, 2.3, 19.4]} />

      {/* Click target (invisible cylinder around the column) */}
      <mesh
        position={[station.x, 3.6, station.z]}
        onClick={openConfig}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <cylinderGeometry args={[2.6, 2.6, 6.8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html position={[station.x, 8.4, station.z]} center distanceFactor={26} zIndexRange={[20, 0]}>
        <button
          onClick={openConfig}
          className="whitespace-nowrap rounded-full border border-ag-ui-border bg-ag-ui/85 px-3 py-1 text-[11px] font-semibold text-ag-sand shadow-panel transition hover:bg-ag-ui-light cursor-pointer"
        >
          Filtration Station
        </button>      </Html>

      <TreatedTank />
    </group>
  )
}

/** Collection tank; water level animates toward the last result's efficiency. */
function TreatedTank() {
  const tank = LAYOUT.tank
  const efficiency = useSimulationStore((s) => s.result?.overallEfficiency ?? 0)
  const water = useRef<Mesh>(null)
  const mat = useRef<MeshStandardMaterial>(null)

  useFrame((_, dt) => {
    const targetFill = Math.max(0.08, efficiency / 100)
    if (water.current) {
      const targetScale = targetFill
      water.current.scale.y += (targetScale - water.current.scale.y) * Math.min(1, dt * 2)
    }
    if (mat.current) {
      // Clean, efficient runs tint the tank water blue; weak ones stay murky.
      const target = new THREE.Color(efficiency >= 55 ? '#4299c7' : '#8a744f')
      mat.current.color.lerp(target, Math.min(1, dt * 2))
    }
  })

  return (
    <group>
      <mesh castShadow position={[tank.x, 1.1, tank.z]}>
        <cylinderGeometry args={[1.7, 1.7, 2.2, 16, 1, true]} />
        <meshStandardMaterial color="#6e7d76" transparent opacity={0.55} roughness={0.3} side={2} />
      </mesh>
      <mesh position={[tank.x, 1.1, tank.z]}>
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
      <Html position={[tank.x, 3.4, tank.z]} center distanceFactor={26} zIndexRange={[20, 0]}>
        <div className="whitespace-nowrap rounded-full border border-ag-ui-border bg-ag-ui/85 px-3 py-1 text-[11px] font-semibold text-ag-good shadow-panel">
          Treated Water
        </div>
      </Html>
    </group>
  )
}
