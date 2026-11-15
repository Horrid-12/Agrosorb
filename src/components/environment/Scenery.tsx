import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { LAYOUT, mulberry32 } from './layout'

/**
 * Environmental dressing: instanced low-poly trees, scattered rocks and
 * a small barn. Everything is procedural — no external model files.
 */
export function Scenery() {
  const trees = useMemo(() => {
    const rng = mulberry32(42)
    const spots: Array<{ x: number; z: number; s: number }> = []
    // Back edge (north) and right edge (east), avoiding fields/channels.
    for (let i = 0; i < 14; i++) {
      spots.push({ x: -30 + rng() * 64, z: -36 + rng() * 4, s: 0.8 + rng() * 0.7 })
    }
    for (let i = 0; i < 8; i++) {
      spots.push({ x: 30 + rng() * 6, z: -30 + rng() * 58, s: 0.8 + rng() * 0.7 })
    }
    // A cluster near the river bank.
    for (let i = 0; i < 5; i++) {
      spots.push({ x: -29 - rng() * 2, z: -20 + i * 8 + rng() * 3, s: 0.9 + rng() * 0.6 })
    }
    return spots
  }, [])

  const rocks = useMemo(() => {
    const rng = mulberry32(99)
    return Array.from({ length: 12 }, () => ({
      x: -34 + rng() * 66,
      z: -34 + rng() * 66,
      s: 0.25 + rng() * 0.45,
      rot: rng() * Math.PI,
    })).filter((r) => {
      const inField = (f: { xMin: number; xMax: number; zMin: number; zMax: number }) =>
        r.x > f.xMin - 1 && r.x < f.xMax + 1 && r.z > f.zMin - 1 && r.z < f.zMax + 1
      return !Object.values(LAYOUT.fields).some(inField) && Math.hypot(r.x - LAYOUT.station.x, r.z - LAYOUT.station.z) > 8
    })
  }, [])

  return (
    <group>
      {/* Tree trunks */}
      <Instances limit={trees.length} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 1.3, 5]} />
        <meshStandardMaterial color="#6b4a2e" roughness={1} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 0.65 * t.s, t.z]} scale={t.s} />
        ))}
      </Instances>

      {/* Foliage — two stacked cones per tree */}
      <Instances limit={trees.length * 2} castShadow>
        <coneGeometry args={[0.85, 1.5, 6]} />
        <meshStandardMaterial color="#244d35" roughness={0.9} flatShading />
        {trees.map((t, i) => (
          <Instance key={`a${i}`} position={[t.x, (1.3 + 0.75) * t.s, t.z]} scale={[t.s, t.s * 1.1, t.s]} rotation={[0, i * 0.7, 0]} />
        ))}
        {trees.map((t, i) => (
          <Instance key={`b${i}`} position={[t.x, (1.3 + 1.65) * t.s, t.z]} scale={[t.s * 0.66, t.s * 0.8, t.s * 0.66]} rotation={[0, i * 1.3, 0]} />
        ))}
      </Instances>

      {/* Rocks */}
      <Instances limit={rocks.length} castShadow>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#8d8578" roughness={1} flatShading />
        {rocks.map((r, i) => (
          <Instance key={i} position={[r.x, r.s * 0.3, r.z]} scale={[r.s, r.s * 0.65, r.s]} rotation={[r.rot, r.rot * 2, 0]} />
        ))}
      </Instances>

      <Barn position={[LAYOUT.barn.x, 0, LAYOUT.barn.z]} />
    </group>
  )
}

function Barn({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -0.4, 0]}>
      <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[5, 2.2, 3.6]} />
        <meshStandardMaterial color="#a34a3c" roughness={0.9} />
      </mesh>
      {/* Pyramid roof */}
      <mesh castShadow position={[0, 3, 0]}>
        <coneGeometry args={[4.1, 1.8, 4]} />
        <meshStandardMaterial color="#5d4029" roughness={0.9} flatShading />
      </mesh>
      {/* Doors */}
      <mesh position={[0, 0.8, 1.85]}>
        <boxGeometry args={[1.8, 1.6, 0.12]} />
        <meshStandardMaterial color="#6b4a2e" roughness={1} />
      </mesh>
      {/* Silo */}
      <mesh castShadow position={[3.4, 1.4, -1.4]}>
        <cylinderGeometry args={[0.7, 0.7, 2.8, 10]} />
        <meshStandardMaterial color="#c9c2b2" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[3.4, 3, -1.4]}>
        <sphereGeometry args={[0.7, 10, 6]} />
        <meshStandardMaterial color="#8f887b" roughness={0.8} />
      </mesh>
    </group>
  )
}
