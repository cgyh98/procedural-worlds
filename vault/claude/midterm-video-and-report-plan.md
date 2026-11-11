# Midterm: walkthrough video + report plan

Remote submission for the procedural atlas exhibition. Short and sweet: a **6–7 minute video** and a **2–3 page report**. Sources: [[procedural-atlas-overview]] (cards), [[eli5-project-so-far]] (simple wording), concept notes (details).

## Video (≈ 6–7 min)

**Rule per experiment:** ~30 seconds, always the same rhythm: *what you see → debug on (the algorithm) → one dropdown switch (compare) → one sentence of ocean meaning.* Screen recording of the live site, voice over, no slides needed.

| Time | Segment | Show | Say (one idea) |
|---|---|---|---|
| 0:00–0:30 | **Hook** | World tab, swim as the jellyfish, trail of light | "You are the disturbance: a dark ocean that only lights up where you move." |
| 0:30–1:00 | **The atlas** | Tab bar, one slider tooltip, debug toggle | "Each tab is one technique from class; every one has sliders, algorithm variants and a debug view." |
| 1:00–1:40 | **Ocean planet** (6) | Debug UV vs. icosphere → unwrap to flat map | "Sphere layout matters: UV pinches 7.7×; the map wraps onto the planet." |
| 1:40–3:10 | **Terrain**: Seafloor (5, 9) · Voxels (7–8) · Erosion (10) | Ridged noise + 2D view · slice into caves · erosion running with debug | "Noise makes terrain; voxels add caves; flows carve canyons." |
| 3:10–4:30 | **Ecosystems**: Biomes (11) · Currents (12–14) · Kelp (15–16) | Tide slider + flood · field arrows · Poisson vs. random rings | "Flood fill finds glowing bays; currents carry plankton; Poisson spaces life." |
| 4:30–5:10 | **Cities**: Reef paths (21–22) | Debug, switch A* ↔ Dijkstra | "Reefs are the cities; A* finds the same route searching 27% less." |
| 5:10–5:50 | **Light**: Caustics · Disturbance | Caustics debug cells · wake shells while swimming | "A custom shader paints moonlight; one local rule makes the world respond." |
| 5:50–6:30 | **Closing** | Back to the World, then the planet | Threads (one seafloor, one glow rule, the moon) + what's next. |

**Recording tips**
- 1920×1080, browser full screen (hide bookmarks), cursor visible; turn leva sections you don't need off by collapsing them.
- Record each segment as its own clip (easier retakes), then join them.
- Rehearse each 30-second segment once with the [[eli5-project-so-far]] wording.
- Prepare the tabs before recording (good seeds, debug off) so you don't scroll the panel on camera.
- Captions/subtitles help if the class watches without sound.

## Report (2–3 pages)

1. **Title + links** (live site, repo, video). One screenshot of the World.
2. **Concept** (1 paragraph): "You are the disturbance", the moon, bioluminescence as the lens. Two or three sentences of real science (from [[bioluminescence-explained]]).
3. **The atlas** (1 table, the core of the report): one row per experiment: *class topic · technique · ocean reading · key finding*. Taken straight from the overview cards.
4. **Three highlights** (one short paragraph + image each): pick the strongest findings, e.g.
   - sphere pinching measured (UV 7.7× vs. Fibonacci 1.6×),
   - Poisson disk vs. random (closest pair exactly r vs. 0.019),
   - A* vs. Dijkstra (same route, 27% fewer cells).
5. **How it's built** (1 paragraph): React + three.js (R3F), one tab per module, shared systems, seeded randomness, debug layer, Firebase hosting.
6. **Reflection** (3–5 bullets): what worked, what was hard (e.g. finding bugs through screenshots, the erosion sign fix), what's simplified.
7. **Next steps** (3–5 bullets): moon phase driving tides and glow, biomes driving life, voxel reefs in the World, species and migration, planet ↔ dive (LOD/streaming).

Keep images to 4–5 total. Use your own screenshots only (no reference images from other artists).
