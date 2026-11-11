# Procedural Worlds: Bioluminescent Ocean (Index)

> You are the disturbance.

**Start here:** [[procedural-atlas-overview]] (one card per experiment) · [[eli5-project-so-far]] (simple explanations)

## Journal
- [[2026-10-04]]: project setup and concept
- [[2026-10-05]]: seafloor map, presentation prep
- [[2026-10-06]]: wake ellipsoid + procedural jellyfish player
- [[2026-10-08]]: voxel resolution
- [[2026-11-10]]: final plan, story, moon child
- [[2026-11-11]]: solid seafloor, hiding the map edge

## Concepts
- [[spherical-mapping-planet]]: four sphere constructions, lon/lat mapping, map ↔ planet animation, moon phase (Ocean planet tab, module 6: the atlas cover)
- [[noise-pipeline]]: noise → fBm → shaping → blending → erosion → mesh (notes from the CLASS_03 prototype; the code was removed and lives in the PWB_CLASS_03 folder and the first commit)

- [[heightmaps-and-noise]]: heightmaps, Perlin / Simplex / Worley, fBm, ridged (Seafloor map tab, modules 5 + 9)
- [[distributions]]: random vs. jittered grid vs. Poisson disk, filtered by height and slope (Kelp distribution tab, modules 15–16)
- [[paths-and-networks]]: MST / Gabriel / k-nearest graphs, A* vs. Dijkstra over the terrain (Reef paths tab, modules 21–22)
- [[shaders-caustics]]: custom GLSL shader, animated Worley caustics (Caustics tab, shaders topic)
- [[erosion]]: droplet erosion as underwater sediment flows, live simulation (Erosion tab, module 10)
- [[biomes-and-flood-fill]]: depth zones / habitats, tides, flood fill for enclosed bioluminescent bays (Biomes & tides tab, module 11)
- [[voxels]]: rock/water voxel grid, density functions, visible-face meshing (Voxel reef tab, modules 7–8)
- [[vector-fields]]: vector fields, advection, curl noise, vortex (Currents tab, modules 12–14)
- [[moon-child-character]]: the main character, a jointed silhouette with a rim shader, sine-wave swim cycle and hair chains (Disturbance tab, species / module 19)
- [[excitation-and-player]]: the excitation rule, wake ellipsoid, jellyfish player, follow camera (Disturbance tab, core mechanic)

## Decisions
- [[repo-and-vault-setup]]
- [[r3f-vs-vanilla-threejs]] (accepted)
- [[ui-tabs-per-module]] (accepted): one lab tab per module + a combined World tab
- [[two-scale-ocean-planet]] (accepted): ocean planet as the atlas cover + dive view
- [[moon-phase-tied-to-progress]] (accepted): slider in the labs, reefs woken in play mode
- [[infinite-seafloor]] (accepted, temporary): hide the edge now (island mask + fog), chunk streaming (module 24) after the presentation
- [[firebase-hosting-setup]] (accepted): personal Firebase project, live at https://bioluminescent-ocean.web.app

## Open questions
See "Open questions" in `CLAUDE.md`.

## Claude write-ups
- [[play-mode]]: ▶ Play, one night: planet title → dive → wake sleeping reefs → moonrise → closing card
- [[hero-art-direction]]: painterly blue art direction for the hero, what's built, and the moon-driven proposal for the world
- [[final-presentation-plan]]: progress presentation (11/11) + final (~11/23) plan, creature ideas, algae bloom as stretch
- [[bioluminescence-explained]]: ELI5 + real mechanism of bioluminescence and how the project models it
- [[midterm-report]]: midterm report for the professor (concept, visual direction, atlas table, highlights)
- [[midterm-video-and-report-plan]]: structure for the midterm walkthrough video (6–7 min) and report (2–3 pages)
- [[procedural-atlas-overview]]: one-page atlas summary, one card per experiment (midterm exhibition)
- [[eli5-project-so-far]]: simple explanations of every tab, in tab order (presentation notes)
- [[design-reference-cosmos-board]]: reading of my inspiration board (palette, motifs, proposed changes)
