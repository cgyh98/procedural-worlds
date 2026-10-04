# Procedural Worlds — guidance for Claude

## Project
Browser-based procedural terrain generator (React 19 + TypeScript + three.js + Vite; lil-gui for controls).
Started as a procedural world building (PWB) class project; also a portfolio piece, so keep code clean and the README presentable.
- `src/NoiseTerrain.tsx` — scene, GUI, render loop
- `src/noise/` — pure modules: generators (simplex/value/worley/fbm), shaping, blend, heightmap, erosion, prng, terrainColor
- Commands: `npm run dev`, `npm run build`, `npm run lint`

## The owner is learning
The main goal is understanding procedural generation, not just working code. Explain concepts tied to this codebase and suggest experiments with the GUI.

## Documentation (Obsidian vault at `vault/`)
- Save any explanation, plan or write-up you produce as Markdown in `vault/claude/` (kebab-case filename, start with a `# Title`).
- Concept notes (noise, fBm, erosion…) go in `vault/concepts/`; design choices go in `vault/decisions/` (context → options → choice → why).
- At the end of each work session, add or append to `vault/journal/YYYY-MM-DD.md`: what was done, what was learned, open questions, next steps.
- Use Obsidian `[[wikilinks]]` between notes and link new notes from `vault/00-index.md`.
- Images go in `vault/assets/`.
- Never put secrets in the vault; this repo is public.
