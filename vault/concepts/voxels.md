# Voxels (the voxel reef)

Class modules 7–8. In the project: the **Voxel reef** tab (`src/modules/voxels/`). Blocky cubes on purpose: seeing the cubes *is* the lesson (smooth marching cubes could be a later option).

![[2026-10-05-voxels-seabed.png]]

## The idea
A **voxel** is a 3D pixel: one cube in a regular 3D grid. Here each stores one bit: **rock or water**.
- A heightmap ([[heightmaps-and-noise]]) has **one height per (x, z)**, so it can only make hills.
- A voxel grid can have **rock above water above rock** in the same column, which caves, tunnels, overhangs and arches need.

Storage: one flat array, `index(x, y, z) = (y·nz + z)·nx + x` (the heightmap's row-by-row idea plus a third axis). Default grid 48 × 24 × 48 = 55,296 voxels.

## Density functions (dropdown)
Each voxel becomes rock if `density(x, y, z) > threshold`. Changing the function changes the world:

| Shape | Density | Result |
|---|---|---|
| **Seabed + caves** | `(ground − y/ny)·1.2 + fbm3D(p)` | Solid below the ground, empty above, carved by 3D noise: caves, pillars, overhangs |
| **3D noise caves** | `fbm3D(p)` | Floating Swiss-cheese reef chunks with holes through them |
| **Spheres** | `max over balls of (1 − dist / radius)` | The simplest rule, to show the idea |

`fbm3D` = 3 octaves of 3D Perlin noise. The ×1.2 sets how strongly "below ground = rock" beats the noise; at ×2.5 the seabed was a flat plateau with sealed caves.

![[2026-10-05-voxels-caves.png]]
*3D noise caves, with glowing life in the sheltered hollows.*

## Meshing: only draw the faces you can see
Each rock voxel is a cube with 6 faces, but a face that touches another rock voxel is buried and can never be seen. For every face, check the neighbour on that side: **rock → skip**, water/outside → draw (4 vertices, 2 triangles, corners ordered counter-clockwise from outside so three.js knows the front side).

Measured on the default seabed: **~91–93% of faces skipped** (e.g. 9,730 drawn vs. 130,604 skipped). The live counts are in the panel ("Voxel stats").

![[2026-10-05-voxels-debug.png]]
*Debug: every drawn face outlined, plus the grid's bounding box.*

## Theme details
- Depth colours in the cobalt palette ([[design-reference-cosmos-board]]), with a small random variation per voxel so single cubes read.
- **Cave glow:** water voxels with rock somewhere above them (found by scanning each column from the top down) sometimes hold glowing sea-green life: life hiding in shelter.

## Animation and inspection
- **Build animation** (button): reveals the grid layer by layer from the bottom up (layers per second slider). Only voxels below the current layer count as rock, so the mesh is rebuilt about ny times.
- **Slice:** hides layers above a fraction of the height, so faces at the cut become visible and you can look into the caves.

![[2026-10-05-voxels-slice.png]]

## Notes
- The face counts were first a floating HTML label (drei `<Html>`), which logged a React 19 unmount warning when toggled; they now live as read-only fields in the slider panel.
- Not in the World yet (to keep it readable). Voxels over the spherical planet (module 8) are a later step.
