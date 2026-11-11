import { Bone, BufferGeometry, Float32BufferAttribute, Object3D, Skeleton, Uint16BufferAttribute, Vector3 } from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// A procedural skinned body (option A of the hero fidelity plan)
//
// Before: ~20 separate rigid pieces meeting at the joints (seams at every elbow).
// Now: ONE continuous skin, generated from the skeleton, that bends smoothly.
//
//   1. BONES. A tree of three.js Bones in a rest ("bind") pose: limbs hanging straight
//      down. Rotating a bone later moves everything below it.
//
//   2. TUBES ALONG THE BONES. Each chain (torso + neck + head, each arm, each leg) is a
//      tube: rings of vertices stacked along the chain. Each ring's radius comes from a
//      smooth PROFILE (a few control radii joined by a Catmull-Rom curve): narrow
//      wrists, round calves, a waist, a neck flowing into the head. Rings can be
//      ellipses (flat hands, a torso wider than deep). Ends are closed with round caps.
//
//   3. SKIN WEIGHTS. Every vertex stores up to 4 (bone, weight) pairs. Far from a joint,
//      a vertex follows one bone 100%. Near a joint it's shared: e.g. at the elbow,
//      50% upper arm + 50% forearm, sliding smoothly from one to the other over a
//      short blend zone. When the forearm rotates, the skin around the elbow
//      stretches and bends instead of breaking: that's "skinning" (linear blend
//      skinning, the same technique game characters use). The GPU does the blend for
//      every vertex, every frame.
//
// Arms and legs start slightly inside the torso, so where chains meet there's no gap.
// ─────────────────────────────────────────────────────────────────────────────

export type BodyDims = {
  H: number // body height unit
  T: number // torso length
  headR: number
  headY: number // head centre (above the hips)
  shoulderX: number
  shoulderY: number
  upperArm: number
  foreArm: number
  hipX: number
  hipY: number
  thigh: number
  shin: number
}

export type LimbName = 'armL' | 'armR' | 'legL' | 'legR'
export type Limb = { root: Bone; mid: Bone; end: Bone; tip: Object3D; parent: Bone }

export type Rig = {
  root: Bone // at the hips (the body origin)
  chest: Bone
  head: Bone // at the base of the neck
  headCenter: Vector3 // the head's centre, in the head bone's space
  limbs: Record<LimbName, Limb>
  skeleton: Skeleton
  geometry: BufferGeometry
}

// A profile control point: arc length s → radius r, ellipse scales (sx sideways, sz front/back)
type Ctrl = { s: number; r: number; sx?: number; sz?: number }

// Catmull-Rom through the control radii: a smooth curve that passes through every
// control point (no kinks, so the toon shading doesn't show creases).
function profileAt(ctrl: Ctrl[], s: number) {
  const n = ctrl.length
  if (s <= ctrl[0].s) return { r: ctrl[0].r, sx: ctrl[0].sx ?? 1, sz: ctrl[0].sz ?? 1 }
  if (s >= ctrl[n - 1].s) return { r: ctrl[n - 1].r, sx: ctrl[n - 1].sx ?? 1, sz: ctrl[n - 1].sz ?? 1 }
  let k = 0
  while (k < n - 2 && s > ctrl[k + 1].s) k++
  const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(n - 1, k + 2)]
  const t = (s - p1.s) / (p2.s - p1.s)
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
  const lin = (a: number, b: number) => a + (b - a) * t
  return {
    r: Math.max(0, cr(p0.r, p1.r, p2.r, p3.r)),
    sx: lin(p1.sx ?? 1, p2.sx ?? 1),
    sz: lin(p1.sz ?? 1, p2.sz ?? 1),
  }
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Collects the vertices of all tubes into one geometry
class SkinBuilder {
  pos: number[] = []
  skinIndex: number[] = []
  skinWeight: number[] = []
  index: number[] = []

