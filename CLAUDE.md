# Project Context: Bioluminescent Ocean World (Procedural World Building)

## About this project

This is a semester-long project for a Procedural World Building class. I'm learning this topic **from scratch**, building projects from scratch with React and three.js. The project grows incrementally as the class covers new topics. The codebase must stay modular so each new system plugs in without rewriting what already exists.

The project also needs a clear theme/concept from a design perspective: **the sea and bioluminescence, influenced by the moon**.

## How to work with me

- I'm learning, so explain the concepts behind what you build (what the algorithm does and why), not just the code.
- Build in small, understandable steps rather than large finished systems all at once.
- Comment code clearly, especially the procedural/math parts.
- When there are several reasonable approaches, briefly lay out the options and trade-offs before picking one.

## Documentation (Obsidian vault at `vault/`)

- Save any explanation, plan or write-up you produce as Markdown in `vault/claude/` (kebab-case filename, start with a `# Title`).
- Concept notes (noise, vector fields, erosion…) go in `vault/concepts/`; design choices go in `vault/decisions/` (context → options → choice → why).
- At the end of each work session, add or append to `vault/journal/YYYY-MM-DD.md`: what was done, what was learned, open questions, next steps.
- Use Obsidian `[[wikilinks]]` between notes and link new notes from `vault/00-index.md`.
- Images go in `vault/assets/`.
- Never put secrets (API keys, Firebase/Supabase credentials) in the vault or the code; this repo is public. Use `.env.local` (gitignored).

## Class syllabus (high-level guide for the project's structure)

This is the class structure. It works as a high-level guide for how the project should be organized: it doesn't need to be implemented module by module in strict order, but the final presentation will walk through it, connecting each part of the world to the concepts learned in class. So the project should make it easy to point at any part of the world and say "this is where concept X shows up." How each concept is interpreted is flexible and goes through the ocean / bioluminescence theme.

1. Website fundamentals: HTML, CSS, JavaScript
2. Advanced website frameworks: React
3. Advanced website frameworks: three.js
4. Backend: Firebase and Supabase (authentication, databases, storage, hosting)
5. Procedural generation foundations: Perlin noise, heightmaps (flat terrain)
6. Procedural generation foundations: spherical mapping (2D maps to spherical coordinates)
7. Advanced procedural systems: voxel structures (flat terrain)
8. Advanced procedural systems: voxel terrain over a spherical planet
9. Maps: expanding on 2D maps for heightfield systems, 2D view (paint features)
10. Maps: particle erosion simulation on a 2D map
11. Maps: biomes and flood-fill algorithms in 2D
12. Vector fields: foundations
13. Vector fields: atmospheric systems (clouds / winds)
14. Vector fields: ocean systems (oceans / currents)
15. Populations: distribution of objects in the landscape
16. Populations: distribution over custom maps (biomes / terrain inclination / soil types)
17. Populations: foliage generation (procedural vegetation)
18. Populations: sampling foliage in the landscape
19. Populations: species character creation
20. Character instantiation and schedules
21. Networks: nodes and paths between nodes (roads)
22. Networks: simulated town networks (roads and nodes)
23. Optimization / performance: LOD systems
24. Optimization / performance: data streaming
25. Optimization / performance: line of sight / fog

## App requirements (class requirements, apply to every module)

