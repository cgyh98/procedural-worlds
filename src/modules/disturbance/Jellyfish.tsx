import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, LineSegments, Mesh, MeshBasicMaterial, Quaternion, ShaderMaterial, Vector3 } from 'three'
import { player } from '../../systems/player'
import { useWorld } from '../../store/useWorld'
import { exposure } from '../atmosphere/moonLight'
import { PALETTE, color } from '../../style/palette'
import { createHeroMaterial, createOutlineMaterial } from './heroShader'

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
//
// TWO STYLES, same body and motion, only the drawing changes:
//   glow:    additive glowing bell + 1-pixel line tentacles (the cosmos-board look)
//   painted: the illustration style made for the moon child (hero-art-direction):
//            the bell uses the toon shader (soft-stepped light, blue shadows, a touch
//            of peach on top, cyan rim, caustics) plus an ink outline; the tentacles
//            become camera-facing RIBBONS (like her hair), periwinkle → pale aqua.
//            A small glowing core stays: it's still a bioluminescent animal.
// ─────────────────────────────────────────────────────────────────────────────

export type JellyStyle = 'glow' | 'painted'

const BELL_RADIUS = 0.28
const TENTACLES = 10
const POINTS = 16 // per tentacle
const SEGMENT = 0.085 // distance between neighbouring points

// Cosmos-board palette: ice-white bell core, electric-blue bell, sea-green tentacles
const BELL = new Color(0.5, 1.2, 2.4)
const CORE = new Color(2.2, 2.6, 2.8)
const TENTACLE_ROOT = new Color(0.5, 1.8, 1.6)
const TENTACLE_TIP = new Color(0.02, 0.15, 0.4)
// Painted style: the palette from src/style/palette.ts
const RIBBON_ROOT = color(PALETTE.periwinkle)
const RIBBON_MID = color(PALETTE.softViolet)
const RIBBON_TIP = color(PALETTE.paleAqua)
const RIBBON_EDGE = color(PALETTE.cobalt)
const RIBBON_WIDTH = 0.022 // half-width at the root, tapering to a point
const PAINTED_CORE = color(PALETTE.paleAqua).multiplyScalar(1.6) // above 1 → blooms a little

const UP = new Vector3(0, 1, 0)
// Scratch objects (one jellyfish, so module-level is fine)
const dir = new Vector3()
const targetQuat = new Quaternion()
const down = new Vector3()
const side = new Vector3()
const tmp = new Vector3()
const tangent = new Vector3()
const toCam = new Vector3()
const across = new Vector3()

