# Procedural Atlas: Bioluminescent Ocean

**Live:** https://bioluminescent-ocean.web.app · **Code:** github.com/cgyh98/procedural-worlds · Midterm exhibition, Procedural World Building

> **You are the disturbance.** A dark ocean planet that only lights up where you disturb it. Each experiment below is one procedural technique from the first half of the semester, read through the sea, bioluminescence and the moon. Every tab in the app has sliders with tooltips, algorithm variants in a dropdown, and a **debug** view that shows the structure behind the image.

**How to read a card:** the *question* the experiment asks · the *technique* · the *ocean reading* · what to *show* live. Simple explanations: [[eli5-project-so-far]].

---

## Planet scale

> [!abstract] 06 · Ocean planet — the atlas cover
> ![[2026-10-06-planet.png]]
> **Question:** How do you wrap a flat map onto a round world, and what breaks?
> **Technique:** Four sphere meshes (UV, cube, icosphere, Fibonacci) at equal triangle counts; longitude/latitude mapping; a wrap animation as a sphere of shrinking radius; moon phase from a dot product.
> **Ocean reading:** The ocean planet and its moon. The moon's phase becomes the world's `moonPhase`.
> **Finding:** UV sphere triangles vary **7.7×** in area (pole pinching) vs. **1.6×** for Fibonacci. A wrapped 2D map smears at the poles and has a seam, so 3D noise is sampled on the sphere.
> **Show:** debug on → switch sphere types · source → "Wrapped 2D seafloor map" · view → "Flat map".
> → [[spherical-mapping-planet]] · [[two-scale-ocean-planet]]

---

## Terrain

> [!abstract] 05 + 09 · Seafloor map
> ![[2026-10-05-seafloor-3d.png]]
> **Question:** How do you make believable terrain from randomness?
> **Technique:** Heightmap from Perlin / Simplex / Worley noise; fBm octaves (persistence, lacunarity); ridged noise; normalization; 2D map ↔ 3D relief.
> **Ocean reading:** Seafloor basins, ridges (mid-ocean ridges = ridged noise) and vent pits (Worley).
> **Show:** noise dropdown · style → ridged · view → 2D map · debug (raw noise in grayscale).
> → [[heightmaps-and-noise]]

> [!abstract] 07–08 · Voxel reef
> ![[2026-10-05-voxels-caves.png]]
> **Question:** What can't a heightmap express?
> **Technique:** 3D grid of rock/water voxels from density functions; mesh only the faces between rock and water.
> **Ocean reading:** Reefs with caves, arches and overhangs; glowing life in sheltered hollows.
> **Finding:** Hidden-face culling skips **~90%** of faces (live counts in the panel).
> **Show:** shape dropdown · build animation · slice into the caves · debug.
> → [[voxels]]

> [!abstract] 10 · Erosion
> ![[2026-10-06-erosion-debug.png]]
> **Question:** How does moving water reshape terrain over time?
> **Technique:** Particle (droplet) erosion: each flow follows the slope, erodes when fast, deposits when slow; bilinear splatting; live simulation.
> **Ocean reading:** Turbidity currents carving submarine canyons and spreading sediment into abyssal plains.
> **Finding:** Fixed a sign bug from my CLASS_03 prototype (drops slowed down going downhill); tuned capacity by measurement.
> **Show:** play/pause/reset · debug (amber = carved, cyan = deposited, white = latest flows).
> → [[erosion]]

---

## Ecosystems

> [!abstract] 11 · Biomes & tides
> ![[2026-10-06-biomes-habitats.png]]
> **Question:** How do you divide a world into regions, and find which waters are enclosed?
> **Technique:** Rule-based classifiers (depth zones; depth + slope + Worley vents); flood fill (BFS) from the map edges; 4 vs. 8 connectivity; connected-component labeling.
> **Ocean reading:** The tide sets the water level; water the open ocean can't reach is an **enclosed bay**, where bioluminescence concentrates (like Mosquito Bay, Puerto Rico), so the bays glow.
> **Show:** tide slider (islands/bays counts update) · animate flood · connectivity · debug (regions).
> → [[biomes-and-flood-fill]]

