# Bioluminescent Ocean: a Procedural Atlas

**DESIGN 4197 Midterm report · Special Topics in Design** · Gabriela Yaulli (cgy4) · October 2026
**Live:** https://bioluminescent-ocean.web.app · **Code:** github.com/cgyh98/procedural-worlds · **Video:** https://youtu.be/j5PGsqhtCrc

![[2026-10-05-world-caustics.png]]

## 1. Concept
**"You are the disturbance."** An ocean planet that stays dark until you move through it. The player is a glowing jellyfish; every plankton and kelp strand it passes lights up, then fades back to black.

This mirrors real bioluminescence: dinoflagellates flash when moving water bends their cell, then recover. The glow is easiest to see on new-moon nights and concentrates in enclosed bays. The moon is the project's second force. It sets the light, the tides and, later, the timing of life.

Each experiment below is a technique from the first half of the semester, read through that lens.

## 2. Visual direction
![[cosmos_board.png]]
*Inspiration board: reference images by other artists, used only for inspiration and not included in the app or the public repository.*

The board reads the deep ocean as a cosmos: mostly black, with small, cold points and threads of light. From it I took:
- **Palette:** electric blue and cobalt, sea green on glowing edges, rare amber.
- **Motifs:** thin luminous filaments (kelp, migration routes), the caustic web (a Worley-noise shader), and edge glow.
- **A rule:** debug views are always amber, so the structure never blends into the art.

## 3. The atlas
Every experiment is its own tab, with sliders, tooltips, algorithm variants in a dropdown, and a debug view that shows the algorithm behind the image. A combined **World** tab assembles them.

| Module | Experiment | Technique | Ocean reading | Key finding |
|---|---|---|---|---|
| 6 | Ocean planet | UV / cube / icosphere / Fibonacci spheres; lon/lat mapping; map ↔ planet animation | Ocean world + orbiting moon; `moonPhase` from the sun–moon angle | Triangle area varies 7.7× (UV) vs. 1.6× (Fibonacci) |
| 5, 9 | Seafloor map | Perlin / Simplex / Worley heightmaps, fBm, ridged noise, 2D ↔ 3D | Basins, mid-ocean ridges, vent pits | One heightmap feeds most other tabs |
| 7–8 | Voxel reef | Density functions, visible-face meshing | Caves and arches a heightmap can't express | 90–96% of faces culled |
| 10 | Erosion | Droplet erosion, live simulation | Turbidity currents carving submarine canyons | Fixed a sign bug from my earlier prototype |
| 11 | Biomes & tides | Rule-based biomes, BFS flood fill, 4 vs. 8 connectivity | Enclosed bays (where bioluminescence concentrates) glow | 4 vs. 8 neighbours changes how many bays stay enclosed |
| 12–14 | Currents | Uniform / vortex / curl-noise fields, advection | Plankton carried by currents | Curl noise measured divergence-free: no clumping |
| 15–16 | Kelp distribution | Random / jittered / Poisson disk, filtered by height and slope | Kelp in the lit shallows | Closest pair: 0.019 (random) vs. exactly r (Poisson) |
| 21–22 | Reef paths | MST / Gabriel / k-nearest graphs; A* vs. Dijkstra on slope cost | Reefs as cities, migration routes as roads | Same route, 27% fewer cells explored with A* |
| Shaders | Caustics | Custom GLSL: animated Worley borders (F2 − F1) | Moonlight on the seafloor | Kept dim: moonlight competes with the glow |
| Core | Disturbance | Excitation rule, Gaussian wake, procedural jellyfish | Dinoflagellates flash when stirred | One local rule drives every glowing thing |

## 4. Highlights
**Measuring the pole problem.** The four sphere types are built with the same triangle count. The debug view colours each triangle by area. The UV sphere's smallest triangles are 7.7× smaller than its largest (a starburst at the pole); the Fibonacci sphere's spread is only 1.6×. Wrapping the 2D map shows the same problem on the texture side: a seam and smearing near the poles. That's why the planet's heights are sampled from 3D noise on the sphere.

![[2026-10-06-planet-debug-uv.png]]

**Even, natural spacing.** Random placement put two kelp plants 0.019 apart; Bridson's Poisson disk guarantees no pair closer than r (the measured minimum is exactly r = 1.2). In the 2D map view, rings of radius r/2 make this visible: they never overlap under Poisson and clump under random.

| Poisson disk | Random |
|---|---|
| ![[2026-10-05-map-poisson.png]] | ![[2026-10-05-map-random.png]] |

**Terrain-aware routes.** Each graph edge becomes a route on a grid where climbing costs extra, so routes follow valleys. A* and Dijkstra find the same cheapest route (cost 76.5 on a test terrain), but A*'s distance heuristic explores 27% fewer cells. The debug view shows both search areas.

![[2026-10-05-paths-map-astar.png]]

## 5. How it's built
React + three.js (React Three Fiber), with leva for the controls and bloom for all glow (no real lights per organism).
- **Modules:** each one exports a scene, its sliders and a description; adding a tab is one line in a registry.
- **Shared systems:** the player state and the excitation rule are shared, so every glowing thing responds the same way.
- **Seeded randomness:** every world is reproducible from its seed.
- **Documentation:** progress is logged in an Obsidian vault (concept notes, decisions, journal).
- **Hosting:** Firebase.

## 6. Reflection
- **What worked:** one heightmap feeding many experiments, so they read as one place. The tab + debug structure makes each concept easy to show.
- **What was hard:** tuning by measurement rather than by eye (erosion carved half the relief at first). Many bugs surfaced only in screenshots: glow wrapping around the plankton box, oversized near-camera points, muddy debug colours.
- **What's simplified:** a real dinoflagellate flash is a 0.1 s spike with fatigue; mine is a smooth rise and fade. The biomes tab still mixes land and underwater labels.

## 7. Next steps
1. Let `moonPhase` drive tides (bays opening and closing) and glow visibility.
2. Biomes decide where life grows; the eroded seafloor feeds the World.
3. Voxel reef outcrops at the reef nodes.
4. Species and schedules: creatures migrating along the routes, vertical migration.
5. Click the planet to dive in (LOD and streaming).
