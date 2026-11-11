import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useControls } from 'leva'
import { BackSide, Color, FogExp2, Mesh, ShaderMaterial } from 'three'
import { useWorld } from '../../store/useWorld'
import { deepColor, surfaceColor } from './moonLight'
import { GodRays } from './GodRays'
import { Bubbles } from './Bubbles'
import { RevealLight } from './RevealLight'
import { night } from '../../systems/night'

// ─────────────────────────────────────────────────────────────────────────────
// The painted ocean around the dive: a gradient sky-dome under water, fog that takes
// the same colour, god rays and bubbles, all driven by the moon phase.
//
// GRADIENT DOME: a big sphere that follows the camera, seen from inside. Its shader
// colours each pixel by the direction you look: up → the surface colour, down → the
// deep colour. That's the "vertical gradient": bright near the surface, dark below.
//
// FOG: distant things should melt into the water's colour, so each frame the fog takes
// the dome's colour at the horizon. (The shell owns the fog density slider.)
// ─────────────────────────────────────────────────────────────────────────────

const tmpSurface = new Color()
const tmpDeep = new Color()

export function Atmosphere() {
  // Read once (no subscription): play mode writes the moon phase every frame, and a
  // subscription would re-render this component each time.
  const moonPhase = useWorld.getState().moonPhase
  const setMoonPhase = useWorld((s) => s.setMoonPhase)
  const controls = useControls('Moon & atmosphere', {
    moon: {
      label: 'moon phase',
      value: moonPhase, min: 0, max: 1, step: 0.01,
      hint: '0 = new moon, 1 = full moon. New moon: dark water, the glow you make is what you see. Full moon: the water lights up turquoise, god rays appear, and the bioluminescence gets washed out (as in real bays).',
      onChange: (v: number) => setMoonPhase(v),
    },
    darkness: {
      value: 0.85, min: 0, max: 1, step: 0.01,
      hint: 'How dark the night is without the moon. Everything that is lit or glowing on its own (seafloor, caustics, calm plankton, kelp, the water colour) is dimmed by this; the glow YOU cause is not. Resting light = (1 − darkness) at new moon, rising to full at full moon. 0 = no dimming.',
    },
    reveal: {
      label: 'child light',
      value: 1, min: 0, max: 3, step: 0.05,
      hint: 'The moon child\'s own light: it lights the seafloor around her, reaching further the faster she swims. It only shows when the night is dark (it fades as the moon rises), so the world appears where she goes. Line of sight in its simplest form: you see what is near you and lit.',
    },
    rays: { label: 'god rays', value: 1, min: 0, max: 3, step: 0.05, hint: 'Brightness of the light shafts from the surface (they also scale with the moon).' },
    bubbles: { value: 1, min: 0, max: 3, step: 0.05, hint: 'How many bubbles you stir up when you swim (more when faster).' },
  })

  const { scene, camera } = useThree()
  const domeRef = useRef<Mesh>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: { uSurface: { value: new Color() }, uDeep: { value: new Color() } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position); // direction from the dome's centre (= the camera)
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uSurface, uDeep;
          varying vec3 vDir;
          void main() {
            // 0 looking straight down … 1 looking straight up; the curve keeps most of
            // the view deep and brightens quickly near "up", like light from a surface.
            float up = smoothstep(-0.35, 1.0, normalize(vDir).y);
            vec3 col = mix(uDeep, uSurface, up * up);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  // Give the background and fog colours back when the dive scene unmounts (lab tabs keep theirs).
  useEffect(() => {
    const bg = scene.background instanceof Color ? scene.background.clone() : null
    const fogColor = scene.fog ? scene.fog.color.clone() : null
    return () => {
      if (bg && scene.background instanceof Color) scene.background.copy(bg)
      if (fogColor && scene.fog) scene.fog.color.copy(fogColor)
      night.light = 1 // labs without an atmosphere are lit as before
    }
  }, [scene])

  useFrame(() => {
    const moon = useWorld.getState().moonPhase
    // Resting light: (1 − darkness) at new moon, 1 at full moon. moon² instead of moon:
    // a thin moon barely lights the sea; the light really arrives near full moon.
    const darkness = Math.max(controls.darkness, night.minDarkness)
    const light = 1 - darkness * (1 - moon * moon)
    night.light = light
    surfaceColor(moon, tmpSurface)
    deepColor(moon, tmpDeep)
    // The water itself darkens too, but never to pure black (the art direction)
    const water = night.waterFloor + (1 - night.waterFloor) * light
    tmpSurface.multiplyScalar(water)
    tmpDeep.multiplyScalar(water)
    const m = domeRef.current?.material as ShaderMaterial | undefined
    if (m) {
      m.uniforms.uSurface.value.copy(tmpSurface)
      m.uniforms.uDeep.value.copy(tmpDeep)
    }
    domeRef.current?.position.copy(camera.position)
    // Fog = the dome's colour a little above the horizon, so far things melt into the water
    if (scene.fog instanceof FogExp2) scene.fog.color.copy(tmpDeep).lerp(tmpSurface, 0.12)
    if (scene.background instanceof Color) scene.background.copy(tmpDeep)
  })

  return (
    <>
      <mesh ref={domeRef} material={material} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[90, 32, 16]} />
      </mesh>
      <RevealLight strength={controls.reveal} />
      <GodRays strength={controls.rays} />
      <Bubbles amount={controls.bubbles} />
    </>
  )
}
