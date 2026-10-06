# Erosion (sediment flows on the seafloor)

Class module 10. In the project: the **Erosion** tab (`src/modules/erosion/`). Ported from my CLASS_03 prototype (droplet erosion after Hans Theobald Beyer / Sebastian Lague; see [[noise-pipeline]]).

| Before | After |
|---|---|
| ![[2026-10-06-erosion-before.png]] | ![[2026-10-06-erosion-after.png]] |

## The ocean reading
On land, raindrops carve valleys. Underwater, the same physics happens through **turbidity currents**: avalanches of sediment-laden water that rush down slopes, carve **submarine canyons**, and spread **sediment fans** that flatten the **abyssal plains**. Each simulated "droplet" is one such flow.

## The algorithm (per droplet)
Start at a random point with speed 1, flow 1, sediment 0. For up to 40 steps:
1. **Height and gradient** at the current (fractional) position, by bilinear interpolation of the 4 surrounding grid points.
2. **Direction** = blend of the previous direction (`inertia`) and downhill (−gradient); normalize; move one cell.
3. `Δh` = new height − old height (negative = going down).
4. **Capacity** = `max(−Δh × speed × flow × capacityFactor, minCapacity)`: fast, steep, strong flows carry more.
5. If going **uphill** or **overloaded** → **deposit** (fill the dip / drop the excess × depositSpeed). Otherwise → **erode** `min((capacity − sediment) × erodeSpeed, −Δh)` (never dig deeper than the step just taken).
6. Changes are **splatted bilinearly** onto the 4 surrounding grid points.
7. `speed = √(speed² − Δh·gravity)`, `flow *= 1 − evaporate`; stop when the flow runs out or leaves the map.

**A sign fix from the prototype:** the original used `speed² + Δh·g`, which *slows* a droplet going downhill (Δh < 0). Flipped to `− Δh·g` so gravity speeds flows up on the way down.

## Tuning, measured
On the default 160² seafloor, 60,000 flows:

| Capacity | Deepest cut | Biggest fill | Roughness (orig. 0.0151) |
|---|---|---|---|
| 0.5 | 0.39 | 0.53 | 0.0150 |
| 1 | 0.45 | 0.63 | 0.0162 |
| **2 (default)** | **0.68** | **0.71** | 0.0169 |
| 4 (prototype) | 0.95 | 0.78 | 0.0169 |

Heights span 2.0, so the prototype's capacity 4 carved nearly half the relief (our map has steeper slopes per cell than CLASS_03's). Roughness barely changes, so erosion reshapes smoothly instead of creating spikes. Speed: ~0.3–0.6 ms per frame for 120 flows.

## Live simulation (animation requirement)
- Each frame runs a batch of flows on a working copy of the heightmap, writes the heights into the mesh, and recomputes normals.
- Play / pause, reset, flows per frame, total flows (in thousands), and every physics parameter as sliders.
- A read-only counter shows progress.

## Debug
Change map (amber = carved away, cyan = deposited, scaled so a 0.25 change is full colour) + white dots tracing the latest flows.

![[2026-10-06-erosion-debug.png]]

Result: ridges sharpen into gullies, valleys fill into flat sediment plains, which is how real abyssal plains form.

## Not yet
The eroded terrain doesn't feed the other tabs or the World yet (lab tab for now).