> [!abstract] 12–14 · Currents
> ![[2026-10-04-currents-debug.png]]
> **Question:** How do you make invisible water motion visible?
> **Technique:** Vector fields (uniform, Rankine vortex, curl noise) and particle advection; modulo-wrapped box.
> **Ocean reading:** Plankton carried by currents; faster water glows brighter.
> **Finding:** Curl noise is divergence-free (measured ≈ 0), so plankton never clump.
> **Show:** field dropdown · debug arrows.
> → [[vector-fields]]

> [!abstract] 15–16 · Kelp distribution
> ![[2026-10-05-kelp.png]]
> **Question:** Where should living things go?
> **Technique:** Random vs. jittered grid vs. Poisson disk (Bridson); filtering by the map (height band, slope).
> **Ocean reading:** Kelp forests in the lit shallows, on slopes gentle enough to hold.
> **Finding:** Closest pair of plants: random 0.019 · jittered 0.061 · Poisson **exactly r**.
> **Show:** method dropdown in the 2D map view with debug rings (they never overlap under Poisson).
> → [[distributions]]

---

## Cities (networks)

> [!abstract] 21–22 · Reef paths
> ![[2026-10-05-paths-map-astar.png]]
> **Question:** How do settlements connect, and how do routes follow the land?
> **Technique:** Graphs (minimum spanning tree, Gabriel, k-nearest); A* vs. Dijkstra on a slope-cost grid; Chaikin smoothing.
> **Ocean reading:** In an ocean world, **reef colonies are the cities** and migration routes are the roads; sparks are creatures travelling between them.
> **Finding:** A* finds the same cheapest route as Dijkstra while exploring **27% fewer** cells.
> **Show:** graph dropdown · debug + switch A* ↔ Dijkstra (explored cells).
> → [[paths-and-networks]]

---

## Light and the disturbance

> [!abstract] Shaders · Caustics
> ![[2026-10-05-caustics-layered.png]]
> **Question:** How do you paint light that dances, per pixel, on the GPU?
> **Technique:** Custom GLSL `ShaderMaterial`: animated Worley noise, light on cell borders (F2 − F1 ≈ 0); additive overlay.
> **Ocean reading:** Moonlight caustics on the seafloor, kept dim so they don't wash out the glow (moonlight vs. bioluminescence).
> **Show:** mode dropdown (layered / Worley / off) · debug (Worley cells).
> → [[shaders-caustics]]

> [!abstract] Core mechanic · Disturbance
> ![[2026-10-06-jelly-swim.png]]
> **Question:** How does one local rule make the whole world respond to you?
> **Technique:** One excitation value per glowing thing: boosted by a Gaussian **wake** stretched behind the swimmer, decaying exponentially; a procedural jellyfish (pulsing bell, follow-the-leader tentacles).
> **Ocean reading:** Dinoflagellates flash when the water is disturbed, then recover: you leave a trail of light that fades to black.
> **Show:** swim with W/S, A/D, E/Q, Shift · shape → Sphere vs. Wake · debug (wake shells).
> → [[excitation-and-player]]

> [!abstract] World · everything together
> ![[2026-10-05-world-caustics.png]]
> The dive view: seafloor with caustics, kelp, reef network, currents and the jellyfish in one ocean. Each lab tab isolates one concept; the World shows how they add up.

---

## Threads that tie the atlas together
- **One seeded world:** the same seafloor heightmap feeds the map, kelp, reefs, routes, caustics, biomes, erosion and the wrapped planet.
- **The moon:** the planet's orbiting moon writes a global `moonPhase`; next it drives tides (bays opening and closing), caustic brightness and glow visibility.
- **One glow rule:** plankton and kelp share the same excitation rule; glow comes from bloom, never from real lights.
- **One visual language:** the cosmos-board palette (electric blue, cobalt, sea green, rare amber); debug is always amber so the structure never blends into the art. See [[design-reference-cosmos-board]].
- **Two scales:** the planet (atlas cover) above the dive view (World); connecting them is the LOD / streaming work of the second half.

## Next (second half of the semester)
Moon phase driving tides and glow · biomes driving where life grows · eroded terrain feeding the World · clouds/winds hiding the moon · species and schedules (vertical migration) · click the planet to dive in (LOD, streaming) · saving seeds in Firebase.
