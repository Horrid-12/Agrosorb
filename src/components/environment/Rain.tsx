import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimulationStore } from '@/stores/simulationStore'

const DROP_COUNT = 900
const AREA = { xMin: -38, xMax: 38, zMin: -38, zMax: 36, height: 26 }

/**
 * Rainfall rendered as a single THREE.Points cloud. Drop positions are
 * updated on the GPU-side buffer each frame; intensity controls both
 * opacity and fall speed, so light drizzle reads differently from storm.
 */
export function Rain() {
  const rainIntensity = useSimulationStore((s) => s.rainIntensity)
  const phase = useSimulationStore((s) => s.phase)

  const pointsRef = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.PointsMaterial>(null)

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(DROP_COUNT * 3)
    const speeds = new Float32Array(DROP_COUNT)
    for (let i = 0; i < DROP_COUNT; i++) {
      positions[i * 3] = AREA.xMin + Math.random() * (AREA.xMax - AREA.xMin)
      positions[i * 3 + 1] = Math.random() * AREA.height
      positions[i * 3 + 2] = AREA.zMin + Math.random() * (AREA.zMax - AREA.zMin)
      speeds[i] = 18 + Math.random() * 10
    }
    return { positions, speeds }
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    // Rain only falls while a weather phase is active — stopping rain
    // (phase 'idle') silences the sky even if the slider is still high.
    const active = phase === 'raining' || phase === 'runoff'
    const stormBoost = phase === 'runoff' ? 1.35 : 1
    const speed = active ? (0.35 + rainIntensity) * stormBoost : 0

    if (pointsRef.current) {
      const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < DROP_COUNT; i++) {
        arr[i * 3 + 1] -= speeds[i] * speed * dt
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = AREA.height
          arr[i * 3] = AREA.xMin + Math.random() * (AREA.xMax - AREA.xMin)
          arr[i * 3 + 2] = AREA.zMin + Math.random() * (AREA.zMax - AREA.zMin)
        }
      }
      attr.needsUpdate = true
    }

    if (matRef.current) {
      const targetOpacity = !active || rainIntensity <= 0.01 ? 0 : 0.15 + rainIntensity * 0.45
      matRef.current.opacity += (targetOpacity - matRef.current.opacity) * Math.min(1, dt * 4)
      pointsRef.current!.visible = matRef.current.opacity > 0.02
    }
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        color="#4299c7"
        size={0.22}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </points>
  )
}
