import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { findModule } from './modules/registry'
import { useWorld } from './store/useWorld'
import { TabBar } from './ui/TabBar'
import { ConceptCard } from './ui/ConceptCard'
import './ui/ui.css'

// The ocean's base colour: almost black, with a hint of blue.
// Used for both the background and the fog so distant things melt into the dark.
const DEEP_OCEAN = '#02040a'

// The app shell. It owns what every tab shares (canvas, background, fog,
// camera controls, debug toggle) and swaps in the active module's scene.
function App() {
  const activeModule = findModule(useWorld((s) => s.activeModuleId))
  const { Scene } = activeModule

  // Shared controls, shown above each module's own sliders.
  // `hint` shows up as a tooltip, one of the class requirements for every control.
  const { debug } = useControls('Scene', {
    debug: { value: true, hint: 'Show the debug layer: the structure behind what you see (grids, values, arrows…)' },
  })

  return (
    <div className="app">
      <TabBar activeId={activeModule.id} />

      {/* <Canvas> creates the three.js renderer, scene and camera for us,
          and runs the render loop every frame. One canvas for the whole app. */}
      <Canvas camera={{ position: [6, 4, 8], fov: 50 }}>
        <color attach="background" args={[DEEP_OCEAN]} />
        {/* Exponential fog: visibility drops off quickly with distance, like light in water. */}
        <fogExp2 attach="fog" args={[DEEP_OCEAN, 0.04]} />

        {/* The active tab. `key` makes React fully unmount the old scene and mount the new one
            when the tab changes, so each module starts clean and its sliders leave the panel. */}
        <Scene key={activeModule.id} debug={debug} />

        {/* Drag to orbit, scroll to zoom. Temporary until the player/camera system exists. */}
        <OrbitControls makeDefault />
      </Canvas>

      <div className="controls">
        <Leva fill />
      </div>

      <ConceptCard key={activeModule.id} module={activeModule} />
    </div>
  )
}

export default App
