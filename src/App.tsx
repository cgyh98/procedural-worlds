import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls } from 'leva'

// The ocean's base colour: almost black, with a hint of blue.
// Used for both the background and the fog so distant things melt into the dark.
const DEEP_OCEAN = '#02040a'

function App() {
  // leva builds a slider/toggle panel from this object automatically.
  // `hint` shows up as a tooltip, one of the class requirements for every control.
  const { debug } = useControls('Scene', {
    debug: { value: true, hint: 'Show helper geometry (grid + axes) that explains the scene structure' },
  })

  return (
    // <Canvas> creates the three.js renderer, scene and camera for us,
    // and runs the render loop every frame.
    <Canvas camera={{ position: [6, 4, 8], fov: 50 }}>
      <color attach="background" args={[DEEP_OCEAN]} />
      {/* Exponential fog: visibility drops off quickly with distance, like light in water. */}
      <fogExp2 attach="fog" args={[DEEP_OCEAN, 0.04]} />

      {/* Debug layer: only rendered when the toggle is on. React adds/removes it for us. */}
      {debug && (
        <>
          <gridHelper args={[20, 20, '#1f4a6b', '#0d2235']} />
          <axesHelper args={[2]} />
        </>
      )}

      {/* Drag to orbit, scroll to zoom. Temporary until the player/camera system exists. */}
      <OrbitControls makeDefault />
    </Canvas>
  )
}

export default App
