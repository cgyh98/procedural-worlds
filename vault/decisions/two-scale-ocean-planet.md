# Two scales: ocean planet + dive view

**Status:** accepted (2026-10-06)

## Context
Spherical mapping (module 6) and the related requirements (sphere geometry comparison, animated 2D map ↔ 3D planet) have been covered in class, and the midterm asks for a coherent "procedural atlas". The open question was whether a planet fits a project whose experiments are mostly a flat, swimmable patch of ocean.

## Options
- **A. Ocean planet as the atlas cover:** a planet view (map wrapping onto the sphere, sphere geometry comparison, orbiting moon with phases) above the existing dive view.
- **B. The moon is the sphere:** spherical mapping only on a procedural moon; the ocean stays flat.
- **C. A standalone lab tab** with the sphere comparison only.

## Choice
**A**, adopting the two-scale structure proposed in `CLAUDE.md`:
- **Planet view:** the ocean world and its moon; map, biomes, currents, tides.
- **Dive view:** the current World; a local patch of the planet.

## Why
- The moon is the project's central influence, and it only fully makes sense with a planet: orbit, phases, the moonlit hemisphere, the tidal bulge.
- An atlas is maps of a world; the planet is the natural cover page, with each experiment as a place on it.
- Later syllabus modules expect a sphere (8 voxels on a planet, 9 map wrapping, 13 global winds/clouds, 14 global currents, 23–24 LOD/streaming between the scales).
- At swimming scale the sphere is locally flat (tangent plane), so the flat dive world is a fair local patch, not a cheat.

## Plan
- Midterm (light): planet tab with sphere geometry dropdown (UV / cube / icosphere / Fibonacci) + pinching debug, seafloor map wrapping onto the sphere (animated), orbiting moon with phases; it doubles as the atlas overview.
- After the midterm: click a region to dive in (LOD / streaming).

## Related
- [[ui-tabs-per-module]], [[heightmaps-and-noise]]
