import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  Quaternion,
  ShaderMaterial,
  SkinnedMesh,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { player } from '../../systems/player'
import { useWorld } from '../../store/useWorld'
import { createGlowTexture } from '../../lib/glowTexture'
import { PALETTE, color } from '../../style/palette'
import { exposure } from '../atmosphere/moonLight'
import { createHeroMaterial, createOutlineMaterial } from './heroShader'
import { buildRig, type LimbName, type Rig } from './bodyRig'

// ─────────────────────────────────────────────────────────────────────────────
// The player's body: the moon child
//
// A small being fallen from the moon into the sea, drawn like a digital painting
// that moves (art direction: vault/claude/hero-art-direction.md).
//
//   BODY: one continuous procedural SKINNED mesh (bodyRig.ts): tubes along a bone
//   skeleton with smooth radius profiles, and skin weights so joints bend smoothly.
//
//   OUTLINE: the same skinned mesh drawn again, inflated and inside-out, in ink navy
//   (the "inverted hull" trick, heroShader.ts).
//
//   POSE: procedural, no keyframes. Every bone angle is a slow sine wave:
//     idle  = weightless drifting, arms taking turns reaching up towards the light,
//             the head following, one knee drawn up, toes pointed, a slow bob
//     swim  = a slow breaststroke and a gentle flutter kick, head lifted
//   blended by (smoothed) speed, so the child melts between the two.
//
//   SHADING: the painterly toon shader: soft lighting steps, cool blue shadows, a warm
//   peach accent on the lit side, brush-stroke texture, a pale cyan rim, caustics.
//
//   HAIR: a few big flowing LOCKS. Each lock's centre line is a follow-the-leader
//   chain (the jellyfish-tentacle rule); a ribbon is built around it every frame,
//   wide near the root and tapering to a point, turned to face the camera.
//
// Body frame: y = up the spine, −z = front (face, chest).
// ─────────────────────────────────────────────────────────────────────────────

const LOCK_POINTS = 10 // points along each hair lock
const HEART = new Color(1.1, 1.35, 1.6)
const DEBUG = new Color('#ffb347')
const LOCK_ROOT = color(PALETTE.periwinkle)
const LOCK_MID = color(PALETTE.softViolet)
const LOCK_TIP = color(PALETTE.paleAqua)
const LOCK_EDGE = color(PALETTE.cobalt)
const IDENTITY = new Matrix4()

const UP = new Vector3(0, 1, 0)
const X_AXIS = new Vector3(1, 0, 0)
const Z_AXIS = new Vector3(0, 0, 1)

// Scratch objects (one moon child, so module-level is fine)
const yawQuat = new Quaternion()
const pitchQuat = new Quaternion()
const rollQuat = new Quaternion()
const targetQuat = new Quaternion()
const headDir = new Vector3()
const backDir = new Vector3()
const tmp = new Vector3()
const tangent = new Vector3()
const toCam = new Vector3()
const side = new Vector3()

type DebugView = 0 | 1 | 2 | 3 | 4

// Lock roots on the crown and back of the head (never over the face), spread with the
// golden angle so they don't line up. Unit directions in the head's local space.
function lockRoots(count: number) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, i) => {
    const cosT = 0.95 - ((i + 0.5) / count) * 0.9 // crown → back of the head
    const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT))
    const phi = 0.1 * Math.PI + (((i * golden) % (2 * Math.PI)) / (2 * Math.PI)) * 0.8 * Math.PI // back half (+z)
    return new Vector3(sinT * Math.cos(phi), cosT, sinT * Math.sin(phi))
  })
}

// Everything that's rebuilt when the genome changes: the rig, the two skinned meshes
// (body + outline) and the head details, all in one three.js group.
type Body = {
  rig: Rig
  group: Group
  body: SkinnedMesh
  outline: SkinnedMesh
  cap: Mesh
  dispose: () => void
}

