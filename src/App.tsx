import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Leva, useControls } from 'leva'
import { findModule } from './modules/registry'
import { useWorld } from './store/useWorld'
import { TabBar } from './ui/TabBar'
import { ConceptCard } from './ui/ConceptCard'
import './ui/ui.css'

// The ocean's base colour: almost black, with a hint of blue.
// Used for both the background and the fog so distant things melt into the dark.
const DEEP_OCEAN = '#02040a'

// Where the camera starts on tabs that don't specify their own.
const DEFAULT_CAMERA: [number, number, number] = [11, 7, 15]

// The app shell. It owns what every tab shares (canvas, background, fog,
// camera controls, debug toggle) and swaps in the active module's scene.
function App() {
  const activeModule = findModule(useWorld((s) => s.activeModuleId))
  const { Scene } = activeModule

  // Shared controls, shown above each module's own sliders.
  // `hint` shows up as a tooltip, one of the class requirements for every control.
  const { debug, fog } = useControls('Scene', {
    debug: { value: true, hint: 'Show the debug layer: the structure behind what you see (grids, values, arrows…)' },
    fog: {
      label: 'fog density',
      value: 0.025, min: 0, max: 0.1, step: 0.001,
      hint: 'Exponential fog (fogExp2): how quickly things fade into the dark with distance, like light in deep water. Visibility ≈ e^(−(density × distance)²).',
    },
  })

  // Bloom is how all glow in the project is made: bright pixels get blurred and added
  // back on top of the image, so they bleed light into their surroundings.
  // Much cheaper than a real light per organism.
  const glow = useControls('Glow', {
    intensity: { value: 1.5, min: 0, max: 5, step: 0.05, hint: 'Bloom strength: how much bright things bleed light around them.' },
    threshold: {
      value: 0.8, min: 0, max: 2, step: 0.01,
      hint: 'Only pixels brighter than this glow. Raise it so only the most stirred-up plankton bloom.',
    },
  })

  return (
    <div className="app">
      <TabBar activeId={activeModule.id} />

      {/* <Canvas> creates the three.js renderer, scene and camera for us,
          and runs the render loop every frame. One canvas for the whole app. */}
      <Canvas camera={{ position: DEFAULT_CAMERA, fov: 50 }}>
        <color attach="background" args={[DEEP_OCEAN]} />
        {/* Exponential fog: visibility drops off quickly with distance, like light in water. */}
        <fogExp2 attach="fog" args={[DEEP_OCEAN, 0.025]} density={fog} />

        {/* Put the camera at the tab's starting point whenever the tab changes. */}
        <CameraStart key={`camera-${activeModule.id}`} position={activeModule.camera ?? DEFAULT_CAMERA} />

        {/* The active tab. `key` makes React fully unmount the old scene and mount the new one
            when the tab changes, so each module starts clean and its sliders leave the panel. */}
        <Scene key={`scene-${activeModule.id}`} debug={debug} />

        {/* Drag to orbit, scroll to zoom, unless the tab drives the camera itself (the player). */}
        {/* Keyed by tab so its orbit target resets to the origin on every switch. */}
        {!activeModule.controlsCamera && <OrbitControls key={`orbit-${activeModule.id}`} makeDefault />}

        {/* Post-processing: runs after the scene is drawn, on the finished image. */}
        <EffectComposer>
          <Bloom mipmapBlur intensity={glow.intensity} luminanceThreshold={glow.threshold} luminanceSmoothing={0.2} />
        </EffectComposer>
      </Canvas>

      <div className="controls">
        <Leva fill />
      </div>

      <ConceptCard key={activeModule.id} module={activeModule} />
    </div>
  )
}

// Moves the camera to a starting position and points it at the origin, once, on mount.
// (Keyed by tab id above, so it runs again on every tab switch.)
function CameraStart({ position }: { position: [number, number, number] }) {
  const get = useThree((s) => s.get)
  // Depend on the three numbers, not the array: the array is new on every render,
  // which would snap the camera back whenever any slider changes.
  const [x, y, z] = position
  useEffect(() => {
    const { camera } = get()
    camera.position.set(x, y, z)
    camera.lookAt(0, 0, 0)
  }, [get, x, y, z])
  return null
}

export default App
