import type { Vector3 } from 'three'
import { createPerlin3D } from '../../lib/noise'

// ─────────────────────────────────────────────────────────────────────────────
// Vector fields (class modules 12–14)
//
// A vector field is a function: give it a point in space (and a time), and it
// returns an arrow (a velocity) for that point. Here: which way, and how fast,
// the ocean water flows there.
//
// Each variant below is one algorithm for the dropdown, so they can be compared.
// They all share the same signature, so the plankton and the debug arrows don't
// care which one is active.
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType = 'uniform' | 'vortex' | 'curl'

export type FieldParams = {
  type: FieldType
  size: number // feature size in world units (swirl size / whirlpool core radius)
  strength: number // overall flow speed
  vertical: number // 0 = flat horizontal flow, 1 = full 3D flow
  evolution: number // how fast the field itself changes over time (curl only)
  seed: number
}

// Writes the velocity at (x, y, z, t) into `out` and returns it.
// Writing into an existing vector (instead of returning a new one) matters here:
// this runs thousands of times per frame, and creating objects that often makes
// the garbage collector stutter.
export type VectorField = (x: number, y: number, z: number, t: number, out: Vector3) => Vector3

export function createField(params: FieldParams): VectorField {
  switch (params.type) {
    case 'uniform':
      return uniformField(params)
    case 'vortex':
      return vortexField(params)
    case 'curl':
      return curlNoiseField(params)
  }
}

// ── Uniform: the same arrow everywhere ───────────────────────────────────────
// The simplest possible field, a steady current. Useful as a baseline:
// every plankton moves in parallel, nothing interesting happens.
function uniformField({ strength }: FieldParams): VectorField {
  // A fixed direction, normalized (length 1) and then scaled by strength.
  const len = Math.hypot(1, 0.35)
  const dx = (1 / len) * strength
  const dz = (0.35 / len) * strength
  return (_x, _y, _z, _t, out) => out.set(dx, 0, dz)
}

// ── Vortex: a whirlpool around the vertical axis ─────────────────────────────
// A "Rankine vortex", the textbook model of a real whirlpool:
//   - inside the core (r < R) the water spins like a solid disk:
//     speed grows with distance from the center (speed ∝ r / R)
//   - outside the core it slows down with distance (speed ∝ R / r)
// The direction is always tangent to the circle around the center:
// rotating (x, z) by 90° gives (−z, x).
// `vertical` adds a downward pull, like water draining into the whirlpool.
function vortexField({ size, strength, vertical }: FieldParams): VectorField {
  const R = size
  return (x, _y, z, _t, out) => {
    const r = Math.hypot(x, z)
    if (r < 1e-6) return out.set(0, -vertical * strength, 0) // dead center: only sinking
    const speed = (r < R ? r / R : R / r) * strength
    // (−z, x) / r is the unit tangent; multiply by speed
    return out.set((-z / r) * speed, -vertical * speed * 0.5, (x / r) * speed)
  }
}

// ── Curl noise: natural-looking swirling currents ────────────────────────────
// Start from smooth noise ψ ("psi", called a potential). Its *curl* measures how
// much ψ "rotates" around each point, and is itself a vector field:
//
//   curl ψ = ( ∂ψz/∂y − ∂ψy/∂z ,  ∂ψx/∂z − ∂ψz/∂x ,  ∂ψy/∂x − ∂ψx/∂y )
//
// The key property: the curl of anything is *divergence-free*. It has no sources
// (points where flow appears from nowhere) and no sinks (points where it vanishes).
// Like real water, which can't be compressed, particles following it never pile up
// or leave empty holes, they just swirl.
//
// The ∂ (partial derivatives) are estimated with *finite differences*:
//   ∂f/∂y ≈ ( f(y + e) − f(y − e) ) / 2e
// i.e. sample the noise a tiny step on each side and look at the change.
function curlNoiseField({ size, strength, vertical, evolution, seed }: FieldParams): VectorField {
  // Three independent noise functions = the three components of ψ.
  const nx = createPerlin3D(seed)
  const ny = createPerlin3D(seed + 101)
  const nz = createPerlin3D(seed + 202)
  const f = 1 / size // frequency: bigger size → slower-changing noise → bigger swirls
  const e = 0.01 // finite-difference step (in noise space)
  const inv2e = 1 / (2 * e)

  // Time offset, shared by the helpers below. Each component drifts through
  // noise space along a different axis, so the field morphs instead of just sliding.
  let T = 0
  const psiX = (a: number, b: number, c: number) => nx(a, b, c + T)
  const psiY = (a: number, b: number, c: number) => ny(a + T, b, c)
  const psiZ = (a: number, b: number, c: number) => nz(a, b + T, c)

  return (x, y, z, t, out) => {
    T = t * evolution * 0.1
    const X = x * f
    const Y = y * f
    const Z = z * f

    // Partial derivatives of each ψ component, by finite differences
    const dPsiZ_dy = (psiZ(X, Y + e, Z) - psiZ(X, Y - e, Z)) * inv2e
    const dPsiY_dz = (psiY(X, Y, Z + e) - psiY(X, Y, Z - e)) * inv2e
    const dPsiX_dz = (psiX(X, Y, Z + e) - psiX(X, Y, Z - e)) * inv2e
    const dPsiZ_dx = (psiZ(X + e, Y, Z) - psiZ(X - e, Y, Z)) * inv2e
    const dPsiY_dx = (psiY(X + e, Y, Z) - psiY(X - e, Y, Z)) * inv2e
    const dPsiX_dy = (psiX(X, Y + e, Z) - psiX(X, Y - e, Z)) * inv2e

    // Full 3D curl
    const cx = dPsiZ_dy - dPsiY_dz
    const cy = dPsiX_dz - dPsiZ_dx
    const cz = dPsiY_dx - dPsiX_dy

    // Flat 2D curl (horizontal swirls only), using ψz as a single potential:
    //   v = ( ∂ψ/∂z, 0, −∂ψ/∂x )
    // Real ocean currents are mostly horizontal, so this is the "realistic" end.
    // (Note: we reuse ∂ψz/∂x and estimate ∂ψz/∂z here.)
    const dPsiZ_dz = (psiZ(X, Y, Z + e) - psiZ(X, Y, Z - e)) * inv2e
    const fx = dPsiZ_dz
    const fz = -dPsiZ_dx

    // Blend flat → 3D with `vertical`. A mix of two divergence-free fields is still
    // divergence-free, so the "no clumping" property survives the blend.
    const k = 0.5 * strength
    return out.set(
      (fx + (cx - fx) * vertical) * k,
      cy * vertical * k,
      (fz + (cz - fz) * vertical) * k,
    )
  }
}