function buildBody(rig: Rig, skin: ShaderMaterial, hair: ShaderMaterial, outlineMat: ShaderMaterial, R: number): Body {
  const body = new SkinnedMesh(rig.geometry, skin)
  const outline = new SkinnedMesh(rig.geometry, outlineMat)
  // Bind both to the same skeleton. Identity bind matrix: the bones live in the same
  // group as the meshes, so bind pose = the bones' rest positions.
  body.bind(rig.skeleton, IDENTITY)
  outline.bind(rig.skeleton, IDENTITY)
  body.frustumCulled = outline.frustumCulled = false // skinned vertices move outside the bind-pose bounds

  // Head details ride on the head bone: hair cap, closed eyes, a small nose
  const head = new Group()
  head.position.copy(rig.headCenter)
  rig.head.add(head)
  const capGeo = new SphereGeometry(R * 1.04, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55)
  const cap = new Mesh(capGeo, hair)
  cap.rotation.x = 0.45 // tilted towards the back of the head
  cap.scale.set(0.99, 1.1, 1.06)
  head.add(cap)
  const eyeGeo = new TorusGeometry(R * 0.13, R * 0.025, 4, 12, Math.PI)
  const eyeMat = new MeshBasicMaterial({ color: PALETTE.ultramarine, toneMapped: false })
  for (const sx of [-1, 1]) {
    const eye = new Mesh(eyeGeo, eyeMat) // the lower half of a ring: "‿", closed eyes
    eye.position.set(sx * R * 0.34, R * 0.02, -R * 0.96)
    eye.rotation.z = Math.PI
    head.add(eye)
  }
  const noseGeo = new SphereGeometry(R * 0.09, 10, 8)
  const nose = new Mesh(noseGeo, skin)
  nose.position.set(0, -R * 0.2, -R * 0.98)
  head.add(nose)

  const group = new Group()
  group.add(rig.root, body, outline)
  return {
    rig, group, body, outline, cap,
    dispose: () => {
      rig.geometry.dispose()
      capGeo.dispose()
      eyeGeo.dispose()
      eyeMat.dispose()
      noseGeo.dispose()
      rig.skeleton.dispose()
    },
  }
}

