# Infinite seafloor: hide the edge now, stream chunks later

## Context
The seafloor is one finite 40 × 40 heightmap. In Play mode you could see where it ends: a cut cliff with empty water behind it. The goal is an "endless ocean" feeling. Asked on 2026-11-11, the day of the progress presentation.

## Options
| Option | How | Cost | Catch |
|---|---|---|---|
| A. Hide the edge | Edge falloff + thicker fog + tighter boundary | Minutes, free at runtime | Still finite (a trick) |
| B. Repeat the tile | Seamless noise, copy the map like floor tiles | Small | Visible repetition (same reefs again and again) |
| C. Stream chunks (module 24) | Tiles around the player generated from seeded noise at their world position; load ahead, drop behind | ~Half a day, ~9 chunks alive | Reefs / paths / bays are computed on the single map |
| C+. Hybrid | Designed centre (reefs, paths, story) + streamed plain seafloor and kelp around it | Same as C | Best of both |

## Choice
**A now, C+ after the presentation.**

## Why
A takes minutes and is safe on presentation day. C+ is a whole syllabus module (24, data streaming) shown live, and leads into LOD (23): near chunks detailed, far chunks coarse.

## What A does (2026-11-11)
1. **Edge falloff / island mask** (`useSeafloor.ts`, slider *edge falloff*, default 0.35): `mask = smoothstep(1 − width, 1, distance from centre)`, `h' = h − mask × 3`. The rim sinks into the abyss, so the map reads as a seamount. It affects every system that reads the heightmap (terrain, collision, kelp, reefs), so they stay consistent.
2. **Play fog** 0.055 instead of the shell's 0.03 (restored on exit).
3. **Boundary** 12 instead of 17 (the slope starts at ~13).

Side effect: fewer reefs fit on the smaller seamount (6 instead of 13 with the default seed); the story needs 5.

## TODO after the presentation (C+)
- [ ] Noise sampled at **world** coordinates per chunk (neighbouring chunks agree at their shared edge automatically, no stitching).
- [ ] A chunk manager: which chunk keys are within range of the player, create missing, dispose far ones (and cache by key).
- [ ] Ground collision across chunks (`systems/seafloor.ts` sampler asks the right chunk).
- [ ] Debug: chunk borders coloured by age / LOD.
- [ ] Remove or lower the edge falloff and the play fog override; widen the Play boundary.
- [ ] Optional LOD (module 23): fewer vertices for far chunks.

Related: [[play-mode]], [[final-presentation-plan]]