  // One tube along a straight line (the bind pose has straight chains).
  //   origin + dir·s = ring centre;  side/front = the ring's ellipse axes
  //   radius(s) gives {r, sx, sz};  weights(s) gives up to two [bone, weight] pairs
  tube(
    origin: Vector3, dir: Vector3, side: Vector3, front: Vector3,
    s0: number, s1: number, rings: number, segments: number,
    radius: (s: number) => { r: number; sx: number; sz: number },
    weights: (s: number) => [number, number][],
  ) {
    const base = this.pos.length / 3
    for (let i = 0; i < rings; i++) {
      const s = s0 + ((s1 - s0) * i) / (rings - 1)
      const { r, sx, sz } = radius(s)
      const w = weights(s)
      for (let j = 0; j < segments; j++) {
        const a = (j / segments) * Math.PI * 2
        const cx = Math.cos(a) * r * sx
        const cz = Math.sin(a) * r * sz
        this.pos.push(
          origin.x + dir.x * s + side.x * cx + front.x * cz,
          origin.y + dir.y * s + side.y * cx + front.y * cz,
          origin.z + dir.z * s + side.z * cx + front.z * cz,
        )
        this.skinIndex.push(w[0][0], w[1]?.[0] ?? 0, 0, 0)
        this.skinWeight.push(w[0][1], w[1]?.[1] ?? 0, 0, 0)
      }
    }
    // Triangles between neighbouring rings. Winding must make normals point OUT:
    // (dir × front) should match side; if not, flip.
    const flip = new Vector3().crossVectors(dir, front).dot(side) < 0
    for (let i = 0; i < rings - 1; i++)
      for (let j = 0; j < segments; j++) {
        const a = base + i * segments + j
        const b = base + i * segments + ((j + 1) % segments)
        const c = a + segments
        const d = b + segments
        if (flip) this.index.push(a, b, c, b, d, c)
        else this.index.push(a, c, b, b, c, d)
      }
  }

  build() {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(this.pos, 3))
    geo.setAttribute('skinIndex', new Uint16BufferAttribute(this.skinIndex, 4))
    geo.setAttribute('skinWeight', new Float32BufferAttribute(this.skinWeight, 4))
    geo.setIndex(this.index)
    geo.computeVertexNormals()
    return geo
  }
}

// Bone indices in the skeleton (and in skinIndex)
const ROOT = 0, CHEST = 1, HEAD = 2
const LIMB_BASE: Record<LimbName, number> = { armL: 3, armR: 6, legL: 9, legR: 12 }

