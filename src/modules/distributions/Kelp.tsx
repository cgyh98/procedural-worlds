import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, LineSegments, type BufferAttribute } from 'three'
import { decayFactor, disturbance } from '../../systems/excitation'
import { player } from '../../systems/player'

// One kelp strand: where it's rooted and how it moves.
export type Strand = {
  x: number
  z: number
  baseY: number // seafloor height at the root
  length: number
  phase: number // random offset so strands don't sway in sync
}

const SEGMENTS = 10 // line pieces per strand (more = smoother curve)

// Palette from the cosmos board: dark cobalt roots, sea-green glowing tips
// ("leaves that glow only at their edges").
const BASE = new Color(0.02, 0.05, 0.25)
const TIP = new Color(0.2, 1.3, 0.85)

type KelpProps = {
  strands: Strand[]
  sway: number // how far the tips move
  glow: number // resting brightness
  recovery: number // how fast excitation fades (per second)
}

// Kelp as thin glowing filaments, all in ONE LineSegments object (one draw call for
// every strand). Each frame, on the CPU:
//   - each strand bends: a sine wave whose amplitude grows towards the tip (f²),
//     so roots stay put and tips wave,
//   - each strand follows the shared excitation rule: it brightens when the player
//     swims close and fades back, the same rule as the plankton.
export function Kelp({ strands, sway, glow, recovery }: KelpProps) {
  const linesRef = useRef<LineSegments>(null)
  const excitation = useRef(new Float32Array(0))

  const vertexCount = strands.length * SEGMENTS * 2 // two vertices per line piece
  // Starting buffers (filled every frame). Memoized so they're only rebuilt when the count changes.
  const buffers = useMemo(
    () => ({ pos: new Float32Array(vertexCount * 3), col: new Float32Array(vertexCount * 3) }),
    [vertexCount],
  )

  useFrame(({ clock }, delta) => {
    const lines = linesRef.current
    if (!lines) return
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const posAttr = lines.geometry.attributes.position as BufferAttribute
    const colAttr = lines.geometry.attributes.color as BufferAttribute
    const pos = posAttr.array as Float32Array
    const col = colAttr.array as Float32Array

    if (excitation.current.length !== strands.length) excitation.current = new Float32Array(strands.length)
    const exc = excitation.current
    const keep = decayFactor(recovery, dt)

    let v = 0 // running vertex index
    for (let s = 0; s < strands.length; s++) {
      const st = strands[s]

      // Excitation, measured at the middle of the strand
      const dx = st.x - player.position.x
      const dy = st.baseY + st.length / 2 - player.position.y
      const dz = st.z - player.position.z
      const e = Math.min((exc[s] + disturbance(dx, dy, dz) * dt) * keep, 2)
      exc[s] = e
      const brightness = glow + e * 2

      for (let k = 0; k < SEGMENTS; k++) {
        // Both ends of line piece k: fractions f0, f1 along the strand
        for (let end = 0; end < 2; end++) {
          const f = (k + end) / SEGMENTS
          const bend = sway * f * f // roots fixed, tips free
          const i = v * 3
          pos[i] = st.x + Math.sin(t * 1.3 + st.phase + f * 2.5) * bend
          pos[i + 1] = st.baseY + f * st.length
          pos[i + 2] = st.z + Math.cos(t * 1.1 + st.phase * 1.3 + f * 2.0) * bend * 0.6
          // Colour: dark root → glowing tip, scaled by brightness
          col[i] = (BASE.r + (TIP.r - BASE.r) * f) * brightness
          col[i + 1] = (BASE.g + (TIP.g - BASE.g) * f) * brightness
          col[i + 2] = (BASE.b + (TIP.b - BASE.b) * f) * brightness
          v++
        }
      }
    }
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return (
    // key: new buffers when the number of strands changes. frustumCulled off because
    // the bounding sphere is computed before the strands get their real positions.
    <lineSegments ref={linesRef} key={vertexCount} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buffers.pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[buffers.col, 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors toneMapped={false} />
    </lineSegments>
  )
}
