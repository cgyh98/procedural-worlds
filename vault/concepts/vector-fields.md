# Vector fields

Class modules 12–14. In the project: the **Currents** tab (`src/modules/currents/`).

![[2026-10-04-currents-debug.png]]
*Currents tab with debug on: curl-noise field arrows (amber) and the plankton following them.*

## The idea
A vector field assigns an arrow (a vector) to every point in space. For the ocean, the arrow is the water's velocity at that point: which way it flows and how fast. In code it's just a function:

```
field(x, y, z, t) → (vx, vy, vz)
```

## Advection: how particles follow a field
Drop a particle in the field and, every frame, move it a small step along the arrow under it:

```
position += field(position, time) × dt
```

This is called **advection** (technically Euler integration). Thousands of plankton doing this make the invisible field visible. `dt` is clamped so a long frame (after switching browser tabs) doesn't teleport everything.

## Field variants (the dropdown)
| Variant | What it is | What it shows |
|---|---|---|
| **Uniform** | Same arrow everywhere | Baseline: parallel motion, nothing interesting |
| **Vortex** | Rankine vortex around the vertical axis: speed ∝ r/R inside the core (solid-body spin), ∝ R/r outside | A whirlpool; `vertical` adds a downward drain |
| **Curl noise** | The curl of a smooth noise "potential" ψ | Natural swirling currents with no clumping |

## Curl noise, in more detail
- Start with three smooth noise functions (ψx, ψy, ψz): see [[noise-pipeline]] for noise itself (Perlin noise now lives in `src/lib/noise.ts`).
- The **curl** measures rotation: `curl ψ = (∂ψz/∂y − ∂ψy/∂z, ∂ψx/∂z − ∂ψz/∂x, ∂ψy/∂x − ∂ψx/∂y)`.
- The curl of anything is **divergence-free**: no sources (flow appearing from nowhere) and no sinks (flow vanishing). Like incompressible water, particles never pile up or leave holes.
- Derivatives are estimated with **finite differences**: `∂f/∂y ≈ (f(y+e) − f(y−e)) / 2e`.
- Real ocean currents are mostly horizontal, so there's also a **2D curl** (`v = (∂ψ/∂z, 0, −∂ψ/∂x)`), blended with the 3D one by the `vertical` slider. A mix of divergence-free fields stays divergence-free.
- Checked numerically: measured divergence ≈ 0.0005 against speeds around 0.5–2 (just rounding error).

## Infinite water: modulo wrap
The plankton live in a box. Leaving one face re-enters from the opposite face, so the water feels endless at no cost.

## Ocean / bioluminescence link
- Plankton glow brighter the faster their water moves ("moving water stirs the glow"). The player-driven version is [[excitation-and-player]].
- Glow = emissive colour above 1 + `toneMapped={false}` + bloom post-processing (no real lights).

## Debug view
A grid of line "arrows" sampling the field, dark tail → amber head, plus the wrap box.

## Cost
About 14 noise samples per plankton per frame for curl noise; ~1.3 ms per 4000 plankton on the CPU (default is now 8000, ≈2.6 ms). A GPU version is a possible later optimization (modules 23–25).
