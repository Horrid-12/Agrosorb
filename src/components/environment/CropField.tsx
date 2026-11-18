import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import type { FieldRect } from './layout'
import { mulberry32 } from './layout'

/** Visual crop type that changes the shape, colour and size of plants. */
export type CropType = 'wheat' | 'corn' | 'cabbage'

interface CropFieldProps {
  rect: FieldRect
  seed: number
  /** Which crop to render. Each type has a distinct silhouette and colour. */
  cropType?: CropType
}

/* ─── geometry helpers ─────────────────────────────────────────────── */

interface PlantData {
  key: number
  x: number
  z: number
  height: number
  tilt: number
  leafAngle: number
  hue: number
}

function usePlantGrid(rect: FieldRect, seed: number, cols: number, rows: number): PlantData[] {
  return useMemo(() => {
    const rng = mulberry32(seed)
    const x0 = rect.xMin + 0.6
    const x1 = rect.xMax - 0.6
    const z0 = rect.zMin + 0.6
    const z1 = rect.zMax - 0.6
    return Array.from({ length: cols * rows }, (_, i) => {
      const cx = i % cols
      const cz = Math.floor(i / cols)
      const jitter = () => (rng() - 0.5) * 0.35
      const height = 0.7 + rng() * 0.45
      return {
        key: i,
        x: x0 + ((x1 - x0) * cx) / (cols - 1) + jitter(),
        z: z0 + ((z1 - z0) * cz) / (rows - 1) + jitter(),
        height,
        tilt: (rng() - 0.5) * 0.12,
        leafAngle: 0.3 + rng() * 0.4,
        hue: rng(),
      }
    })
  }, [rect, seed, cols, rows])
}

/* ═══════════════════════════════════════════════════════════════════ */

/**
 * One crop field.  `cropType` controls the visual:
 *
 * - **wheat** — thin golden stalks with seed heads (default)
 * - **corn** — tall thick green stalks with long drooping leaves and
 *              a tan tassel on top
 * - **cabbage** — low round green heads sitting on the soil
 */
export function CropField({ rect, seed, cropType = 'wheat' }: CropFieldProps) {
  switch (cropType) {
    case 'corn':
      return <CornField rect={rect} seed={seed} />
    case 'cabbage':
      return <CabbageField rect={rect} seed={seed} />
    default:
      return <WheatField rect={rect} seed={seed} />
  }
}

/* ─── WHEAT ────────────────────────────────────────────────────────── */

function WheatField({ rect, seed }: { rect: FieldRect; seed: number }) {
  const plants = usePlantGrid(rect, seed, 10, 9)
  const plantsA = useMemo(() => plants.filter((p) => p.hue > 0.5), [plants])
  const plantsB = useMemo(() => plants.filter((p) => p.hue <= 0.5), [plants])

  return (
    <group>
      {/* Stalks */}
      <Instances limit={plants.length} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 1, 4]} />
        <meshStandardMaterial color="#5a8a3a" roughness={0.9} />
        {plants.map((p) => (
          <Instance key={p.key} position={[p.x, 0.22 + p.height * 0.5, p.z]} scale={[1, p.height, 1]} rotation={[p.tilt, 0, p.tilt]} />
        ))}
      </Instances>

      {/* Left leaf blades A */}
      <Instances limit={plants.length} castShadow>
        <boxGeometry args={[0.35, 0.04, 0.06]} />
        <meshStandardMaterial color="#6ea043" roughness={0.85} />
        {plantsA.map((p) => (
          <Instance key={p.key} position={[p.x - 0.12, 0.22 + p.height * 0.38, p.z]} rotation={[0, p.hue * 3, -p.leafAngle]} />
        ))}
      </Instances>

      {/* Left leaf blades B */}
      <Instances limit={plants.length} castShadow>
        <boxGeometry args={[0.35, 0.04, 0.06]} />
        <meshStandardMaterial color="#4e8830" roughness={0.85} />
        {plantsB.map((p) => (
          <Instance key={p.key} position={[p.x - 0.12, 0.22 + p.height * 0.38, p.z]} rotation={[0, p.hue * 3, -p.leafAngle]} />
        ))}
      </Instances>

      {/* Right leaf blades */}
      <Instances limit={plants.length} castShadow>
        <boxGeometry args={[0.32, 0.04, 0.06]} />
        <meshStandardMaterial color="#5d9838" roughness={0.85} />
        {plants.map((p) => (
          <Instance key={p.key} position={[p.x + 0.12, 0.22 + p.height * 0.55, p.z]} rotation={[0, p.hue * 2 + 1, p.leafAngle * 0.9]} />
        ))}
      </Instances>

      {/* Seed heads A */}
      <Instances limit={plants.length} castShadow>
        <sphereGeometry args={[0.07, 5, 4]} />
        <meshStandardMaterial color="#c9a94e" roughness={0.75} />
        {plantsA.map((p) => (
          <Instance key={p.key} position={[p.x, 0.22 + p.height * 1.05, p.z]} scale={[0.7, 1.6, 0.7]} rotation={[p.tilt, 0, p.tilt]} />
        ))}
      </Instances>

      {/* Seed heads B */}
      <Instances limit={plants.length} castShadow>
        <sphereGeometry args={[0.07, 5, 4]} />
        <meshStandardMaterial color="#b89840" roughness={0.75} />
        {plantsB.map((p) => (
          <Instance key={p.key} position={[p.x, 0.22 + p.height * 1.05, p.z]} scale={[0.7, 1.6, 0.7]} rotation={[p.tilt, 0, p.tilt]} />
        ))}
      </Instances>
    </group>
  )
}

