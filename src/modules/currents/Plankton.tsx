import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, Color, Points, Vector3, type BufferAttribute, type WebGLProgramParametersWithUniforms } from 'three'
import { mulberry32 } from '../../lib/random'
import { player } from '../../systems/player'
import { decayFactor, disturbance } from '../../systems/excitation'
import type { VectorField } from './fields'
import type { SimClock } from './Scene'

// Glow colours (palette from the cosmos board: electric blue → cyan-white).
// Values above 1 on purpose: with toneMapped={false}, anything brighter than 1 is
// what the bloom pass picks up and spreads into a halo.
// Calm plankton glow a deep electric blue; the more excited, the more they shift
// towards cyan-white, like the hottest cores of the strands on the board.
const DIM = new Color(0.12, 0.32, 1.6)
const BRIGHT = new Color(0.75, 1.7, 2.1)

type PlanktonProps = {
  field: VectorField
  clock: RefObject<SimClock>
  count: number
  boxSize: number
  pointSize: number
  restGlow: number // brightness when nothing is happening
  flowGlow: number // how much faster water makes plankton brighter
  recovery: number // how fast excitation fades back to dark (per second)
  seed: number
}

// Thousands of plankton drifting with the current.
//
// Each frame, every plankton:
//   1. asks the field for the velocity at its position,
//   2. moves a small step along it:  position += velocity × dt   ("advection")
//   3. wraps around if it left the box (modulo), so the water feels endless.
//      When there is a player, the box is centred on the player and travels with it,
//   4. updates its excitation (the shared rule in systems/excitation.ts):
//      boosted when the player swims close by, then decaying back to dark,
//   5. sets its brightness = rest glow + flow glow (faster water) + excitation,
//      and shifts its colour from electric blue (calm) to cyan-white (excited).
//
// All of this happens on plain Float32Arrays inside useFrame, never in React state:
// React re-rendering 60 times a second for thousands of points would be far too slow.
export function Plankton({ field, clock, count, boxSize, pointSize, restGlow, flowGlow, recovery, seed }: PlanktonProps) {
  const pointsRef = useRef<Points>(null)
  // One excitation value per plankton. Lives in a ref: it's per-frame data.
  const excitation = useRef(new Float32Array(0))

  // Initial positions: scattered randomly (but seeded) through the box.
  // Recomputed only when count / box size / seed change.
  const { positions, colors } = useMemo(() => {
    const rand = mulberry32(seed)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3).fill(0.25) // start dim
    for (let i = 0; i < positions.length; i++) positions[i] = (rand() - 0.5) * boxSize
    return { positions, colors }
  }, [count, boxSize, seed])

  const texture = useMemo(() => createGlowTexture(), [])
  const velocity = useMemo(() => new Vector3(), []) // reused every sample, no allocations

  useFrame(() => {
    const { t, dt } = clock.current
    const points = pointsRef.current
    if (!points || dt === 0) return // paused

    // Write into the geometry's own buffers (the arrays three.js uploads to the GPU).
    // The memoized arrays above are only the starting values.
    const posAttr = points.geometry.attributes.position as BufferAttribute
    const colAttr = points.geometry.attributes.color as BufferAttribute
    const positions = posAttr.array as Float32Array
    const colors = colAttr.array as Float32Array

    // (Re)allocate when the plankton count changes; everyone starts calm.
    if (excitation.current.length !== count) excitation.current = new Float32Array(count)
    const exc = excitation.current
    const keep = decayFactor(recovery, dt) // fraction of excitation left after this frame

    // The wrap box is centred on the player if there is one, otherwise on the origin.
    const cx = player.active ? player.position.x : 0
    const cy = player.active ? player.position.y : 0
    const cz = player.active ? player.position.z : 0

    const half = boxSize / 2
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      let x = positions[ix]
      let y = positions[ix + 1]
      let z = positions[ix + 2]

      // 1–2. Sample the field and step along it
      field(x, y, z, t, velocity)
      x += velocity.x * dt
      y += velocity.y * dt
      z += velocity.z * dt

      // 3. Wrap: leaving one face of the box re-enters from the opposite face
      const ox = x
      const oy = y
      const oz = z
      if (x - cx > half) x -= boxSize
      else if (x - cx < -half) x += boxSize
      if (y - cy > half) y -= boxSize
      else if (y - cy < -half) y += boxSize
      if (z - cz > half) z -= boxSize
      else if (z - cz < -half) z += boxSize
      // A wrapped plankton is conceptually a *new* plankton on the far side, so it
      // starts calm. Otherwise the glowing trail behind a fast player wraps around
      // to the front of the box and the whole box lights up.
      if (x !== ox || y !== oy || z !== oz) exc[i] = 0

      positions[ix] = x
      positions[ix + 1] = y
      positions[ix + 2] = z

      // 4. Excitation: stirred up by the player, then recovering
      const dx = x - cx
      const dy = y - cy
      const dz = z - cz
      let e = exc[i] + disturbance(dx * dx + dy * dy + dz * dz) * dt
      e = Math.min(e * keep, 2) // decay, and cap so a long stay doesn't blow out the bloom
      exc[i] = e

      // 5. Brightness (a grey value; the material colour tints it cyan)
      const b = restGlow + flowGlow * velocity.length() + e
      // Colour = brightness × (blend from DIM to BRIGHT as brightness rises)
      const k = Math.min(Math.max((b - 0.3) / 1.2, 0), 1)
      colors[ix] = b * (DIM.r + (BRIGHT.r - DIM.r) * k)
      colors[ix + 1] = b * (DIM.g + (BRIGHT.g - DIM.g) * k)
      colors[ix + 2] = b * (DIM.b + (BRIGHT.b - DIM.b) * k)
    }

    // Tell three.js the arrays changed so it re-uploads them to the GPU
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return (
    // `key` rebuilds the geometry when the arrays are replaced (count/box/seed change)
    // frustumCulled={false}: the points travel with the player, so the bounding sphere
    // three.js computed from the starting positions would go stale and hide them.
    <points ref={pointsRef} key={`${count}-${boxSize}-${seed}`} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={pointSize}
        sizeAttenuation // farther points draw smaller, like real perspective
        vertexColors // per-point colour + brightness from the colour attribute
        transparent
        depthWrite={false} // overlapping glows shouldn't hide each other
        blending={AdditiveBlending} // overlapping glows add up, like light does
        toneMapped={false} // let values go above 1 so bloom can catch them
        onBeforeCompile={softenNearPoints}
      />
    </points>
  )
}