export function Jellyfish({ style = 'glow' }: { style?: JellyStyle }) {
  const painted = style === 'painted'
  const bellRef = useRef<Group>(null)
  const tentaclesRef = useRef<LineSegments>(null)
  const ribbonsRef = useRef<Mesh>(null)
  const paintedBellRef = useRef<Mesh>(null)
  const outlineRef = useRef<Mesh>(null)
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

  // Painted style: shared materials and the ribbon buffers
  const bellMat = useMemo(() => {
    const m = createHeroMaterial()
    m.side = DoubleSide // the bell is an open dome: we see its inside from below
    m.uniforms.uWarmAmount.value = 0.35 // a little peach where moonlight hits the top
    return m
  }, [])
  const outlineMat = useMemo(() => createOutlineMaterial(), [])
  const ribbonGeometry = useMemo(() => {
    // Each tentacle: POINTS centre points → 2 ribbon vertices each (left and right edge)
    const verts = TENTACLES * POINTS * 2
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(verts * 3), 3))
    const colors = new Float32Array(verts * 3)
    const c = new Color()
    const index: number[] = []
    for (let t = 0; t < TENTACLES; t++)
      for (let k = 0; k < POINTS; k++) {
        const f = k / (POINTS - 1) // 0 at the bell, 1 at the tip
        for (let e = 0; e < 2; e++) {
          // Along: periwinkle → soft violet → pale aqua. Across: one edge darker (volume).
          if (f < 0.5) c.copy(RIBBON_ROOT).lerp(RIBBON_MID, f * 2)
          else c.copy(RIBBON_MID).lerp(RIBBON_TIP, (f - 0.5) * 2)
          if (e === 0) c.lerp(RIBBON_EDGE, 0.5)
          colors.set([c.r, c.g, c.b], ((t * POINTS + k) * 2 + e) * 3)
        }
        if (k < POINTS - 1) {
          const a = (t * POINTS + k) * 2
          index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) // two triangles per piece
        }
      }
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3))
    geo.setIndex(new BufferAttribute(new Uint32Array(index), 1))
    return geo
  }, [])
  useEffect(
    () => () => {
      bellMat.dispose()
      outlineMat.dispose()
      ribbonGeometry.dispose()
    },
    [bellMat, outlineMat, ribbonGeometry],
  )

  useFrame(({ clock, camera }, delta) => {
    const bell = bellRef.current
    if (!bell) return
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

    // ── Painted style: shader uniforms + ribbons around the chains ──
    if (painted) {
      const lit = exposure(useWorld.getState().moonPhase) // the moon sets how lit the paint is
      const bm = paintedBellRef.current?.material as ShaderMaterial | undefined
      const om = outlineRef.current?.material as ShaderMaterial | undefined
      if (bm) {
        bm.uniforms.uTime.value = t
        bm.uniforms.uExposure.value = lit
      }
      if (om) om.uniforms.uExposure.value = lit
      const ribbons = ribbonsRef.current
      if (ribbons) {
        ;(ribbons.material as MeshBasicMaterial).color.setScalar(lit)
        // At each chain point, step sideways by ± half the width. "Sideways" is
        // perpendicular to the tentacle AND to the view direction, so the ribbon always
        // shows its broad side to the camera (a billboard strip).
        const rAttr = ribbons.geometry.attributes.position as BufferAttribute
        const rPos = rAttr.array as Float32Array
        for (let i = 0; i < TENTACLES; i++)
          for (let k = 0; k < POINTS; k++) {
            const o = (i * POINTS + k) * 3
            const a = (i * POINTS + Math.max(0, k - 1)) * 3
            const b = (i * POINTS + Math.min(POINTS - 1, k + 1)) * 3
            tangent.set(c[b] - c[a], c[b + 1] - c[a + 1], c[b + 2] - c[a + 2]).normalize()
            toCam.set(camera.position.x - c[o], camera.position.y - c[o + 1], camera.position.z - c[o + 2]).normalize()
            across.crossVectors(tangent, toCam).normalize()
            const f = k / (POINTS - 1)
            const w = RIBBON_WIDTH * Math.pow(1 - f, 0.7) // taper to a point at the tip
            const v0 = (i * POINTS + k) * 6
            rPos[v0] = c[o] - across.x * w
            rPos[v0 + 1] = c[o + 1] - across.y * w
            rPos[v0 + 2] = c[o + 2] - across.z * w
            rPos[v0 + 3] = c[o] + across.x * w
            rPos[v0 + 4] = c[o + 1] + across.y * w
            rPos[v0 + 5] = c[o + 2] + across.z * w
          }
        rAttr.needsUpdate = true
      }
      return
    }

    // ── Glow style: copy the chains into the line buffer (each piece = point k and point k+1) ──
    const lines = tentaclesRef.current
    if (!lines) return
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

  if (painted)
    return (
      <>
        <group ref={bellRef}>
          {/* The bell, painted: toon shader + an ink outline (the same "inverted hull" as the moon child) */}
          <mesh ref={paintedBellRef} material={bellMat}>
            <sphereGeometry args={[BELL_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh ref={outlineRef} material={outlineMat}>
            <sphereGeometry args={[BELL_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {/* A small glowing core: still a bioluminescent animal */}
          <mesh position={[0, BELL_RADIUS * 0.3, 0]}>
            <sphereGeometry args={[BELL_RADIUS * 0.16, 12, 8]} />
            <meshBasicMaterial color={PAINTED_CORE} toneMapped={false} />
          </mesh>
        </group>
        {/* Ribbon tentacles (world space, rebuilt every frame) */}
        <mesh ref={ribbonsRef} geometry={ribbonGeometry} frustumCulled={false}>
          <meshBasicMaterial vertexColors side={DoubleSide} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      </>
    )

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
