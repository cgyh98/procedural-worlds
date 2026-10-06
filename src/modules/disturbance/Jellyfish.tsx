import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, LineSegments, Quaternion, Vector3, type BufferAttribute } from 'three'
import { player } from '../../systems/player'

// ─────────────────────────────────────────────────────────────────────────────
// The player's body: a procedural jellyfish
//
//   BELL: a glowing half-sphere that pulses (contracts and relaxes) faster when you
//   swim faster, and tilts towards where you're going: jellyfish swim bell-first.
//
//   TENTACLES: chains of points hanging from the bell's rim. Each frame:
//     1. the first point of each chain is glued to the rim,
//     2. every other point drifts a little "downwards" (away from the bell top)
//        and sways,
//     3. then each point is pulled back to a fixed distance from the point before
//        it (a "distance constraint").
//   Because points are only dragged along by their neighbour, they lag behind
//   when the bell moves, so the tentacles trail naturally. No physics engine,
//   just "follow the leader".
// ─────────────────────────────────────────────────────────────────────────────

const BELL_RADIUS = 0.28
const TENTACLES = 10
const POINTS = 16 // per tentacle
const SEGMENT = 0.085 // distance between neighbouring points

// Cosmos-board palette: ice-white bell core, electric-blue bell, sea-green tentacles
const BELL = new Color(0.5, 1.2, 2.4)
const CORE = new Color(2.2, 2.6, 2.8)
const TENTACLE_ROOT = new Color(0.5, 1.8, 1.6)
const TENTACLE_TIP = new Color(0.02, 0.15, 0.4)

const UP = new Vector3(0, 1, 0)
// Scratch objects (one jellyfish, so module-level is fine)
const dir = new Vector3()
const targetQuat = new Quaternion()
const down = new Vector3()
const side = new Vector3()
const tmp = new Vector3()

