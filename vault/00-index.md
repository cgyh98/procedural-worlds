# Procedural Worlds: Bioluminescent Ocean (Index)

> You are the disturbance.

## Journal
- [[2026-10-04]]: project setup and concept
- [[2026-10-05]]: seafloor map, presentation prep
- [[2026-10-06]]: wake ellipsoid + procedural jellyfish player

## Concepts
- [[noise-pipeline]]: noise → fBm → shaping → blending → erosion → mesh (notes from the CLASS_03 prototype; the code was removed and lives in the PWB_CLASS_03 folder and the first commit)

- [[heightmaps-and-noise]]: heightmaps, Perlin / Simplex / Worley, fBm, ridged (Seafloor map tab, modules 5 + 9)
- [[distributions]]: random vs. jittered grid vs. Poisson disk, filtered by height and slope (Kelp distribution tab, modules 15–16)
- [[paths-and-networks]]: MST / Gabriel / k-nearest graphs, A* vs. Dijkstra over the terrain (Reef paths tab, modules 21–22)
- [[shaders-caustics]]: custom GLSL shader, animated Worley caustics (Caustics tab, shaders topic)
- [[erosion]]: droplet erosion as underwater sediment flows, live simulation (Erosion tab, module 10)
- [[biomes-and-flood-fill]]: depth zones / habitats, tides, flood fill for enclosed bioluminescent bays (Biomes & tides tab, module 11)
- [[voxels]]: rock/water voxel grid, density functions, visible-face meshing (Voxel reef tab, modules 7–8)
- [[vector-fields]]: vector fields, advection, curl noise, vortex (Currents tab, modules 12–14)
- [[excitation-and-player]]: the excitation rule, wake ellipsoid, jellyfish player, follow camera (Disturbance tab, core mechanic)

## Decisions
- [[repo-and-vault-setup]]
- [[r3f-vs-vanilla-threejs]] (accepted)
- [[ui-tabs-per-module]] (accepted): one lab tab per module + a combined World tab
- [[two-scale-ocean-planet]] (accepted): ocean planet as the atlas cover + dive view
- [[firebase-hosting-setup]] (accepted): personal Firebase project, live at https://bioluminescent-ocean.web.app

## Open questions
See "Open questions" in `CLAUDE.md`.

## Claude write-ups
- [[eli5-project-so-far]]: simple explanations of every tab so far + shaders and voxels plan (presentation notes)
- [[design-reference-cosmos-board]]: reading of my inspiration board (palette, motifs, proposed changes)
