import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { ModuleSceneProps } from '../types'
import { player } from '../../systems/player'
import { useSeafloor, type Seafloor } from './useSeafloor'
import { Terrain } from './Terrain'

export function SeafloorScene({ debug }: ModuleSceneProps) {
  const seafloor = useSeafloor()
  return <SeafloorView seafloor={seafloor} debug={debug} />
}

// Draws a seafloor (terrain + its lights). Separate from the hook so tabs that build
// on the seafloor can call useSeafloor() once and share the result.
export function SeafloorView({ seafloor, debug }: { seafloor: Seafloor; debug: boolean }) {
  return (
    <>
      {/* Moonlight from above plus a dim blue ambient. Only lit (standard) materials
          like the terrain use these; the glowing plankton don't need light. */}
      <directionalLight position={[12, 20, 6]} intensity={1.6} color="#b8c8ff" />
      <ambientLight intensity={0.25} color="#3a5a80" />

      <Terrain
        heights={seafloor.heights}
        resolution={seafloor.resolution}
        size={seafloor.size}
        depth={seafloor.depth}
        relief={seafloor.is2D ? 0 : 1}
        debug={debug}
      />
      <MapViewCamera is2D={seafloor.is2D} />
    </>
  )
}

// Camera positions for the two views: straight overhead for the 2D map (the tiny z
// keeps lookAt from flipping when looking exactly down), angled for the 3D relief.
const MAP_VIEW = new Vector3(0, 42, 0.001)
const RELIEF_VIEW = new Vector3(0, 20, 30)

// When the view switches, fly the camera to match while the terrain flattens or rises:
// top-down for the map, angled for the relief. Stops once it arrives, so you can orbit
// freely again. Skipped when a player is driving the camera (World tab).
function MapViewCamera({ is2D }: { is2D: boolean }) {
  const flying = useRef(false)
  const firstRun = useRef(true)

  useEffect(() => {
    // Don't fly on mount in 3D: the tab's own starting camera handles that.
    if (firstRun.current) {
      firstRun.current = false
      if (!is2D) return
    }
    flying.current = true
  }, [is2D])

  useFrame(({ camera }, delta) => {
    if (!flying.current || player.active) return
    const target = is2D ? MAP_VIEW : RELIEF_VIEW
    camera.position.lerp(target, 1 - Math.exp(-3 * Math.min(delta, 0.05)))
    camera.lookAt(0, 0, 0) // the orbit controls' target
    if (camera.position.distanceTo(target) < 0.05) flying.current = false
  })

  return null
}
