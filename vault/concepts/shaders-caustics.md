# Shaders: moonlight caustics

Class topic: shaders. In the project: the **Caustics (shader)** tab (`src/modules/caustics/`). The shader itself is in `causticsShader.ts`, which is the file to open in the presentation.

![[2026-10-05-caustics-layered.png]]

## What a shader is
A small program that runs on the **GPU**, massively in parallel:
- **Vertex shader:** runs once per vertex; decides where it lands on screen (and passes values on).
- **Fragment shader:** runs once per pixel; decides its colour.

Every pixel runs the same code at the same time, knowing only its own inputs:
- **attributes** (per vertex: position, normal),
- **uniforms** (the same for everyone: time, slider values),
- **varyings** (values from the vertex shader, blended across each triangle).

## The idea: caustics from Worley noise
Rippling water focuses moonlight into a dancing web of bright lines on the seafloor (the blue veins on the [[design-reference-cosmos-board]]). We fake them with **animated Worley noise**:
1. Each grid cell owns one point, which drifts in a small circle over time: `pointPos = 0.5 + 0.4·sin(time + 2π·random)`.
2. For each pixel, find **F1** (distance to the nearest point) and **F2** (second nearest), checking only the 3×3 neighbouring cells.
3. **F2 − F1 ≈ 0** means the pixel is on a border between two cells → light: `web = (1 − (F2 − F1)·1.6)^sharpness`. The exponent keeps only pixels very close to a border, so the lines get thin.
4. **Layered:** a second, finer web drifting another way, added on top; crossings add up, closer to real caustics.
5. Brighter on **high ground** (closer to the moonlit surface) and on **upward-facing** surfaces (normals; corrected for the terrain's vertical stretch: scaling y by s divides the normal's y by s).
6. **Fog:** the layer is dimmed with distance using three's fog uniforms, so it fades like everything else.

Same Worley idea as the seafloor's Worley noise ([[heightmaps-and-noise]]), but now computed per pixel on the GPU, every frame.

![[2026-10-05-caustics-debug.png]]
*Debug: each Worley cell in its own colour; the web lights up exactly on the borders.*

## How it's drawn
- A **second mesh with the seafloor's exact shape** (shared `buildTerrainGeometry`) on top of the terrain, with a custom `ShaderMaterial`.
- **Additive blending**: its output is *added* to the terrain colours, the way light adds up.
- `polygonOffset` pulls it a hair towards the camera to avoid z-fighting with the identical surface underneath; `renderOrder = 1` draws it after the terrain.
- Uniforms (time + sliders) are updated every frame in `useFrame`.

## Variants and sliders
Dropdown: **Layered webs / Worley web / Off**. Sliders: size, speed, intensity, sharpness, height boost.

| Off | Worley web |
|---|---|
| ![[2026-10-05-caustics-off.png]] | ![[2026-10-05-caustics-worley.png]] |

## In the World
Modules can now provide a `WorldLayer`: what the World adds for them. The caustics add just their light layer on the World's seafloor.

Defaults were dimmed (intensity 0.7) after the first World test: bright caustics washed out the bioluminescence. That's the "moonlight vs. bioluminescence" tension from the concept, and later the **moon phase** should drive this brightness (full moon = strong caustics, faint glow).

![[2026-10-05-world-caustics.png]]
