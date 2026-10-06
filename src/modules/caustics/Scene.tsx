import type { ModuleSceneProps } from '../types'
import { useSeafloor } from '../seafloor/useSeafloor'
import { SeafloorView } from '../seafloor/Scene'
import { CausticsLayer } from './CausticsLayer'
import { useCaustics } from './useCaustics'

// The Caustics tab: the bare seafloor (no kelp, so the light is easy to see) + caustics.
// Debug here shows the shader's Worley cells, not the terrain wireframe.
export function CausticsScene({ debug }: ModuleSceneProps) {
  const seafloor = useSeafloor()
  const settings = useCaustics()
  return (
    <>
      <SeafloorView seafloor={seafloor} debug={false} />
      <CausticsLayer seafloor={seafloor} settings={settings} debug={debug} />
    </>
  )
}

// What the caustics add to the World: just the light layer, on the World's seafloor.
export function CausticsWorldLayer() {
  const seafloor = useSeafloor()
  const settings = useCaustics()
  return <CausticsLayer seafloor={seafloor} settings={settings} debug={false} />
}
