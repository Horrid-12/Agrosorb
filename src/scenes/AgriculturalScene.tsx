import { Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { CropField } from '@/components/environment/CropField'
import { Channels } from '@/components/environment/Channels'
import { FiltrationStation } from '@/components/environment/FiltrationStation'
import { Rain } from '@/components/environment/Rain'
import { Scenery } from '@/components/environment/Scenery'
import { Terrain } from '@/components/environment/Terrain'
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
      camera={{ position: [30, 24, 34], fov: 38, near: 0.5, far: 300 }}
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
      <color attach="background" args={['#b9d9e8']} />
      <fog attach="fog" args={['#b9d9e8', 60, 200]} />

      <Suspense fallback={null}>
        <Lighting />
        <TreatmentDriver />
        <Terrain />
        <CropField rect={LAYOUT.fields.A} seed={11} />
        <CropField rect={LAYOUT.fields.B} seed={23} />
        <CropField rect={LAYOUT.fields.C} seed={37} />
        <Channels />
        <Scenery />
        <FiltrationStation />
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

/** Atmospheric lighting: warm sun, sky bounce, soft shadows. */
function Lighting() {
  return (
    <>
      <hemisphereLight args={['#b9d9e8', '#795438', 0.85]} />
      <directionalLight
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
      <ambientLight intensity={0.25} />
      <Sky distance={4000} sunPosition={[24, 18, 14]} turbidity={7} rayleigh={2.4} />
    </>
  )
}
