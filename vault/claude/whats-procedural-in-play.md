# What is procedural in the game (Play mode)

> **Removed 2026-11-15** after professor feedback: the project stays in the atlas direction. See [[atlas-over-game]]. Kept as history; the code is in commit 5622774.

Almost everything on screen is generated from rules + a seed, not modelled by hand. In the order you meet it:

| What you see | How it's made | Module |
|---|---|---|
| Ocean planet (title) | Sphere (UV / cube / ico / Fibonacci) with heights from 3D noise or the wrapped seafloor map | 5, 6 |
| Seafloor | Seeded noise heightmap (Simplex fBm, 5 octaves); same seed = same seafloor | 5, 9 |
| Seamount shape | Island mask: `h − smoothstep(distance) × drop` sinks the rim into the abyss | 5 |
| Solid ground | Collision = a lookup in the same heightmap | 5 |
| Kelp | Poisson-disk sampling, filtered by height band + slope | 15, 16 |
| Reefs | Poisson-disk points, filtered to high ground | 15, 16 |
| Migration routes | Graph between reefs (Gabriel), A* over a slope-cost grid | 21, 22 |
| Plankton | Seeded positions in a wrapping box (endless water), advected by a curl-noise vector field | 12–14, 24 |
| The glow | One excitation rule for everything: rises near the moving player, decays; brightness = excitation | core |
| Caustics | Worley-noise GLSL shader, per pixel on the GPU | shaders |
| Moon child | Body from a genome (height, head, limbs, hair): procedural skinned mesh, radius curves along a skeleton | 19 |
| Her animation | Sine waves, no keyframes; idle ↔ swim blended by speed | 19, 20 |
| Her hair | Follow-the-leader chains | 19 |
| Light & darkness | Water colour, fog, god rays, night light = functions of `moonPhase`; her reveal light = you see only what's near | 25 |
| Moon icons | Terminator = half an ellipse, `rx = r·|2·lit − 1|` | math |

**Hand-authored:** story lines and their timing, the palette, the game loop rules (5 reefs → full moon), the camera dive.

**Presentation line:** every part of the world comes from a small rule + a seed. Change the seed and the seafloor, kelp, reefs and routes all regenerate together, because they all read the same heightmap. "You are the disturbance" is the same idea: one small local rule (excitation) adds up to the whole glowing trail.

Related: [[play-mode]], [[final-presentation-plan]], [[procedural-atlas-overview]]
