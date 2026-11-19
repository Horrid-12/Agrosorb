import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimulationStore } from '@/stores/simulationStore'
import { nightFactor, sunElevation } from './daylight'

/**
 * Horizon haze colour, shared with the scene fog and the fallback canvas
 * background so terrain fades into the dome seamlessly.
 */
export const SKY_HORIZON = '#d9ebf2'

/**
 * Sky dome radius. Kept safely inside the camera's far plane (300) even
 * at the maximum orbit distance, so the dome can never be clipped away
 * and leave a blank background.
 */
const RADIUS = 180

const ZENITH = '#4a86bd'
const GROUND = '#a8c4d2'
const OVERCAST = '#93a3a8'
const NIGHT_HORIZON = '#203043'

const HORIZON_COLOR = new THREE.Color(SKY_HORIZON)
const OVERCAST_COLOR = new THREE.Color(OVERCAST)
const NIGHT_HORIZON_COLOR = new THREE.Color(NIGHT_HORIZON)

const VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uOvercast;
  uniform float uStorm;
  uniform float uNight;
  uniform float uDusk;
  varying vec3 vWorldPos;

  void main() {
    // View direction from the camera — the gradient follows the eye, so
    // the horizon line stays correct while orbiting.
    vec3 dir = normalize(vWorldPos - cameraPosition);
    float h = dir.y;

    vec3 col = h >= 0.0
      ? mix(uHorizon, uZenith, pow(min(h, 1.0), 0.55))
      : mix(uHorizon, uGround, pow(min(-h, 1.0), 0.45));

    // Overcast: rainfall drains the blue and flattens the gradient.
    col = mix(col, uOvercast, uStorm * 0.5);

    // Warm band above the horizon around sunrise / sunset.
    col = mix(col, vec3(0.82, 0.42, 0.24), uDusk * 0.32);

    // Night: deep blue dome with a darker ground half.
    vec3 nightCol = h >= 0.0
      ? mix(vec3(0.11, 0.17, 0.26), vec3(0.03, 0.06, 0.12), pow(min(h, 1.0), 0.55))
      : mix(vec3(0.11, 0.17, 0.26), vec3(0.04, 0.07, 0.11), pow(min(-h, 1.0), 0.45));
    col = mix(col, nightCol, uNight);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

/**
 * Art-directed gradient sky.
 *
 * Replaces drei's `<Sky>` (Preetham scattering), whose near/below-horizon
 * band renders almost white — at the default camera pitch that band fills
 * the whole visible sky and reads as a blank page. This dome instead uses
 * an explicit three-stop gradient: blue overhead, pale haze at the
 * horizon and muted blue-grey below it, deepening toward overcast as the
 * rainfall slider rises and toward night as the time-of-day clock moves.
 *
 * The uniform update runs in `useFrame` reading the store directly, so
 * dragging the rain slider or the clock never re-renders React.
 */
export function SkyBackdrop() {
  const scene = useThree((s) => s.scene)
  const material = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color(ZENITH) },
      uHorizon: { value: new THREE.Color(SKY_HORIZON) },
      uGround: { value: new THREE.Color(GROUND) },
      uOvercast: { value: new THREE.Color(OVERCAST) },
      uStorm: { value: 0 },
      uNight: { value: 0 },
      uDusk: { value: 0 },
    }),
    [],
  )

  useFrame((_, rawDt) => {
    const mat = material.current
    if (!mat) return
    const dt = Math.min(rawDt, 0.1)
    const state = useSimulationStore.getState()
    const rain = state.rainIntensity
    const storm = mat.uniforms.uStorm.value + (rain - mat.uniforms.uStorm.value) * Math.min(1, dt * 2)
    mat.uniforms.uStorm.value = storm

    const night = nightFactor(state.timeOfDay)
    mat.uniforms.uNight.value += (night - mat.uniforms.uNight.value) * Math.min(1, dt * 2)

    // Dusk glow peaks while the sun sits near the horizon.
    const duskTarget = Math.max(0, 1 - Math.abs(sunElevation(state.timeOfDay)) * 5) * (1 - night * 0.5)
    mat.uniforms.uDusk.value += (duskTarget - mat.uniforms.uDusk.value) * Math.min(1, dt * 2)

    // Keep the fog in step with the dome so distant terrain dissolves
    // into the same haze instead of a hard silhouette.
    if (scene.fog) {
      scene.fog.color
        .copy(HORIZON_COLOR)
        .lerp(OVERCAST_COLOR, storm * 0.4)
        .lerp(NIGHT_HORIZON_COLOR, mat.uniforms.uNight.value * 0.85)
    }
  })

  return (
    <mesh scale={RADIUS} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 20]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