/* ─── CORN ─────────────────────────────────────────────────────────── */

function CornField({ rect, seed }: { rect: FieldRect; seed: number }) {
  const plants = usePlantGrid(rect, seed, 8, 7)

  return (
    <group>
      {/* Thick stalks */}
      <Instances limit={plants.length} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 1, 5]} />
        <meshStandardMaterial color="#3d7a2e" roughness={0.85} />
        {plants.map((p) => {
          const h = p.height * 1.6
          return <Instance key={p.key} position={[p.x, 0.22 + h * 0.5, p.z]} scale={[1, h, 1]} rotation={[p.tilt * 0.5, 0, p.tilt * 0.5]} />
        })}
      </Instances>

      {/* Long drooping leaves (left) */}
      <Instances limit={plants.length} castShadow>
        <boxGeometry args={[0.6, 0.04, 0.1]} />
        <meshStandardMaterial color="#5ba845" roughness={0.8} />
        {plants.map((p) => {
          const h = p.height * 1.6
          return <Instance key={`l1-${p.key}`} position={[p.x - 0.2, 0.22 + h * 0.5, p.z]} rotation={[0.1, p.hue * 4, -0.5 - p.leafAngle * 0.3]} />
        })}
      </Instances>

      {/* Long drooping leaves (right) */}
      <Instances limit={plants.length} castShadow>
        <boxGeometry args={[0.55, 0.04, 0.1]} />
        <meshStandardMaterial color="#4d9a3b" roughness={0.8} />
        {plants.map((p) => {
          const h = p.height * 1.6
          return <Instance key={`r1-${p.key}`} position={[p.x + 0.2, 0.22 + h * 0.65, p.z]} rotation={[0.1, p.hue * 2 + 1, 0.5 + p.leafAngle * 0.3]} />
        })}
      </Instances>

      {/* Mid-height leaves */}
      <Instances limit={plants.length} castShadow>
        <boxGeometry args={[0.5, 0.04, 0.09]} />
        <meshStandardMaterial color="#68b050" roughness={0.8} />
        {plants.map((p) => {
          const h = p.height * 1.6
          return <Instance key={`m-${p.key}`} position={[p.x, 0.22 + h * 0.35, p.z + 0.15]} rotation={[0.4, p.hue * 5, p.tilt]} />
        })}
      </Instances>

      {/* Corn tassel — tan fuzzy top */}
      <Instances limit={plants.length} castShadow>
        <coneGeometry args={[0.08, 0.22, 4]} />
        <meshStandardMaterial color="#c4a04a" roughness={0.65} />
        {plants.map((p) => {
          const h = p.height * 1.6
          return <Instance key={`t-${p.key}`} position={[p.x, 0.22 + h * 1.08, p.z]} scale={[1, 1.2, 1]} rotation={[p.tilt, p.hue * 3, p.tilt]} />
        })}
      </Instances>

      {/* Corn ear — small cylinder on stalk side */}
      <Instances limit={plants.length} castShadow>
        <cylinderGeometry args={[0.06, 0.05, 0.22, 5]} />
        <meshStandardMaterial color="#e8d05a" roughness={0.7} />
        {plants.map((p) => {
          const h = p.height * 1.6
          return <Instance key={`e-${p.key}`} position={[p.x + 0.09, 0.22 + h * 0.6, p.z]} rotation={[0, 0, 0.6 + p.tilt]} />
        })}
      </Instances>
    </group>
  )
}

/* ─── CABBAGE ──────────────────────────────────────────────────────── */

function CabbageField({ rect, seed }: { rect: FieldRect; seed: number }) {
  const plants = usePlantGrid(rect, seed, 9, 8)
  const plantsA = useMemo(() => plants.filter((p) => p.hue > 0.5), [plants])
  const plantsB = useMemo(() => plants.filter((p) => p.hue <= 0.5), [plants])

  return (
    <group>
      {/* Main cabbage head — squat sphere */}
      <Instances limit={plants.length} castShadow>
        <sphereGeometry args={[0.28, 7, 5]} />
        <meshStandardMaterial color="#4a9c3a" roughness={0.75} />
        {plantsA.map((p) => (
          <Instance key={p.key} position={[p.x, 0.32, p.z]} scale={[1, 0.7 + p.height * 0.2, 1]} />
        ))}
      </Instances>

      <Instances limit={plants.length} castShadow>
        <sphereGeometry args={[0.28, 7, 5]} />
        <meshStandardMaterial color="#3d8a30" roughness={0.75} />
        {plantsB.map((p) => (
          <Instance key={p.key} position={[p.x, 0.32, p.z]} scale={[1, 0.7 + p.height * 0.2, 1]} />
        ))}
      </Instances>

      {/* Outer leaves — wider flattened spheres around the head */}
      <Instances limit={plants.length} castShadow>
        <sphereGeometry args={[0.38, 6, 4]} />
        <meshStandardMaterial color="#68ad52" roughness={0.8} />
        {plants.map((p) => (
          <Instance key={p.key} position={[p.x, 0.24, p.z]} scale={[1, 0.3, 1]} rotation={[p.tilt, p.hue * 5, p.tilt]} />
        ))}
      </Instances>

      {/* Centre highlight — lighter green core */}
      <Instances limit={plants.length}>
        <sphereGeometry args={[0.12, 5, 4]} />
        <meshStandardMaterial color="#a4d48e" roughness={0.7} />
        {plants.map((p) => (
          <Instance key={p.key} position={[p.x, 0.4, p.z]} scale={[1, 0.6, 1]} />
        ))}
      </Instances>
    </group>
  )
}