// A small edit to three.js's built-in points shader (our first GLSL!).
//
// Shaders are tiny programs that run on the GPU: the *vertex* shader runs once per
// point and decides where it lands on screen and how big it is; the *fragment*
// shader runs once per pixel and decides its colour. onBeforeCompile hands us
// PointsMaterial's shader source as text just before it's compiled, so we can splice
// in a few lines instead of writing a whole shader from scratch.
//
// The problem it fixes: with perspective sizing, size ∝ 1 / distance, so a plankton
// drifting right past the camera lens is drawn enormous. We
//   1. cap the on-screen size (in pixels), and
//   2. fade points out as they get closer than ~2 units to the camera.
const MAX_POINT_PX = 48.0
function softenNearPoints(shader: WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('void main() {', 'varying float vNearFade;\nvoid main() {')
    .replace(
      '#include <logdepthbuf_vertex>',
      `gl_PointSize = min(gl_PointSize, ${MAX_POINT_PX.toFixed(1)});
      // -mvPosition.z = distance in front of the camera. 0 below 0.6, 1 beyond 2.0.
      vNearFade = smoothstep(0.6, 2.0, -mvPosition.z);
      #include <logdepthbuf_vertex>`,
    )
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', 'varying float vNearFade;\nvoid main() {')
    .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, opacity * vNearFade );')
}

// A soft round dot (white centre fading to transparent), drawn once on a 2D canvas.
// Without a texture, points render as hard squares.
function createGlowTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}
