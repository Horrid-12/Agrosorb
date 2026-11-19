import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { DirectionalLight, HemisphereLight, AmbientLight } from 'three'
import { CropField } from '@/components/environment/CropField'
import { Channels } from '@/components/environment/Channels'
import { FiltrationStation } from '@/components/environment/FiltrationStation'
import { Rain } from '@/components/environment/Rain'
import { Scenery } from '@/components/environment/Scenery'
import { SkyBackdrop, SKY_HORIZON } from '@/components/environment/SkyBackdrop'
import { Terrain } from '@/components/environment/Terrain'
import { Clouds } from '@/components/environment/Clouds'
import { Erosion } from '@/components/environment/Erosion'
import { WaterParticles } from '@/components/environment/WaterParticles'
import { AlgaeBloom } from '@/components/environment/AlgaeBloom'
import { Overflow } from '@/components/environment/Overflow'
import { dayFactor, sunElevation } from '@/components/environment/daylight'
import { LAYOUT } from '@/components/environment/layout'
import { useSimulationStore } from '@/stores/simulationStore'

interface AgriculturalSceneProps {
  /** In menu mode the camera slowly orbits and HUD labels are hidden. */
  mode?: 'menu' | 'sim'
}

/**
 * The main 3D experience: an agricultural diorama with crop fields,
 * runoff channels, a river, dynamic rainfall and the interactive
 * filtration station. In `menu` mode it doubles as the animated landing
 * backdrop (slow auto-orbit, no interactive labels).
 */
export default function AgriculturalScene({ mode = 'sim' }: AgriculturalSceneProps) {
  const setPanel = useSimulationStore((s) => s.setPanel)
  const setStationInspecting = useSimulationStore((s) => s.setStationInspecting)

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [30, 24, 34], fov: 38, near: 0.5, far: 500 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        // Allow three.js to restore rendering after a driver-level context
        // loss instead of cascading errors.
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          console.warn('[AgroSorb] WebGL context lost — attempting recovery…')
        })
        gl.domElement.addEventListener('webglcontextrestored', () => {
          console.info('[AgroSorb] WebGL context restored.')
        })
      }}
      onPointerMissed={() => {
        if (mode === 'sim') {
          setPanel(null)
          setStationInspecting(false)
        }
      }}
    >
      {/* Fallback clear colour (the dome covers it) + fog matched to the
          sky's horizon band so the terrain edge dissolves into haze. */}
      <color attach="background" args={[SKY_HORIZON]} />
      <fog attach="fog" args={[SKY_HORIZON, 70, 150]} />
      <SkyBackdrop />
      <Clouds />

      <Suspense fallback={null}>
        <Lighting />
        <TreatmentDriver />
        <Terrain />
        <Erosion />
        <CropField rect={LAYOUT.fields.A} seed={11} cropType="wheat" />
        <CropField rect={LAYOUT.fields.B} seed={23} cropType="cabbage" />
        <CropField rect={LAYOUT.fields.C} seed={37} cropType="corn" />
        <Channels />
        <WaterParticles />
        <AlgaeBloom />
        <Scenery />
        <FiltrationStation />
        <Overflow />
        <Rain />
      </Suspense>

      <OrbitControls
        target={[4, 0, 2]}
        enableDamping
        dampingFactor={0.08}
        minDistance={14}
        maxDistance={85}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.25}
        autoRotate={mode === 'menu'}
        autoRotateSpeed={0.5}
        enablePan={mode === 'sim'}
        panSpeed={0.6}
      />
    </Canvas>
  )
}

/**
 * Frame driver for the treatment state machine. Lives inside the Canvas
 * so `useFrame` can advance the store's visual treatment sequence; all
 * logic stays in the store, this is just the heartbeat.
 */
function TreatmentDriver() {
  const advanceTreatment = useSimulationStore((s) => s.advanceTreatment)
  useFrame((_, dt) => advanceTreatment(Math.min(dt, 0.1)))
  return null
}

/**
 * Atmospheric lighting driven by the simulated time of day and storm
 * intensity. The sun tracks an arc from sunrise to sunset; after dark the
 * key light becomes a cool moon fill. Cloud cover from rainfall dims and
 * desaturates the whole scene. Everything is updated imperatively in
 * `useFrame` — no React re-renders while the clock or rain slider moves.
 */
function Lighting() {
  const sun = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const ambient = useRef<AmbientLight>(null)

  const palette = useMemo(
    () => ({
      sunDay: new THREE.Color('#fff4de'),
      sunDusk: new THREE.Color('#ffb070'),
      moon: new THREE.Color('#9fb8e8'),
      hemiSkyDay: new THREE.Color('#b9d9e8'),
      hemiSkyNight: new THREE.Color('#2a3a4e'),
      hemiGroundDay: new THREE.Color('#795438'),
      hemiGroundNight: new THREE.Color('#241f1a'),
      scratch: new THREE.Color(),
    }),
    [],
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useSimulationStore.getState()
    const day = dayFactor(s.timeOfDay)
    const night = 1 - day
    const elev = sunElevation(s.timeOfDay)
    const angle = ((s.timeOfDay - 6) / 12) * Math.PI
    const storming = s.phase === 'raining' || s.phase === 'runoff'
    const cover = storming ? 1 - s.rainIntensity * 0.55 : 1

    if (sun.current) {
      const height = Math.max(3, elev * 46 + 3)
      sun.current.position.set(Math.cos(angle) * 42, height, 16)
      sun.current.intensity = (0.16 + day * 1.95) * cover
      // Warm at the horizon, neutral at noon, cool moonlight at night.
      const dusk = Math.max(0, 1 - Math.abs(elev) * 4.5)
      palette.scratch
        .copy(palette.sunDay)
        .lerp(palette.sunDusk, dusk * 0.85)
        .lerp(palette.moon, night)
      sun.current.color.copy(palette.scratch)
    }

    if (hemi.current) {
      palette.scratch.copy(palette.hemiSkyDay).lerp(palette.hemiSkyNight, night)
      hemi.current.color.lerp(palette.scratch, Math.min(1, dt * 2.5))
      palette.scratch.copy(palette.hemiGroundDay).lerp(palette.hemiGroundNight, night)
      hemi.current.groundColor.lerp(palette.scratch, Math.min(1, dt * 2.5))
      hemi.current.intensity = (0.32 + day * 0.62) * (0.7 + cover * 0.3)
    }

    if (ambient.current) {
      ambient.current.intensity = 0.12 + day * 0.16 + night * 0.06
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#b9d9e8', '#795438', 0.85]} />
      <directionalLight
        ref={sun}
        castShadow
        position={[24, 36, 14]}
        intensity={1.9}
        color="#fff4de"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-bias={-0.0004}
      />
      <ambientLight ref={ambient} intensity={0.25} />
    </>
  )
}
