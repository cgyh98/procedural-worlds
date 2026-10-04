# Procedural Worlds: Bioluminescent Ocean

A dark ocean world that only lights up where you disturb it. It's an explorable, procedurally generated ocean planet built with React and three.js, themed around bioluminescence and the moon.

> **You are the disturbance.** Nothing glows until you swim through it. Your path leaves a trail of light that slowly fades back to black.

## Concept
- **Planet view:** an ocean planet and its moon, with a 2D world map that wraps onto the sphere, seafloor terrain, biomes and currents.
- **Dive view:** swim through the water; plankton, coral and creatures glow when stirred, and moonlight competes with their light.

Each system (noise, spherical mapping, voxels, erosion, biomes, vector fields, populations, LOD…) is its own module, with sliders, swappable algorithm variants, tooltips and a debug view.

## Status
🚧 Early development. `src/` currently holds a noise + hydraulic erosion terrain prototype that will be reworked into the seafloor.

## Run locally
```bash
npm install
npm run dev
```

## Project notes
The concept, design decisions and a development journal are in [`vault/`](vault/00-index.md), an Obsidian vault.
