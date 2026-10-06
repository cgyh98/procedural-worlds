import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, Group, LineSegments, Vector3, type BufferAttribute } from 'three'
import { player } from '../../systems/player'
import type { VectorField } from './fields'
import type { SimClock } from './Scene'

type FieldArrowsProps = {
  field: VectorField
  clock: RefObject<SimClock>
  boxSize: number
  resolution: number // arrows per side (resolution³ arrows in total)
  strength: number
}

// Debug layer: makes the invisible vector field visible.
//
// We sample the field on a regular 3D grid and draw one line per grid point,
// pointing where the water flows there, longer where it flows faster.
// Each line fades from dark (tail) to amber (head), so the colour shows direction.
// This is the "structural logic" view for the presentation: the plankton are just
// following these arrows.
export function FieldArrows({ field, clock, boxSize, resolution, strength }: FieldArrowsProps) {
  const linesRef = useRef<LineSegments>(null)
  const groupRef = useRef<Group>(null)
  const n = resolution
  const cell = boxSize / n

  // Two vertices per arrow (tail, head), three numbers per vertex.
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(n * n * n * 2 * 3)
    const colors = new Float32Array(n * n * n * 2 * 3)
    for (let i = 0; i < n * n * n; i++) {
      colors.set([0.05, 0.12, 0.2], i * 6) // tail colour
      colors.set([1.0, 0.55, 0.15], i * 6 + 3) // head colour
    }
    return { positions, colors }
  }, [n])

  const v = useMemo(() => new Vector3(), [])

  // Re-sample every frame, because the curl field changes over time.
  // (n³ samples is small next to the thousands of plankton.)
  useFrame(() => {
    const lines = linesRef.current
    const group = groupRef.current
    if (!lines || !group) return
    const t = clock.current.t

    // Like the plankton, the grid follows the player (if any). It moves in whole-cell
    // steps (snapped), so the arrows stay put in the world instead of sliding along.
    const ox = player.active ? Math.round(player.position.x / cell) * cell : 0
    const oy = player.active ? Math.round(player.position.y / cell) * cell : 0
    const oz = player.active ? Math.round(player.position.z / cell) * cell : 0
    group.position.set(ox, oy, oz)

    // Scale so an arrow at full strength is a bit shorter than one grid cell.
    const scale = (cell * 0.8) / Math.max(strength, 0.001)
    const posAttr = lines.geometry.attributes.position as BufferAttribute
    const positions = posAttr.array as Float32Array
    let k = 0
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let l = 0; l < n; l++) {
          // Centre of grid cell (i, j, l)
          const x = -boxSize / 2 + (i + 0.5) * cell
          const y = -boxSize / 2 + (j + 0.5) * cell
          const z = -boxSize / 2 + (l + 0.5) * cell
          field(x + ox, y + oy, z + oz, t, v) // sample in world space, draw in local space
          positions[k++] = x
          positions[k++] = y
          positions[k++] = z
          positions[k++] = x + v.x * scale
          positions[k++] = y + v.y * scale
          positions[k++] = z + v.z * scale
        }
    posAttr.needsUpdate = true
  })

  const boxGeometry = useMemo(() => new BoxGeometry(boxSize, boxSize, boxSize), [boxSize])

  return (
    <group ref={groupRef}>
      <lineSegments ref={linesRef} key={n}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors toneMapped={false} />
      </lineSegments>

      {/* The wrap boundary: plankton leaving one face come back through the opposite one */}
      <lineSegments>
        <edgesGeometry args={[boxGeometry]} />
        <lineBasicMaterial color="#1f4a6b" />
      </lineSegments>
    </group>
  )
}
