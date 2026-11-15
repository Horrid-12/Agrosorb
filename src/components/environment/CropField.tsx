import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import type { FieldRect } from './layout'
import { mulberry32 } from './layout'

interface CropFieldProps {
  rect: FieldRect
  seed: number
}

/**
 * One crop field: a grid of low-poly plants rendered with instanced
 * meshes (one draw call per geometry). Slight per-plant variation in
 * scale, tilt and hue keeps the field organic without extra meshes.
 */
export function CropField({ rect, seed }: CropFieldProps) {
  const plants = useMemo(() => {
    const rng = mulberry32(seed)
    const cols = 7
    const rows = 6
    const x0 = rect.xMin + 1
    const x1 = rect.xMax - 1
    const z0 = rect.zMin + 1
    const z1 = rect.zMax - 1
    return Array.from({ length: cols * rows }, (_, i) => {
      const cx = i % cols
      const cz = Math.floor(i / cols)
      const jitter = () => (rng() - 0.5) * 0.4
      return {
        key: i,
        x: x0 + ((x1 - x0) * cx) / (cols - 1) + jitter(),
        z: z0 + ((z1 - z0) * cz) / (rows - 1) + jitter(),
        scale: 0.75 + rng() * 0.55,
        tilt: (rng() - 0.5) * 0.16,
        hue: rng(),
      }
    })
  }, [rect, seed])

  return (
    <group>
      {/* Stems */}
      <Instances limit={plants.length} castShadow>
        <cylinderGeometry args={[0.045, 0.07, 0.55, 5]} />
        <meshStandardMaterial color="#3e6b34" roughness={0.9} />
        {plants.map((p) => (
          <Instance
            key={p.key}
            position={[p.x, 0.5, p.z]}
            scale={[1, p.scale, 1]}
            rotation={[p.tilt, 0, p.tilt]}
          />
        ))}
      </Instances>

      {/* Leaf heads — two alternating greens (one draw call per group) */}
      <Instances limit={plants.length} castShadow>
        <coneGeometry args={[0.32, 0.62, 6]} />
        <meshStandardMaterial color="#76a85b" roughness={0.85} />
        {plants
          .filter((p) => p.hue > 0.5)
          .map((p) => (
            <Instance key={p.key} position={[p.x, 1.05 * p.scale, p.z]} scale={p.scale} rotation={[p.tilt * 2, p.hue * 3, p.tilt * 2]} />
          ))}
      </Instances>
      <Instances limit={plants.length} castShadow>
        <coneGeometry args={[0.32, 0.62, 6]} />
        <meshStandardMaterial color="#61914a" roughness={0.85} />
        {plants
          .filter((p) => p.hue <= 0.5)
          .map((p) => (
            <Instance key={p.key} position={[p.x, 1.05 * p.scale, p.z]} scale={p.scale} rotation={[p.tilt * 2, p.hue * 3, p.tilt * 2]} />
          ))}
      </Instances>
    </group>
  )
}