export function MoonChild({ debug = false }: { debug?: boolean }) {
  // The "genome": a handful of numbers that define this body.
  const g = useControls('Moon child', {
    height: { value: 1.6, min: 0.6, max: 2.5, step: 0.05, hint: 'Overall size of the body. All parts scale with it.' },
    head: { value: 1, min: 0.7, max: 1.6, step: 0.05, hint: 'Head size relative to the body. Bigger = younger, more childlike proportions.' },
    limbs: { value: 1.1, min: 0.7, max: 1.5, step: 0.05, hint: 'Arm and leg length relative to the body. Longer = more elongated, graceful poses.' },
    locks: { label: 'hair locks', value: 7, min: 1, max: 16, step: 1, hint: 'Number of big flowing hair locks. Each is a follow-the-leader chain with a ribbon built around it.' },
    hairLength: { label: 'hair length', value: 1.2, min: 0.3, max: 2.5, step: 0.05, hint: 'Length of the locks, relative to the body.' },
    hairWidth: { label: 'hair width', value: 0.8, min: 0.3, max: 2, step: 0.05, hint: 'Width of each lock near the root.' },
    heart: { label: 'heart glow', value: 0.5, min: 0, max: 2, step: 0.05, hint: 'The piece of moonlight inside the chest, seen through the body.' },
  })

  const look = useControls('Hero look', {
    steps: { label: 'ramp steps', value: 3, min: 1, max: 6, step: 1, hint: 'How many flat lighting steps the toon shader cuts the light into. 1 = flat, 6 = almost smooth.' },
    softness: { label: 'ramp softness', value: 0.35, min: 0, max: 1, step: 0.01, hint: 'How soft the edge between two lighting steps is. 0 = hard cel bands, higher = painted, blended edges.' },
    brush: { label: 'brush strokes', value: 0.18, min: 0, max: 0.6, step: 0.01, hint: 'Painted texture: stretched noise (streaks) nudges the light before it is cut into steps, so step edges become ragged like brush strokes. It is computed in the body\'s rest pose, so it sticks to the skin.' },
    outline: { label: 'ink outline', value: 1, min: 0, max: 3, step: 0.05, hint: 'Width of the navy ink line around the silhouette (inverted hull: an inflated, inside-out copy of the body drawn behind it). 0 = no outline.' },
    rim: { label: 'rim strength', value: 0.7, min: 0, max: 3, step: 0.05, hint: 'Brightness of the pale cyan fresnel rim that outlines the silhouette against the water.' },
    warm: { label: 'warm accent', value: 0.7, min: 0, max: 1, step: 0.01, hint: 'How much the brightest, upward-facing skin shifts to peach: the warm-on-cool contrast of the style.' },
    causticScale: { label: 'caustic scale', value: 1.2, min: 0.2, max: 4, step: 0.05, hint: 'Size of the cells in the light web projected on the body, in world units.' },
    causticSpeed: { label: 'caustic speed', value: 0.4, min: 0, max: 2, step: 0.01, hint: 'How fast the light web dances.' },
    causticAmount: { label: 'caustic amount', value: 0.35, min: 0, max: 2, step: 0.01, hint: 'Brightness of the caustics. They only land on surfaces facing up (towards the light).' },
    view: {
      label: 'shader debug',
      value: 0 as DebugView,
      options: { Final: 0, 'Lighting ramp': 1, 'Caustic mask': 2, 'Rim mask': 3, 'Brush strokes': 4 } as Record<string, DebugView>,
      hint: 'Show one layer of the shader on its own: the stepped lighting ramp, where the caustics land, the fresnel rim, or the brush-stroke noise.',
    },
  })

  const H = g.height
  // Proportions, in body heights (H). The hips are the origin.
  const dims = useMemo(() => {
    const T = 0.33 * H // torso length
    const headR = 0.095 * H * g.head
    const L = g.limbs
    return {
      H, T, headR,
      headY: 1.12 * T + headR * 0.95,
      shoulderX: 0.082 * H,
      shoulderY: 0.86 * T,
      upperArm: 0.19 * H * L,
      foreArm: 0.18 * H * L,
      hipX: 0.04 * H,
      hipY: 0.06 * T,
      thigh: 0.25 * H * L,
      shin: 0.25 * H * L,
    }
  }, [H, g.head, g.limbs])

  const skin = useMemo(() => createHeroMaterial(), [])
  const hairMat = useMemo(() => createHeroMaterial({ hair: true }), [])
  const outlineMat = useMemo(() => createOutlineMaterial(), [])
  useEffect(() => () => { skin.dispose(); hairMat.dispose(); outlineMat.dispose() }, [skin, hairMat, outlineMat])
  const glowTexture = useMemo(() => createGlowTexture(), [])

  const built = useMemo(() => buildBody(buildRig(dims), skin, hairMat, outlineMat, dims.headR), [dims, skin, hairMat, outlineMat])
  useEffect(() => () => built.dispose(), [built])
  // The frame loop reaches the body through a ref (per-frame mutation of bones/uniforms)
  const bodyRef = useRef<Body | null>(null)
  useEffect(() => {
    bodyRef.current = built
  }, [built])

  // ── Refs ──
  const rootRef = useRef<Group>(null) // follows the player, turned by heading + pitch
  const heartRef = useRef<Group>(null)
  const locksRef = useRef<Mesh>(null)
  const debugBonesRef = useRef<LineSegments>(null)
  const debugHairRef = useRef<Points>(null)
  const phase = useRef(0) // the swim stroke phase
  const smoothSwim = useRef(0) // the idle ↔ swim blend, smoothed

  // ── Hair lock buffers (rebuilt when the lock count changes) ──
  const roots = useMemo(() => lockRoots(g.locks), [g.locks])
  const chain = useRef<Float32Array | null>(null)
  const lockGeometry = useMemo(() => {
    // Each lock: LOCK_POINTS centre points → 2 ribbon vertices each (left, right edge)
    const verts = g.locks * LOCK_POINTS * 2
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(verts * 3), 3))
    const colors = new Float32Array(verts * 3)
    const c = new Color()
    const index: number[] = []
    for (let l = 0; l < g.locks; l++)
      for (let k = 0; k < LOCK_POINTS; k++) {
        const f = k / (LOCK_POINTS - 1) // 0 at the root, 1 at the tip
        for (let e = 0; e < 2; e++) {
          // Along the lock: periwinkle → soft violet → pale aqua at the tip.
          // Across: one edge darker (cobalt) for a painted sense of volume.
          if (f < 0.5) c.copy(LOCK_ROOT).lerp(LOCK_MID, f * 2)
          else c.copy(LOCK_MID).lerp(LOCK_TIP, (f - 0.5) * 2)
          if (e === 0) c.lerp(LOCK_EDGE, 0.55)
          colors.set([c.r, c.g, c.b], ((l * LOCK_POINTS + k) * 2 + e) * 3)
        }
        if (k < LOCK_POINTS - 1) {
          const a = (l * LOCK_POINTS + k) * 2
          index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) // two triangles per piece
        }
      }
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3))
    geo.setIndex(new BufferAttribute(new Uint32Array(index), 1))
    return geo
  }, [g.locks])
  useEffect(() => {
    chain.current = null // a new lock count: re-hang the hair
    return () => lockGeometry.dispose()
  }, [lockGeometry])

  // Debug buffers: bones as line pieces, and the hair chain points
  const BONES = 18 // spine, neck, and 4 per limb (attach, upper, lower, hand/foot)
  const debugBones = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(BONES * 2 * 3), 3))
    return geo
  }, [])
  const debugHair = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(g.locks * LOCK_POINTS * 3), 3))
    return geo
  }, [g.locks])
  useEffect(() => () => debugBones.dispose(), [debugBones])
  useEffect(() => () => debugHair.dispose(), [debugHair])

  useFrame(({ clock, camera }, delta) => {
    const root = rootRef.current
    const locks = locksRef.current
    const B = bodyRef.current
    if (!root || !locks || !B) return
    const { rig } = B
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime

    // ── 0. Shader uniforms ──
    const lit = exposure(useWorld.getState().moonPhase)
    for (const m of [B.body.material, B.cap.material] as ShaderMaterial[]) {
      const u = m.uniforms
      u.uTime.value = t
      u.uSteps.value = look.steps
      u.uSoftness.value = look.softness
      u.uBrush.value = look.brush
      u.uRim.value = look.rim
      if (m === B.body.material) u.uWarmAmount.value = look.warm
      u.uCausticScale.value = look.causticScale
      u.uCausticSpeed.value = look.causticSpeed
      u.uCausticAmount.value = look.causticAmount
      u.uDebug.value = look.view
      u.uExposure.value = look.view === 0 ? lit : 1 // debug masks stay full brightness
    }
    const om = B.outline.material as ShaderMaterial
    om.uniforms.uWidth.value = 0.0028 * look.outline
    om.uniforms.uExposure.value = lit
    B.outline.visible = look.outline > 0 && look.view === 0

    // ── 1. Place and orient the body ──
    // How much we're swimming (0 = drifting, 1 = full stroke), smoothed slowly:
    // nothing snappy, as if pushing through thick water.
    const swimTarget = Math.min(player.speed / 2.5, 1)
    smoothSwim.current += (swimTarget - smoothSwim.current) * (1 - Math.exp(-1.5 * dt))
    const s = smoothSwim.current

    // A slow buoyant bob while drifting (visual only; the disturbance uses the true position)
    root.position.copy(player.position)
    root.position.y += Math.sin(t * 0.9) * 0.05 * H * (1 - s)

    // Turn to the heading, then pitch so the head leads the motion.
    // In the heading-turned frame, forward speed h is along −z and vertical speed v along y;
    // the spine rotated by θ around x points at (0, cos θ, sin θ), so θ = atan2(−h, v).
    // When drifting, lean back a little and roll slowly, like floating on your back.
    const h = -Math.sin(player.heading) * player.velocity.x - Math.cos(player.heading) * player.velocity.z
    const v = player.velocity.y
    const swimPitch = Math.max(-1.4, Math.min(0.5, Math.atan2(-h, v)))
    const pitch = 0.18 * (1 - s) + swimPitch * s + Math.sin(t * 0.4) * 0.06 * (1 - s)
    yawQuat.setFromAxisAngle(UP, player.heading)
    pitchQuat.setFromAxisAngle(X_AXIS, pitch)
    rollQuat.setFromAxisAngle(Z_AXIS, Math.sin(t * 0.33) * 0.12 * (1 - s))
    targetQuat.copy(yawQuat).multiply(pitchQuat).multiply(rollQuat)
    root.quaternion.slerp(targetQuat, 1 - Math.exp(-2.5 * dt))

    // ── 2. Pose: blend a weightless drift and a slow swim stroke ──
    phase.current += dt * Math.PI * 2 * (0.22 + 0.3 * s)
    const ph = phase.current
    const mix = (idle: number, swim: number) => idle + (swim - idle) * s

    // Spine and head give the pose its "line of action": a soft arch while drifting,
    // the head looking up towards the light as an arm reaches; lifted when swimming.
    let reachAvg = 0
    for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
      const sign = sideIdx === 0 ? -1 : 1 // left limbs are at −x
      const arm = rig.limbs[(sideIdx === 0 ? 'armL' : 'armR') as LimbName]
      const leg = rig.limbs[(sideIdx === 0 ? 'legL' : 'legR') as LimbName]

      // Around x swings a limb forward (−z) and up; around z swings it out sideways.
      // Idle: the arms take turns reaching up towards the light (reach 0 → 1, slow,
      // half a cycle apart). Swim: reach over the head, then sweep down to the sides.
      const reach = 0.5 + 0.5 * Math.sin(t * 0.35 + sideIdx * 2.2)
      reachAvg += reach / 2
      arm.root.rotation.x = mix(0.5 + 2.2 * reach, 1.5 + 1.4 * Math.sin(ph))
      arm.root.rotation.z = sign * mix(0.55 - 0.25 * reach, 0.25 + 0.35 * Math.max(0, -Math.cos(ph)))
      arm.mid.rotation.x = mix(0.55 - 0.35 * reach, 0.25 + 0.3 * Math.max(0, Math.cos(ph))) // elbow
      arm.end.rotation.x = mix(0.35, 0.15) // relaxed wrist

      // Idle: one knee drawn up while the other leg trails long, slowly trading.
      // Swim: a gentle flutter kick, the legs half a cycle apart. Toes stay pointed.
      const bend = 0.5 + 0.5 * Math.sin(t * 0.3 + sideIdx * 2.6)
      const kick = Math.sin(ph * 2 + sideIdx * Math.PI)
      leg.root.rotation.x = mix(0.1 + 0.7 * bend, 0.35 * kick)
      leg.root.rotation.z = sign * mix(0.08, 0.04)
      leg.mid.rotation.x = -mix(0.15 + 1.1 * bend, 0.15 + 0.3 * Math.max(0, kick)) // knee bends back
      leg.end.rotation.x = -mix(0.35, 0.5) // pointed toes
    }
    rig.chest.rotation.x = mix(0.1 + Math.sin(t * 0.4) * 0.05, -0.05) // arch back a little when drifting
    rig.head.rotation.x = mix(0.05 + 0.3 * reachAvg, 0.55) // look up at the light / ahead when swimming

    // A slow heartbeat: two quick swells, then rest.
    if (heartRef.current) {
      const beat = Math.max(0, Math.sin(t * 5)) ** 8 + 0.6 * Math.max(0, Math.sin(t * 5 - 1)) ** 8
      heartRef.current.scale.setScalar(H * g.heart * (0.8 + 0.35 * beat))
    }

    // Bones moved: refresh world matrices so the lock roots and debug bones read the new pose.
    root.updateMatrixWorld(true)

    // ── 3. Hair locks: follow-the-leader centre lines ──
    headDir.copy(UP).applyQuaternion(root.quaternion) // up the spine, in world space
    backDir.set(0, 0, 1).applyQuaternion(root.quaternion) // behind the body
    const segment = (0.75 * H * g.hairLength) / (LOCK_POINTS - 1)
    const rootR = dims.headR
    const N = roots.length
    const rootWorld = (i: number) => tmp.copy(roots[i]).multiplyScalar(rootR).add(rig.headCenter).applyMatrix4(rig.head.matrixWorld)
    if (!chain.current || chain.current.length !== N * LOCK_POINTS * 3) {
      // First frame: hang every lock straight behind the head
      chain.current = new Float32Array(N * LOCK_POINTS * 3)
      for (let i = 0; i < N; i++) {
        rootWorld(i)
        for (let k = 0; k < LOCK_POINTS; k++) {
          const o = (i * LOCK_POINTS + k) * 3
          chain.current[o] = tmp.x + backDir.x * segment * k
          chain.current[o + 1] = tmp.y + backDir.y * segment * k
          chain.current[o + 2] = tmp.z + backDir.z * segment * k
        }
      }
    }
    const c = chain.current
    // Drift: streams away from the head when swimming; when drifting it floats up and
    // back a little and spreads (weightless hair).
    const fx = -headDir.x * 0.4 * s + backDir.x * 0.3 + UP.x * 0.04 * (1 - s)
    const fy = -headDir.y * 0.4 * s + backDir.y * 0.3 + UP.y * 0.04 * (1 - s)
    const fz = -headDir.z * 0.4 * s + backDir.z * 0.3 + UP.z * 0.04 * (1 - s)
    for (let i = 0; i < N; i++) {
      // 1. Glue the root to the (moving, turning) head
      rootWorld(i)
      const o0 = i * LOCK_POINTS * 3
      c[o0] = tmp.x
      c[o0 + 1] = tmp.y
      c[o0 + 2] = tmp.z
      // Each lock spreads a little along its root direction and sways in its own rhythm
      tmp.copy(roots[i]).applyQuaternion(root.quaternion)
      const spread = 0.07 * (1 - 0.6 * s)
      for (let k = 1; k < LOCK_POINTS; k++) {
        const o = (i * LOCK_POINTS + k) * 3
        const prev = o - 3
        // 2. Drift and sway (slow, more towards the tip)
        const sway = Math.sin(t * 0.9 + i * 1.9 + k * 0.5) * 0.22 * (k / LOCK_POINTS)
        c[o] += (fx + tmp.x * (spread + sway)) * dt
        c[o + 1] += (fy + tmp.y * spread * 0.3 + sway * 0.25) * dt
        c[o + 2] += (fz + tmp.z * (spread + sway)) * dt
        // 3. Distance constraint: exactly one segment from the previous point
        const dx = c[o] - c[prev]
        const dy = c[o + 1] - c[prev + 1]
        const dz = c[o + 2] - c[prev + 2]
        const len = Math.hypot(dx, dy, dz) || 1
        c[o] = c[prev] + (dx / len) * segment
        c[o + 1] = c[prev + 1] + (dy / len) * segment
        c[o + 2] = c[prev + 2] + (dz / len) * segment
      }
    }

    // Build the ribbons: at each centre point, step sideways by ± half the width.
    // "Sideways" = perpendicular to the lock AND to the view direction, so the ribbon
    // always shows its broad side to the camera (a billboard strip).
    const attr = locks.geometry.attributes.position as BufferAttribute
    const pos = attr.array as Float32Array
    const rootW = 0.05 * H * g.hairWidth
    for (let i = 0; i < N; i++)
      for (let k = 0; k < LOCK_POINTS; k++) {
        const o = (i * LOCK_POINTS + k) * 3
        const a = Math.max(0, k - 1) * 3 + i * LOCK_POINTS * 3
        const b = Math.min(LOCK_POINTS - 1, k + 1) * 3 + i * LOCK_POINTS * 3
        tangent.set(c[b] - c[a], c[b + 1] - c[a + 1], c[b + 2] - c[a + 2]).normalize()
        toCam.set(camera.position.x - c[o], camera.position.y - c[o + 1], camera.position.z - c[o + 2]).normalize()
        side.crossVectors(tangent, toCam).normalize()
        const f = k / (LOCK_POINTS - 1)
        // Width: full near the root, a soft swell, tapering to a point at the tip
        const w = rootW * Math.pow(1 - f, 0.8) * (0.75 + 0.5 * Math.sin(Math.PI * f))
        const v0 = (i * LOCK_POINTS + k) * 2 * 3
        pos[v0] = c[o] - side.x * w
        pos[v0 + 1] = c[o + 1] - side.y * w
        pos[v0 + 2] = c[o + 2] - side.z * w
        pos[v0 + 3] = c[o] + side.x * w
        pos[v0 + 4] = c[o + 1] + side.y * w
        pos[v0 + 5] = c[o + 2] + side.z * w
      }
    attr.needsUpdate = true

    // ── 4. Debug: the skeleton (joint to joint) and the hair centre points ──
    if (debug && debugBonesRef.current && debugHairRef.current) {
      const bones = debugBonesRef.current.geometry.attributes.position as BufferAttribute
      const bArr = bones.array as Float32Array
      let j = 0
      const put = (from: Object3D, to: Object3D) => {
        from.getWorldPosition(tmp)
        bArr[j++] = tmp.x; bArr[j++] = tmp.y; bArr[j++] = tmp.z
        to.getWorldPosition(tmp)
        bArr[j++] = tmp.x; bArr[j++] = tmp.y; bArr[j++] = tmp.z
      }
      put(rig.root, rig.chest) // lower spine
      put(rig.chest, rig.head) // upper spine + neck
      for (const n of ['armL', 'armR', 'legL', 'legR'] as LimbName[]) {
        const l = rig.limbs[n]
        put(l.parent, l.root) // chest → shoulder, hips → hip joint
        put(l.root, l.mid) // upper arm / thigh
        put(l.mid, l.end) // forearm / shin
        put(l.end, l.tip) // hand / foot
      }
      bones.needsUpdate = true
      const dh = debugHairRef.current.geometry.attributes.position as BufferAttribute
      ;(dh.array as Float32Array).set(c.subarray(0, Math.min(c.length, dh.array.length)))
      dh.needsUpdate = true
    }
  })

  return (
    <>
      <group ref={rootRef}>
        {/* The skinned body, its outline, the bones and the head details */}
        <primitive object={built.group} />
        {/* Heart: a piece of moonlight, seen through the body (depthTest off) */}
        <group position={[0, dims.T * 0.7, 0]} ref={heartRef}>
          <sprite scale={0.1} renderOrder={10}>
            <spriteMaterial map={glowTexture} color={HEART} blending={AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
          </sprite>
        </group>
      </group>

      {/* Hair locks live in world space (they lag behind the body), so no culling */}
      <mesh ref={locksRef} geometry={lockGeometry} frustumCulled={false}>
        <meshBasicMaterial vertexColors side={DoubleSide} toneMapped={false} />
      </mesh>

      {debug && (
        <>
          <lineSegments ref={debugBonesRef} geometry={debugBones} frustumCulled={false} renderOrder={11}>
            <lineBasicMaterial color={DEBUG} depthTest={false} transparent />
          </lineSegments>
          <points ref={debugHairRef} geometry={debugHair} frustumCulled={false}>
            <pointsMaterial color={DEBUG} size={0.035} transparent opacity={0.7} depthWrite={false} />
          </points>
        </>
      )}
    </>
  )
}
