# Play mode: one night

Built 2026-11-10 for the progress presentation. **▶ Play** at the right of the tab bar. Code: `src/play/` (+ `systems/reefs.ts`, sleeping reefs in `paths/ReefNetwork.tsx`).

## The flow
1. **Title (planet view).** The lab UI disappears. The ocean planet turns slowly under *"The night the moon fell into the sea"*. Click **Dive**.
2. **Dive.** The camera eases from its orbit down to the surface point it was facing (slow start, fast fall), fades to deep navy, and switches to the World. *(Two scales joined: planet → dive.)*
3. **Swim (dive view), new moon.** Subtitles: *"The moon is dark tonight." "Its child has fallen into the sea."* → after you move: *"Every movement makes light."* → *"The reefs below are sleeping. Wake them."*
4. **Waking reefs.** Reefs start nearly invisible, routes faint, no migration. Swim within 3.5 units of a reef: a burst of light, then a slow breathing glow. A route lights up and its sparks start migrating once both of its reefs are awake. Each reef raises the moon: the water brightens, god rays appear, the glow washes out. Lines: *"A reef wakes. Far above, the moon stirs." "The more you wake, the brighter she grows." "The moon is rising. Your light fades in hers."*
5. **End (full moon).** *"You were the disturbance."* Play again / Back to the atlas. Esc exits at any time.

## How it's built
- `usePlay` (zustand): stage (title / diving / swim / end), subtitle, fade, reef count, and a `run` counter that remounts the scene fresh on start/stop.
- `PlayDirector` (inside the canvas): `PlanetFlight` (orbit, dive easing, fade, switch) and `Story` (beats = *condition → line*; moon = reefs woken / 5 × 0.95 + time / 300, smoothed; a soft invisible wall keeps the player over the 40 × 40 map).
- `PlayOverlay` (HTML): title, subtitles (serif italic), fade curtain, controls hint, reef dots, closing card.
- The shell hides the tab bar, panel, concept card and debug while playing, and turns off orbit controls.

## Class concepts on the way
Spherical mapping (the planet), the two-scale structure / a first LOD step (planet → dive), the excitation rule (glow), networks and A* (routes that come alive), distributions (reefs placed by Poisson disk), vector fields (plankton currents), the moon conducting light and atmosphere.

## Next (final)
Creatures that appear as reefs wake, a fireworm display at the climax, sound, the planet showing your path of light at the end.

## Update (2026-11-11): solid seafloor
Before, the terrain was only drawn: sinking with Q went straight through it, and the camera ended up underneath, looking up at the seafloor from below. Now it's a **heightfield collision**: the seafloor is a heightmap (one height per x, z), so "am I inside the ground?" is one lookup, `y < worldY(x, z)`. If so, the player is put back on top (0.9 above it) and loses only its downward speed, so it glides along slopes. The camera gets the same check. The seafloor module shares its sampler through `src/systems/seafloor.ts` (null in tabs without a seafloor, or in the 2D map view).

## Update (2026-11-11): the reef counter is the moon cycle
The green dots became **moon phases** (`src/play/MoonPhaseIcon.tsx`): one moon per reef needed for the full moon (5, or all reefs if fewer). Moon *i* shows the phase the night reaches when the *i*-th reef wakes: lit fraction (i + 1) / needed → crescent, half, gibbous, full. Faint outline until its reef wakes, then it glows.

How a phase is drawn: the lit part is the right half-circle plus the **terminator** (day/night line), which seen from Earth is half an ellipse of width `rx = r × |2·lit − 1|` (bulging right for a crescent, left for gibbous; 0 at half moon, r at full). `REEFS_NEEDED` moved to `usePlay.ts` so the overlay and the story use the same number.

## How to play (walkthrough, 2026-11-11)
About 2–4 minutes.
1. **Start:** ▶ Play (top right) → title over the planet → **Dive** → camera flies into the sea → you are the moon child in dark water.
2. **Discover the controls (~15 s):** wait for "The moon is dark tonight." / "Its child has fallen into the sea." Then move: W/S swim, A/D turn, Q/E sink/rise, Shift burst. The water lights up → "Every movement makes light." Fast = big light and you see further; slow = dark and calm.
3. **Find the reefs:** "The reefs below are sleeping. Wake them." Sink (Q) to the seafloor (it's solid). Dim green spheres = sleeping reefs; faint blue lines on the floor = migration routes, follow them reef to reef. Kelp flashes as you brush past.
4. **Wake 5 reefs:** a soft green pillar of light marks the nearest sleeping reef. Swim within ~3.5 units → it bursts with light, a moon icon lights up, the moon rises, and the pillar moves to the next reef. Subtitles: "A reef wakes. Far above, the moon stirs." → "Every reef you wake gives the moon back a little light." → "The moon is rising. Your light fades in hers." The world gets lighter as your glow weakens. A soft wall turns you back at the edge.
5. **End:** 5th reef → full moon → "You were the disturbance." → Play again / Back to the atlas. Esc exits anytime. With no reefs woken, the night still ends by itself after ~5 min.

**Demo route:** dive → swim to show the glow → sink → follow one blue line → wake a reef (about 30 s, every mechanic). Point at the moon icons, and at the world brightening while your glow fades (moonlight vs. bioluminescence).

**Known gaps:** the climax (fireworm display, camera back to the planet) isn't built yet.

### Presenter shortcuts (hidden from the audience)
| Key | Does |
|---|---|
| **N** | Show the next story line now (skip waiting) |
| **R** | Wake the nearest sleeping reef (moon icon lights, moon rises) |
| **Esc** | Leave play mode |

Safe demo: swim and wake 1–2 reefs for real (follow the green pillar), then press **R** a few times to bring the full moon and the ending on cue. 5 × R from anywhere = the closing card ~10 s later.

**Reef beacon** (`src/play/ReefBeacon.tsx`): an additive cylinder at the nearest sleeping reef (found each frame by `ReefNetwork`, shared via `systems/reefs.ts`), brightest at the base, soft edges (view-facing falloff), `fog: false` so it's visible across the map; fades out within ~3 units of the reef. A glowing hint instead of on-screen text.