- **Sliders** for the parameters of each system.
- **Algorithm variants as dropdown menus**, so different versions of an algorithm can be swapped and compared (e.g. Perlin vs. Simplex vs. Worley noise; different sphere geometries).
- **Tooltips on sliders** that explain what the parameter does (the app should help me learn).
- **Debug layer:** a visualization mode that shows the structural logic behind each system (especially useful in the presentation to show the class concept behind what's on screen) (e.g. noise values, grid/voxel boundaries, vector field arrows, flood-fill regions, node graphs, LOD levels).
- **Animation sequences** for processes that play out over time (e.g. erosion running step by step, populations growing, currents flowing).

## Design requirements (class requirement)

- **Animated transition between the 2D world map and the 3D planet** (an animated unwrapping/wrapping of the map onto the sphere).

## Data structure considerations (class requirement)

- **Sphere geometry pinching problem:** a standard UV sphere bunches vertices and distorts textures at the poles. Review and compare different sphere constructions, ideally switchable via a dropdown, e.g.:
  - UV sphere (baseline, shows the pinching)
  - Cube sphere (normalized/spherified cube)
  - Icosphere (subdivided icosahedron)
  - Fibonacci sphere (evenly distributed points)
- The choice affects how 2D maps project onto the planet, how voxels sit on the sphere, and how the unwrap animation works.

## Design concept

**Core idea: "You are the disturbance."** The ocean is dark, and the player is what makes it visible. Nothing glows unless the player has disturbed it, so each player leaves their own path of light through the world, which then fades back to black.

This mirrors real bioluminescence (dinoflagellates flash when the water around them is disturbed) and also mirrors procedural generation itself: small local rules adding up to something large and beautiful.

Design tensions to lean into:
- Darkness vs. light
- Vast emptiness vs. tiny living points of light
- Calm vs. disturbance
- Moonlight vs. bioluminescence (they compete for the dark)

The project is a **light, explorable game-like experience**, not a full game: no scores, levels, or heavy UI. The reward is discovery.

### Proposed structure (not final): two scales

The class syllabus is built around a spherical planet, so one way to unite it with the concept:
- **Planet view:** an ocean planet with its moon. Here live the 2D map, the map-to-sphere unwrap animation, seafloor terrain, biomes, currents, and the moon's influence on tides and light.
- **Dive view:** zoom down into the ocean and swim through it in first/third person, where "you are the disturbance" happens.

## Real science the world draws on

- **Disturbance-triggered glow:** dinoflagellates flash when stirred, then recover.
- **Moon visibility:** bioluminescence is most visible on new moon nights; moonlight washes it out.
- **Vertical migration:** plankton and small animals rise at night and sink by day; moonlight affects how high they come.
- **Lunar-timed displays:** some species sync light shows to the lunar cycle (e.g. the Bermuda fireworm's glowing mating display a few nights after the full moon; mass coral spawning also follows lunar timing).
- **Counterillumination:** some animals (hatchetfish, certain squid) glow on their bellies to match downwelling light and hide their silhouette. Brighter moon means brighter bellies.
- **Tides:** the moon drives tides, and moving water stirs the glow.

## How the class concepts could map to the ocean theme (draft, also the backbone of the final presentation)

| Module | Ocean / bioluminescence interpretation |
|---|---|
| 5 Noise, heightmaps | Seafloor: trenches, ridges, vents |
| 6 Spherical mapping | Ocean planet (and the moon itself) |
| 7–8 Voxels | Reefs, caves, overhangs on the seafloor; voxel seafloor over the planet |
| 9 2D maps, paint | Paint islands, trenches, reefs on the world map |
| 10 Erosion | Underwater sediment flow, canyons |
| 11 Biomes, flood fill | Depth zones (sunlight / twilight / midnight), reef vs. vent vs. abyss biomes; flood fill for sea level, enclosed bays (real bioluminescent bays are enclosed) |
| 12–14 Vector fields | Ocean currents that carry glowing plankton; clouds/winds that block or reveal moonlight |
| 15–18 Populations, foliage | Coral, kelp, anemones, plankton distributed by biome, depth, slope, substrate |
| 19 Species | Bioluminescent creatures (jellyfish, fireworms, squid, fish) |
| 20 Schedules | Daily vertical migration and lunar-timed displays |
| 21–22 Networks | Least natural fit; options: migration routes between reefs/vents, reef colonies as nodes, or coastal villages and shipping/fishing routes on the planet. **Undecided.** |
| 23 LOD | Planet view to dive view detail levels |
| 24 Streaming | Infinite ocean chunks around the player |
| 25 Line of sight / fog | Depth darkness; you only see what's lit |

## Core mechanics (dive view)

### Player
A small glowing creature (or diver) with a follow camera. Moving through the water leaves a sparkling trail and wakes up nearby life.

### Excitation (the central rule)
Every glowing thing (plankton, jellyfish, coral, fish) has one value: `excitation`.
- Each frame, it is boosted when the player is close and moving (scaled by distance and player speed).
- Each frame, it decays back toward zero.
- Brightness = excitation.

One rule applied to everything keeps the world consistent.

### Speed as a choice
Swimming fast creates a bigger burst of light (see more) but can scare creatures away. Moving slowly is darker and quieter but lets creatures approach.

### Infinite ocean
- Plankton lives in a box around the player and wraps (modulo) when the player swims past the edge, so the water feels endless at no cost.
- Seafloor and larger organisms stream in around the player in chunks using seeded noise (module 24).

### Moon phase
A single global value `moonPhase` (0 = new moon, 1 = full moon) feeds into:
- Ambient light and surface caustics
- How visible the glow is (bright moon = harder to see)
- Tide height / wave energy
- How deep the migrating plankton swarm sits
- Which species are active
- Counterillumination strength

## Tech stack

- React + three.js
- Chosen (see vault/decisions/r3f-vs-vanilla-threejs.md): React Three Fiber (`@react-three/fiber`), `@react-three/drei`, `@react-three/postprocessing` for bloom, `zustand` for global state, `leva` for sliders/dropdowns/debug controls.
- Backend (module 4): Firebase and/or Supabase for auth, database, storage, hosting. Possible uses: saving painted maps, world seeds, and settings.

## Technical guidelines

- **Glow comes from bloom.** Emissive materials with `toneMapped={false}` plus bloom post-processing. Don't use real three.js lights per organism (too expensive).
- **Instancing for many small things.** Plankton and sparkles use `InstancedMesh` or `Points` with a custom shader.
- **Depth via fog.** Exponential fog (`fogExp2`) with a dark blue-black color, tied to depth and moonlight.
- **Seeded randomness everywhere** so worlds are reproducible.
- **Global state in a small store**, e.g.:

```js
import { create } from 'zustand'

export const useWorld = create((set) => ({
  moonPhase: 0.5,   // 0 = new moon, 1 = full moon
  setMoonPhase: (v) => set({ moonPhase: v }),
}))
```

- Keep each system (noise, terrain, sphere, voxels, maps, erosion, biomes, vector fields, populations, species, networks, LOD, player, moon) in its own module so each class topic adds a self-contained piece, each with its own sliders, algorithm dropdown, tooltips, and debug view.

## Current status

Concept and direction chosen. Code: an R3F app shell with **one tab per module plus a combined World tab** (see vault/decisions/ui-tabs-per-module.md). Each module lives in `src/modules/<name>/` (`Scene.tsx` + `index.ts` exporting a `WorldModule`) and is listed in `src/modules/registry.ts`. The shell owns the shared canvas, fog, orbit controls and the global debug toggle; tabs so far: Scene shell (grid + axes), **Seafloor map** (modules 5 + 9: Perlin / Simplex / Worley heightmap with fBm, ridged style, animated 2D map ↔ 3D relief, debug grayscale; at y = −6; joins the World through Kelp distribution), **Kelp distribution** (modules 15–16: random / jittered grid / Poisson disk placement filtered by height band + slope, kelp as glowing filaments with excitation; reuses `useSeafloor()` from the seafloor module), **Currents** (modules 12–14: plankton advected by a uniform / vortex / curl-noise vector field, debug arrows, flow-speed glow; also shown in World), **Disturbance** (core mechanic: a swimmable player with follow camera + the excitation rule on every plankton; the plankton box follows the player), and World (= Disturbance). Shared per-frame systems live in `src/systems/` (`player.ts` live player state, `excitation.ts` the one glow rule). Tabs that drive the camera set `controlsCamera`; tabs can set a starting `camera` position. The shell has a fog density slider. Bloom lives in the shell. Visual direction: see vault/claude/design-reference-cosmos-board.md (electric blue / cobalt / sea-green palette, glowing filaments, Worley caustics). Shared helpers: `src/lib/random.ts` (seeded PRNG) and `src/lib/noise.ts` (seeded 3D Perlin). Firebase is set up (project `bioluminescent-ocean`, Spark plan, personal account); the site is live at https://bioluminescent-ocean.web.app and deploys with `npm run deploy`. `src/backend/firebase.ts` initializes Firebase from `.env.local` but nothing uses it yet. The CLASS_03 terrain prototype was removed; it is still in ~/Documents/PWB_CLASS_03 and in commit 7020c32 if any of it is needed again. Per-frame values go through refs in `useFrame`, never React state. The most recent class covered **vector fields** (modules 12–14 area), so earlier concepts (noise/heightmaps, spherical mapping, voxels, 2D maps/erosion/biomes) have already been covered in class but are not yet in the project.

## Open questions

- Whether to adopt the two-scale structure (planet view + dive view)
- Where to start building: the most recent topic (vector fields / ocean currents) or the foundations (scene, noise seafloor) first
- How networks (modules 21–22) fit the ocean theme
- Player form: creature vs. diver
- Whether the moon phase is player-controlled, time-based, or tied to progress
- What gets saved in Firebase (seeds, settings, painted maps), and whether Supabase is also used