export function Jellyfish() {
  const bellRef = useRef<Group>(null)
  const tentaclesRef = useRef<LineSegments>(null)
  const pulse = useRef(0) // the bell's pulse phase
  // Tentacle points in world space: TENTACLES × POINTS × xyz. Kept in a ref (per-frame data).
  const chain = useRef<Float32Array | null>(null)

  // Anchor points around the bell's rim, in the bell's own (local) space
  const anchors = useMemo(
    () =>
      Array.from({ length: TENTACLES }, (_, i) => {
        const a = (i / TENTACLES) * Math.PI * 2
        return new Vector3(Math.cos(a) * BELL_RADIUS * 0.85, -0.02, Math.sin(a) * BELL_RADIUS * 0.85)
      }),
    [],
  )

  // Line buffers: each tentacle is (POINTS − 1) line pieces, 2 vertices each
  const lineGeometry = useMemo(() => {
    const n = TENTACLES * (POINTS - 1) * 2
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 3), 3))
    const colors = new Float32Array(n * 3)
    for (let t = 0; t < TENTACLES; t++)
      for (let k = 0; k < POINTS - 1; k++)
        for (let end = 0; end < 2; end++) {
          const f = (k + end) / (POINTS - 1) // 0 at the bell, 1 at the tip
          const c = TENTACLE_ROOT.clone().lerp(TENTACLE_TIP, f)
          colors.set([c.r, c.g, c.b], ((t * (POINTS - 1) + k) * 2 + end) * 3)
        }
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return geo
  }, [])

  useFrame(({ clock }, delta) => {
    const bell = bellRef.current
    const lines = tentaclesRef.current
    if (!bell || !lines) return
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime

    // ── Bell: follow the player, tilt towards the swim direction, pulse ──
    bell.position.copy(player.position)
    // Tilt: blend from "up" towards the velocity direction, more the faster you go
    const tilt = Math.min(player.speed / 3, 1) * 0.85
    if (player.speed > 0.05) dir.copy(player.velocity).divideScalar(player.speed)
    else dir.copy(UP)
    dir.lerp(UP, 1 - tilt).normalize()
    targetQuat.setFromUnitVectors(UP, dir)
    bell.quaternion.slerp(targetQuat, 1 - Math.exp(-4 * dt)) // smooth turn

    // Pulse: contract (narrower, taller) and relax; faster when swimming faster
    pulse.current += dt * (1.2 + player.speed * 0.6) * Math.PI * 2 * 0.5
    const p = Math.max(0, Math.sin(pulse.current)) // only the contraction half
    bell.scale.set(1 - 0.18 * p, 1 + 0.12 * p, 1 - 0.18 * p)

    // ── Tentacles ──
    down.set(0, -1, 0).applyQuaternion(bell.quaternion) // "away from the bell top"
    if (!chain.current) {
      // First frame: hang every chain straight down from its anchor
      chain.current = new Float32Array(TENTACLES * POINTS * 3)
      for (let i = 0; i < TENTACLES; i++) {
        tmp.copy(anchors[i]).applyQuaternion(bell.quaternion).add(bell.position)
        for (let k = 0; k < POINTS; k++) {
          const o = (i * POINTS + k) * 3
          chain.current[o] = tmp.x + down.x * SEGMENT * k
          chain.current[o + 1] = tmp.y + down.y * SEGMENT * k
          chain.current[o + 2] = tmp.z + down.z * SEGMENT * k
        }
      }
    }
    const c = chain.current
    for (let i = 0; i < TENTACLES; i++) {
      // 1. Glue the first point to the (moving, tilting, pulsing) rim
      tmp.copy(anchors[i]).multiply(bell.scale).applyQuaternion(bell.quaternion).add(bell.position)
      const o0 = i * POINTS * 3
      c[o0] = tmp.x
      c[o0 + 1] = tmp.y
      c[o0 + 2] = tmp.z
      // A sideways direction for this tentacle's sway
      side.set(Math.cos(i * 2.4), 0, Math.sin(i * 2.4))

      for (let k = 1; k < POINTS; k++) {
        const o = (i * POINTS + k) * 3
        const prev = o - 3
        // 2. Drift downwards and sway (more towards the tip)
        const sway = Math.sin(t * 2.2 + i * 1.7 + k * 0.45) * 0.25 * (k / POINTS)
        c[o] += (down.x * 0.6 + side.x * sway) * dt
        c[o + 1] += (down.y * 0.6 + side.y * sway) * dt
        c[o + 2] += (down.z * 0.6 + side.z * sway) * dt
        // 3. Distance constraint: put the point exactly SEGMENT away from the previous one
        const dx = c[o] - c[prev]
        const dy = c[o + 1] - c[prev + 1]
        const dz = c[o + 2] - c[prev + 2]
        const len = Math.hypot(dx, dy, dz) || 1
        c[o] = c[prev] + (dx / len) * SEGMENT
        c[o + 1] = c[prev + 1] + (dy / len) * SEGMENT
        c[o + 2] = c[prev + 2] + (dz / len) * SEGMENT
      }
    }

    // Copy the chains into the line buffer (each piece = point k and point k+1)
    const attr = lines.geometry.attributes.position as BufferAttribute
    const pos = attr.array as Float32Array
    let v = 0
    for (let i = 0; i < TENTACLES; i++)
      for (let k = 0; k < POINTS - 1; k++)
        for (let end = 0; end < 2; end++) {
          const o = (i * POINTS + k + end) * 3
          pos[v++] = c[o]
          pos[v++] = c[o + 1]
          pos[v++] = c[o + 2]
        }
    attr.needsUpdate = true
  })

  return (
    <>
      <group ref={bellRef}>
        {/* The bell: a translucent glowing dome (the top half of a sphere) */}
        <mesh>
          <sphereGeometry args={[BELL_RADIUS, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color={BELL} transparent opacity={0.55} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* A bright core inside the bell */}
        <mesh position={[0, BELL_RADIUS * 0.35, 0]}>
          <sphereGeometry args={[BELL_RADIUS * 0.3, 16, 12]} />
          <meshBasicMaterial color={CORE} toneMapped={false} />
        </mesh>
      </group>
      {/* frustumCulled off: the points live in world space and move every frame */}
      <lineSegments ref={tentaclesRef} geometry={lineGeometry} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
    </>
  )
}
