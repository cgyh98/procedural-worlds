# UI: one tab per module, plus a World tab

**Status:** accepted (2026-10-04)

## Context
The project grows one class topic at a time. Each topic needs its own sliders, algorithm dropdowns, tooltips and debug view, and the final presentation walks through the syllabus pointing at "where concept X shows up." We need a UI structure that grows without rewriting what exists.

## Options
- **A. Each tab is an isolated lab.** Clear per concept, but the pieces never come together into one world.
- **B. One shared world; tabs only switch control panels.** Cohesive, but nearly empty early on and crowded later; hard to isolate a single concept.
- **C. Hybrid:** one lab tab per module + a final **World** tab that combines finished modules.

## Choice
**C (hybrid).**

## Why
- Matches how the class grows: new topic → new tab; when it's ready, it joins the World.
- The presentation can walk the tabs in syllabus order and end on the World.
- Forces each module to work standalone *and* combined, which is the modularity `CLAUDE.md` asks for anyway.

## How it's built
- `src/modules/<name>/` per module: `Scene.tsx` (the 3D component, declares its own leva controls) and `index.ts` (the module description).
- Each module exports a `WorldModule` (`src/modules/types.ts`): `{ id, title, syllabus, about, Scene, inWorld? }`.
- `src/modules/registry.ts` holds the ordered list of tabs; adding a tab = adding one line. The World tab renders every module with `inWorld: true`.
- The app shell (`src/App.tsx`) owns the shared stuff: one `<Canvas>`, background, fog, camera controls, the global debug toggle. It swaps in the active module's `Scene` (with `key` so it remounts cleanly).
- Tab bar (`src/ui/TabBar.tsx`) and concept card (`src/ui/ConceptCard.tsx`) are plain HTML/CSS overlays (`src/ui/ui.css`), a nod to module 1.
- The active tab lives in the zustand store (`src/store/useWorld.ts`) and the URL hash (`#shell`, `#world`), so reloads and links keep the tab.
- leva is rendered with `fill` inside a positioned box so it sits under the tab bar.

## Related
- [[r3f-vs-vanilla-threejs]]
