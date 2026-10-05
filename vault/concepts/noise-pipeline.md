# The terrain pipeline

> Code reference: this describes the PWB_CLASS_03 prototype. It was removed from this repo on 2026-10-04; see ~/Documents/PWB_CLASS_03 or commit 7020c32.

noise → fBm octaves → normalize & shape → blend layers → heightmap → erosion → 3D mesh + colour

1. **Noise** (`src/noise/generators.ts`) gives smooth, repeatable randomness from a seed. Value noise interpolates random lattice values; simplex uses gradients on a triangular grid; Worley measures the distance to the nearest random feature point (cells).
2. **fBm** sums octaves: frequency is multiplied by *lacunarity* (~2) and amplitude by *persistence* (~0.5) at each octave, giving detail at many scales.
3. **Shaping** (`shaping.ts`) remaps values in [0,1]: power > 1 gives flat valleys and sharp peaks, terrace gives steps, clamp gives a floor.
4. **Blending** (`blend.ts`, `heightmap.ts`) combines layers like Photoshop layers with opacity.
5. **Hydraulic erosion** (`erosion.ts`): droplets roll downhill, erode when carrying less than their capacity and deposit when they slow down, carving channels.
6. **Render**: height × heightScale displaces the mesh; colour comes from height bands (`terrainColor.ts`).

## Experiments
- Change fBm octaves from 1 to 8
- Power shaping at 2–3
- Low-frequency base layer plus a high-frequency fBm layer added at about 0.2 opacity
- Erosion with inertia 0.05 vs 0.8