export function buildRig(d: BodyDims): Rig {
  const { H, T, headR: R } = d
  const chestY = 0.55 * T // the waist bends between the hips and here
  const neckY = 1.03 * T
  const handLen = 0.055 * H
  const footLen = 0.085 * H

  // ── 1. Bones, in the bind pose ──
  const root = new Bone()
  const chest = new Bone()
  chest.position.set(0, chestY, 0)
  root.add(chest)
  const head = new Bone()
  head.position.set(0, neckY - chestY, 0)
  chest.add(head)

  const makeLimb = (parent: Bone, at: Vector3, l1: number, l2: number, l3: number): Limb => {
    const r = new Bone(); r.position.copy(at); parent.add(r)
    const m = new Bone(); m.position.set(0, -l1, 0); r.add(m)
    const e = new Bone(); e.position.set(0, -l2, 0); m.add(e)
    const tip = new Object3D(); tip.position.set(0, -l3, 0); e.add(tip)
    return { root: r, mid: m, end: e, tip, parent }
  }
  const limbs: Record<LimbName, Limb> = {
    armL: makeLimb(chest, new Vector3(-d.shoulderX, d.shoulderY - chestY, 0), d.upperArm, d.foreArm, handLen),
    armR: makeLimb(chest, new Vector3(d.shoulderX, d.shoulderY - chestY, 0), d.upperArm, d.foreArm, handLen),
    legL: makeLimb(root, new Vector3(-d.hipX, d.hipY, 0), d.thigh, d.shin, footLen),
    legR: makeLimb(root, new Vector3(d.hipX, d.hipY, 0), d.thigh, d.shin, footLen),
  }
  const bones = [root, chest, head]
  for (const n of ['armL', 'armR', 'legL', 'legR'] as LimbName[]) bones.push(limbs[n].root, limbs[n].mid, limbs[n].end)
  root.updateMatrixWorld(true)
  const skeleton = new Skeleton(bones) // stores each bone's inverse bind matrix

  const sb = new SkinBuilder()
  const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1), DOWN = new Vector3(0, -1, 0)

  // ── 2a. Torso + neck + head: one tube going up from the hips ──
  // Body radii (in H) at heights (in T), wider than deep (sx > sz)
  const body: Ctrl[] = [
    { s: -0.06 * T, r: 0.0, sx: 1.15, sz: 0.9 },
    { s: 0.0, r: 0.052 * H, sx: 1.2, sz: 0.88 },
    { s: 0.12 * T, r: 0.064 * H, sx: 1.2, sz: 0.88 }, // hips
    { s: 0.42 * T, r: 0.052 * H, sx: 1.15, sz: 0.86 }, // waist
    { s: 0.7 * T, r: 0.062 * H, sx: 1.18, sz: 0.88 }, // chest
    { s: 0.86 * T, r: 0.066 * H, sx: 1.25, sz: 0.8 }, // shoulders
    { s: 0.97 * T, r: 0.04 * H, sx: 1.1, sz: 0.9 },
    { s: 1.03 * T, r: 0.021 * H, sx: 1, sz: 1 }, // neck
    { s: d.headY - R * 0.6, r: 0.021 * H, sx: 1, sz: 1 },
  ]
  const headRy = R * 1.08
  const torsoProfile = (s: number) => {
    const b = s <= d.headY - R * 0.6 ? profileAt(body, s) : { r: 0, sx: 1, sz: 1 }
    const dy = (s - d.headY) / headRy
    const hr = dy * dy < 1 ? R * 0.93 * Math.sqrt(1 - dy * dy) : 0 // the head: an ellipse in profile
    // Smooth maximum of neck and head, so the neck flows into the jaw without a crease
    const k = 0.012 * H
    const h = Math.max(k - Math.abs(b.r - hr), 0) / k
    const r = Math.max(b.r, hr) + h * h * k * 0.25
    const headness = hr > b.r ? 1 : 0
    return { r, sx: headness ? 1 : b.sx, sz: headness ? 1.02 : b.sz }
  }
  const torsoWeights = (s: number): [number, number][] => {
    if (s < neckY - 0.08 * T) {
      const t = smoothstep(chestY - 0.2 * T, chestY + 0.15 * T, s) // hips → chest across the waist
      return [[ROOT, 1 - t], [CHEST, t]]
    }
    const t = smoothstep(neckY - 0.08 * T, neckY + 0.06 * T, s) // chest → head across the neck
    return [[CHEST, 1 - t], [HEAD, t]]
  }
  sb.tube(new Vector3(0, 0, 0), Y, X, Z, -0.06 * T, d.headY + headRy, 72, 24, torsoProfile, torsoWeights)

  // ── 2b. Limbs: tubes hanging down from each shoulder / hip ──
  const limbTube = (name: LimbName, origin: Vector3, ctrl: Ctrl[], l1: number, l2: number, blend: number) => {
    const b = LIMB_BASE[name]
    const r0 = ctrl[0].r
    const last = ctrl[ctrl.length - 1]
    const sEnd = last.s
    const capEnd = Math.max(last.r, 0.004 * H)
    const radius = (s: number) => {
      if (s < 0) { const q = s / r0; return { r: r0 * Math.sqrt(Math.max(0, 1 - q * q)), sx: ctrl[0].sx ?? 1, sz: ctrl[0].sz ?? 1 } } // round cap
      if (s > sEnd) { const q = (s - sEnd) / capEnd; return { r: last.r * Math.sqrt(Math.max(0, 1 - q * q)), sx: last.sx ?? 1, sz: last.sz ?? 1 } }
      return profileAt(ctrl, s)
    }
    const weights = (s: number): [number, number][] => {
      if (s < l1 + blend) { const t = smoothstep(l1 - blend, l1 + blend, s); return [[b, 1 - t], [b + 1, t]] }
      const t = smoothstep(l1 + l2 - blend * 0.7, l1 + l2 + blend * 0.7, s)
      return [[b + 1, 1 - t], [b + 2, t]]
    }
    sb.tube(origin, DOWN, X, Z, -r0, sEnd + capEnd, 46, 14, radius, weights)
  }
  const ua = d.upperArm, fa = d.foreArm
  const arm: Ctrl[] = [
    { s: 0, r: 0.028 * H },
    { s: ua * 0.4, r: 0.026 * H },
    { s: ua, r: 0.019 * H }, // elbow
    { s: ua + fa * 0.35, r: 0.021 * H }, // forearm
    { s: ua + fa, r: 0.0125 * H }, // wrist
    { s: ua + fa + handLen * 0.45, r: 0.017 * H, sx: 0.65, sz: 1.3 }, // palm (flat)
    { s: ua + fa + handLen, r: 0.008 * H, sx: 0.6, sz: 1.1 }, // fingertips
  ]
  const th = d.thigh, sh = d.shin
  const leg: Ctrl[] = [
    { s: 0, r: 0.047 * H },
    { s: th * 0.35, r: 0.043 * H }, // thigh
    { s: th, r: 0.028 * H }, // knee
    { s: th + sh * 0.3, r: 0.031 * H }, // calf
    { s: th + sh, r: 0.016 * H }, // ankle
    { s: th + sh + footLen * 0.4, r: 0.016 * H, sx: 0.8, sz: 1.15 }, // foot
    { s: th + sh + footLen, r: 0.005 * H }, // pointed toes
  ]
  for (const n of ['armL', 'armR'] as LimbName[])
    limbTube(n, new Vector3(n === 'armL' ? -d.shoulderX : d.shoulderX, d.shoulderY, 0), arm, ua, fa, 0.03 * H)
  for (const n of ['legL', 'legR'] as LimbName[])
    limbTube(n, new Vector3(n === 'legL' ? -d.hipX : d.hipX, d.hipY, 0), leg, th, sh, 0.035 * H)

  return {
    root, chest, head,
    headCenter: new Vector3(0, d.headY - neckY, 0),
    limbs, skeleton,
    geometry: sb.build(),
  }
}
