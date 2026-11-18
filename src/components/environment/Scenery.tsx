import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { LAYOUT, mulberry32 } from './layout'

/**
 * Environmental dressing: a dense jungle of instanced low-poly trees
 * spreading across the entire horizon, scattered rocks and a small barn.
 * Trees avoid the core field / channel / station area but fill every
 * other direction so the farm feels carved out of tropical woodland.
 */
export function Scenery() {
  const trees = useMemo(() => {
    const rng = mulberry32(42)
    const spots: Array<{ x: number; z: number; s: number }> = []

    // ── Core exclusion zone (fields + channels + station area) ──
    const coreXMin = -8
    const coreXMax = 28
    const coreZMin = -28
    const coreZMax = 24

    const isInCore = (x: number, z: number) =>
      x > coreXMin && x < coreXMax && z > coreZMin && z < coreZMax

    // Also keep trees out of the river corridor
    const isInRiver = (x: number) => x > LAYOUT.river.xMin - 2 && x < LAYOUT.river.xMax + 2

    // ── Dense ring of trees around the core area (nearby jungle) ──
    for (let i = 0; i < 60; i++) {
      const angle = rng() * Math.PI * 2
      const dist = 28 + rng() * 22
      const x = 5 + Math.cos(angle) * dist
      const z = -2 + Math.sin(angle) * dist
      if (!isInCore(x, z) && !isInRiver(x)) {
        spots.push({ x, z, s: 0.8 + rng() * 0.9 })
      }
    }

    // ── Mid-distance tree belt (fills the middle ground) ──
    for (let i = 0; i < 80; i++) {
      const angle = rng() * Math.PI * 2
      const dist = 45 + rng() * 35
      const x = 2 + Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      if (!isInRiver(x)) {
        spots.push({ x, z, s: 0.7 + rng() * 1.0 })
      }
    }

    // ── Far horizon trees (all directions, dense enough to read as forest) ──
    for (let i = 0; i < 120; i++) {
      const angle = rng() * Math.PI * 2
      const dist = 70 + rng() * 60
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      if (!isInRiver(x)) {
        spots.push({ x, z, s: 0.6 + rng() * 1.1 })
      }
    }

    // ── River-bank trees running alongside the river ──
    for (let i = 0; i < 20; i++) {
      const z = -90 + rng() * 180
      const side = rng() > 0.5 ? LAYOUT.river.xMin - 3 - rng() * 4 : LAYOUT.river.xMax + 2 + rng() * 4
      spots.push({ x: side, z, s: 0.85 + rng() * 0.65 })
    }

    // ── Fill gaps: cardinal direction clusters ──
    // South
    for (let i = 0; i < 25; i++) {
      const x = -50 + rng() * 100
      const z = 35 + rng() * 60
      if (!isInCore(x, z) && !isInRiver(x)) {
        spots.push({ x, z, s: 0.7 + rng() * 0.8 })
      }
    }
    // North
    for (let i = 0; i < 25; i++) {
      const x = -50 + rng() * 100
      const z = -35 - rng() * 60
      if (!isInRiver(x)) {
        spots.push({ x, z, s: 0.7 + rng() * 0.8 })
      }
    }
    // East
    for (let i = 0; i < 20; i++) {
      const x = 35 + rng() * 60
      const z = -60 + rng() * 120
      spots.push({ x, z, s: 0.7 + rng() * 0.8 })
    }
    // West (beyond river)
    for (let i = 0; i < 20; i++) {
      const x = LAYOUT.river.xMin - 6 - rng() * 50
      const z = -60 + rng() * 120
      spots.push({ x, z, s: 0.7 + rng() * 0.8 })
    }

    return spots
  }, [])

  const rocks = useMemo(() => {
    const rng = mulberry32(99)
    return Array.from({ length: 18 }, () => ({
      x: -50 + rng() * 100,
      z: -50 + rng() * 100,
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

      {/* Foliage — two stacked cones per tree (tropical green) */}
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

      {/* Accent foliage — slightly lighter green canopy tops for variety */}
      <Instances limit={trees.length}>
        <coneGeometry args={[0.6, 1.0, 5]} />
        <meshStandardMaterial color="#3a6b4a" roughness={0.85} flatShading />
        {trees
          .filter((_, i) => i % 3 === 0)
          .map((t, i) => (
            <Instance key={`c${i}`} position={[t.x, (1.3 + 2.2) * t.s, t.z]} scale={[t.s * 0.5, t.s * 0.65, t.s * 0.5]} rotation={[0, i * 2.1, 0]} />
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
