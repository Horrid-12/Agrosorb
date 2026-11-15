import { useMemo } from 'react'
import { LAYOUT, mulberry32 } from './layout'

/**
 * Low-poly terrain: a solid ground slab (so the edges read like a
 * diorama), raised soil beds under each crop field, sand paths and
 * back-edge plateaus for silhouette variety.
 *
 * All geometry is static boxes — cheap to render, easy to shadow.
 */
export function Terrain() {
  const { fields } = LAYOUT

  const plateaus = useMemo(() => {
    const rng = mulberry32(7)
    return Array.from({ length: 6 }, (_, i) => ({
      key: i,
      x: i < 3 ? -34 + i * 6 : 24 + (i - 3) * 7,
      z: i < 3 ? -30 + rng() * 8 : 26 + rng() * 6,
      w: 8 + rng() * 5,
      d: 6 + rng() * 4,
      h: 1.4 + rng() * 1.6,
      rot: rng() * Math.PI,
    }))
  }, [])

  return (
    <group>
      {/* Ground slab — soil sides give the diorama edge look */}
      <mesh receiveShadow position={[0, -1.1, 0]}>
        <boxGeometry args={[LAYOUT.groundSize, 2.2, LAYOUT.groundSize]} />
        <meshStandardMaterial color="#6d4b31" roughness={1} />
      </mesh>
      {/* Grass surface */}
      <mesh receiveShadow position={[0, 0.001, 0]}>
        <boxGeometry args={[LAYOUT.groundSize, 0.06, LAYOUT.groundSize]} />
        <meshStandardMaterial color="#6f9c53" roughness={0.95} />
      </mesh>

      {/* Soil beds under crop fields */}
      {Object.entries(fields).map(([key, f]) => (
        <mesh
          key={key}
          receiveShadow
          castShadow
          position={[(f.xMin + f.xMax) / 2, 0.1, (f.zMin + f.zMax) / 2]}
        >
          <boxGeometry args={[f.xMax - f.xMin, 0.24, f.zMax - f.zMin]} />
          <meshStandardMaterial color="#5d4029" roughness={1} />
        </mesh>
      ))}

      {/* Sand path from the front edge to the filtration station */}
      <mesh receiveShadow position={[10, 0.03, 27]}>
        <boxGeometry args={[3.4, 0.1, 12]} />
        <meshStandardMaterial color="#c9b489" roughness={1} />
      </mesh>
      <mesh receiveShadow position={[13.5, 0.03, 19.6]}>
        <boxGeometry args={[8, 0.1, 2.4]} />
        <meshStandardMaterial color="#c9b489" roughness={1} />
      </mesh>

      {/* Back-edge plateaus with grass caps */}
      {plateaus.map((p) => (
        <group key={p.key} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
          <mesh receiveShadow castShadow position={[0, p.h / 2, 0]}>
            <boxGeometry args={[p.w, p.h, p.d]} />
            <meshStandardMaterial color="#6d4b31" roughness={1} />
          </mesh>
          <mesh receiveShadow position={[0, p.h + 0.03, 0]}>
            <boxGeometry args={[p.w + 0.3, 0.1, p.d + 0.3]} />
            <meshStandardMaterial color="#5c8a47" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
