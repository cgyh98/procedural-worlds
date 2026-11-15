# Atlas over game: drop the play mode

## Context
After the midterm the project grew a story/game layer for the 2026-11-11 progress presentation: ▶ Play mode (planet title → camera dive → wake sleeping reefs → the moon rises → closing card), a moon child hero, a reef beacon, a moon-phase counter and presenter shortcuts. Professor feedback after the presentation: the game direction is not it. The **atlas** direction (one lab per class concept + a combined World) is more interesting and leaves more space to try different things.

## Options
| Option | What it means | Catch |
|---|---|---|
| A. Remove the game, keep the rest | Delete the play layer; keep everything that also helps the atlas (atmosphere, solid seafloor, edge falloff, darker night, voxel tweaks, painted style) | Some pieces were made for the game but stay as lab features |
| B. Code back to commit 77bee72 | Exactly the pre-game code | Loses the voxel tweaks, atmosphere, collision, painted style |
| C. Everything back to 77bee72 | Code and vault | Also drops the midterm docs from the repo |

## Choice
**A**, plus: the player body goes back to the **jellyfish**, with an option to draw it in the **painted illustration style** made for the moon child. The moon child stays as an alternative body (not the default).

## What was removed (2026-11-15)
- `src/play/` (PlayDirector, PlayOverlay, ReefBeacon, MoonPhaseIcon, usePlay, play.css)
- the ▶ Play tab button, the play lines in `App.tsx`
- sleeping reefs + nearest-reef tracking (`ReefNetwork.tsx` restored to 77bee72), `systems/reefs.ts`
- play-only darkness overrides in `systems/night.ts`

## What stayed
Moon-driven atmosphere (dome, fog colour, god rays, bubbles, darkness slider, player reveal light), solid seafloor (heightfield collision), edge-falloff slider, grain, painted seafloor test, voxel tweaks, the moon child as an alternative body, all vault notes. The game is still in git history (commit 5622774) if any of it is needed again.

## Why
The class (and the final presentation) is organized around concepts: an atlas lets each concept have its own lab with sliders, dropdowns and a debug view, and the World tab shows them together. A linear game hides that structure behind a story and narrows what can be tried.

Related: [[play-mode]] (removed), [[final-presentation-plan]], [[moon-child-character]], [[hero-art-direction]]
