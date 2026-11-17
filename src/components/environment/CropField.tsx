import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import type { FieldRect } from './layout'
import { mulberry32 } from './layout'

interface CropFieldProps {
  rect: FieldRect
  seed: number
}

/**
 * One crop field: a dense grid of wheat-like crop stalks rendered with
 * instanced meshes.  Each plant has a thin stalk, two leaf blades
 * fanning outward, and a golden seed head (elongated sphere) on top.
 * Per-plant variation in height, tilt and hue keeps the field organic.
 */
export function CropField({ rect, seed }: CropFieldProps) {
  const plants = useMemo(() => {
    const rng = mulberry32(seed)
    const cols = 10
    const rows = 9
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
  }, [rect, seed])

  const plantsA = useMemo(() => plants.filter((p) => p.hue > 0.5), [plants])
  const plantsB = useMemo(() => plants.filter((p) => p.hue <= 0.5), [plants])

  return (
    <group>
      {/* ── Stalks ── thin cylinders, like wheat stems */}
      <Instances limit={plants.length} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 1, 4]} />
        <meshStandardMaterial color="#5a8a3a" roughness={0.9} />
        {plants.map((p) => (
          <Instance
            key={p.key}
            position={[p.x, 0.22 + p.height * 0.5, p.z]}
            scale={[1, p.height, 1]}
            rotation={[p.tilt, 0, p.tilt]}
          />
        ))}
      </Instances>

      {/* ── Left leaf blades ── flat boxes angled outward (green set A) */}
      <Instances limit={plants.length} castShadow>
        <boxGeometry args={[0.35, 0.04, 0.06]} />
        <meshStandardMaterial color="#6ea043" roughness={0.85} />
        {plantsA.map((p) => (
          <Instance
            key={p.key}
            position={[p.x - 0.12, 0.22 + p.height * 0.38, p.z]}
            rotation={[0, p.hue * 3, -p.leafAngle]}
            scale={[1, 1, 1]}
          />
        ))}
      </Instances>

      {/* ── Left leaf blades (green set B — slightly darker) */}
      <Instances limit={plants.length} castShadow>
        <boxGeometry args={[0.35, 0.04, 0.06]} />
        <meshStandardMaterial color="#4e8830" roughness={0.85} />
        {plantsB.map((p) => (
          <Instance
            key={p.key}
            position={[p.x - 0.12, 0.22 + p.height * 0.38, p.z]}
            rotation={[0, p.hue * 3, -p.leafAngle]}
            scale={[1, 1, 1]}
          />
        ))}
      </Instances>

      {/* ── Right leaf blades ── mirrored */}
      <Instances limit={plants.length} castShadow>
        <boxGeometry args={[0.32, 0.04, 0.06]} />
        <meshStandardMaterial color="#5d9838" roughness={0.85} />
        {plants.map((p) => (
          <Instance
            key={p.key}
            position={[p.x + 0.12, 0.22 + p.height * 0.55, p.z]}
            rotation={[0, p.hue * 2 + 1, p.leafAngle * 0.9]}
            scale={[1, 1, 1]}
          />
        ))}
      </Instances>

      {/* ── Seed heads ── elongated golden spheres at the tip (set A) */}
      <Instances limit={plants.length} castShadow>
        <sphereGeometry args={[0.07, 5, 4]} />
        <meshStandardMaterial color="#c9a94e" roughness={0.75} />
        {plantsA.map((p) => (
          <Instance
            key={p.key}
            position={[p.x, 0.22 + p.height * 1.05, p.z]}
            scale={[0.7, 1.6, 0.7]}
            rotation={[p.tilt, 0, p.tilt]}
          />
        ))}
      </Instances>

      {/* ── Seed heads (set B — slightly darker gold) */}
      <Instances limit={plants.length} castShadow>
        <sphereGeometry args={[0.07, 5, 4]} />
        <meshStandardMaterial color="#b89840" roughness={0.75} />
        {plantsB.map((p) => (
          <Instance
            key={p.key}
            position={[p.x, 0.22 + p.height * 1.05, p.z]}
            scale={[0.7, 1.6, 0.7]}
            rotation={[p.tilt, 0, p.tilt]}
          />
        ))}
      </Instances>
    </group>
  )
}
