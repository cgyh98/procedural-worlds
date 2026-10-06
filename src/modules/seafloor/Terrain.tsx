import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, Color, Group } from 'three'
import { buildTerrainGeometry } from './terrainGeometry'
import { FLOOR_Y } from './useSeafloor'

// Depth colour ramp (cobalt palette from the cosmos board), from the deepest trench (t = 0) to the highest ridge (t = 1).
// Dark at the bottom, lighter towards the ridges, so the map reads clearly but the
// seafloor still sits in the shadows and lets the glow stand out.
const RAMP = [
  { t: 0.0, color: new Color('#03061a') }, // abyss
  { t: 0.3, color: new Color('#0a1c4a') }, // deep plain (dark cobalt)
  { t: 0.55, color: new Color('#143a7a') }, // slopes
  { t: 0.8, color: new Color('#1f64a8') }, // shallows
  { t: 1.0, color: new Color('#6cc4e4') }, // ridge tops, icy aqua in the moonlight
]

type TerrainProps = {
  heights: Float32Array // normalized to [-1, 1]
  resolution: number
  size: number
  depth: number // height of the relief in world units
  relief: number // target: 1 = 3D terrain, 0 = flat 2D map (animated towards)
  debug: boolean
}

// Turns a heightmap into a 3D mesh (shape from buildTerrainGeometry, plus colours).
//
// The heights stay in [-1, 1] inside the geometry; the group's scale.y stretches them
// to `depth`. That makes the 2D ↔ 3D transition almost free: animating scale.y from
// 1 to 0 squashes the terrain into a flat, coloured map, without rebuilding anything.
export function Terrain({ heights, resolution, size, depth, relief, debug }: TerrainProps) {
  const groupRef = useRef<Group>(null)
  const reliefNow = useRef(relief) // the animated value, chasing the `relief` target

  // Build the mesh data: positions from the heights, plus vertex colours, either the
  // depth ramp or (debug) the raw noise value as grayscale. Rebuilt only when inputs change.
  const geometry = useMemo(() => {
    const geo = buildTerrainGeometry(heights, resolution, size)

    const colors = new Float32Array(heights.length * 3)
    const c = new Color()
    for (let k = 0; k < heights.length; k++) {
      const t = (heights[k] + 1) / 2 // [-1, 1] → [0, 1]
      if (debug) c.setRGB(t, t, t)
      else rampColor(t, c)
      colors[k * 3] = c.r
      colors[k * 3 + 1] = c.g
      colors[k * 3 + 2] = c.b
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    return geo
  }, [heights, resolution, size, debug])

  // Free the old geometry's GPU memory when it's replaced (e.g. while dragging a slider).
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    // Ease towards the target (frame-rate independent smoothing, as for the camera).
    reliefNow.current += (relief - reliefNow.current) * (1 - Math.exp(-3 * Math.min(delta, 0.05)))
    // Never exactly 0: a zero scale breaks the lighting maths (normals can't be inverted).
    group.scale.y = Math.max(reliefNow.current, 0.001) * depth
  })

  return (
    // Sunk below the origin so the open water (plankton, player) sits above it.
    <group ref={groupRef} position={[0, FLOOR_Y, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.95}
          metalness={0}
          // Push the surface back a little so the debug wireframe draws cleanly on top.
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {debug && (
        <mesh geometry={geometry}>
          <meshBasicMaterial color="#ffb347" wireframe transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  )
}

// Find the two ramp stops around t and blend between them.
function rampColor(t: number, out: Color) {
  for (let s = 1; s < RAMP.length; s++) {
    const a = RAMP[s - 1]
    const b = RAMP[s]
    if (t <= b.t) return out.copy(a.color).lerp(b.color, (t - a.t) / (b.t - a.t))
  }
  return out.copy(RAMP[RAMP.length - 1].color)
}
