# Heightmaps and noise (the seafloor)

Class modules 5 and 9. In the project: the **Seafloor map** tab (`src/modules/seafloor/`), noise in `src/lib/noise.ts`.

![[2026-10-05-seafloor-3d.png]]

## Heightmap
A 2D grid with one number (height) per cell, stored row by row: `heights[j * resolution + i]`.
- Drawn flat with a colour ramp → a **2D map**
- Each vertex pushed up by its height → **3D terrain**

Same data, two views. The **view** dropdown animates between them by scaling the mesh's height (`scale.y` 1 → 0), so nothing is rebuilt. It's a first, small version of the map → planet unwrap transition.

![[2026-10-05-seafloor-2d.png]]
*The same heightmap as a 2D map (heights as colours only).*

## Noise variants (dropdown)
| Noise | How it works | Seafloor reading |
|---|---|---|
| **Perlin** | Random gradients on a square grid, dot products blended with a smooth fade curve | Rolling hills and basins |
| **Simplex** | Same idea on a **triangle** grid (found with a "skew" trick): 3 corners instead of 4, radial falloff per corner → cheaper, fewer grid artifacts | Similar, slightly more organic |
| **Worley** | One random feature point per cell; value = distance to the nearest point (F1) | Cells and pits: vent fields, pockmarks |

![[2026-10-05-seafloor-worley.png]]

## fBm (fractal Brownian motion)
Stack octaves: `height = Σ ampₒ · noise(freqₒ · p)`, with `amp *= persistence` and `freq *= lacunarity` each octave, divided by the total amplitude. Big shapes from the first octave, detail from later ones.

## Ridged style
Per octave `(1 − |noise|)²`: the V-shaped dip of `|noise|` at zero flips into a sharp crest, like **mid-ocean ridges**.

![[2026-10-05-seafloor-ridged.png]]

## Normalization
After generating, heights are stretched to exactly [−1, 1], so the colour ramp and the depth slider mean the same thing for any seed or noise type.

## Rendering
- `PlaneGeometry` with (resolution − 1)² squares has resolution² vertices in heightmap order, so vertex k gets `heights[k]`. Then `computeVertexNormals()` for lighting.
- Dark depth ramp (abyss → ridge tops), dim blue **moonlight** (directional) + ambient. Only the terrain is lit; the glow doesn't need lights.
- Old geometries are disposed when sliders rebuild the mesh (avoids leaking GPU memory).
- The terrain sits at y = −6 so the open water is above it. In the World tab it's under the plankton and the player.

## Debug view
Raw noise values as **grayscale** + the grid **wireframe**.

![[2026-10-05-seafloor-debug.png]]

## Cost
160² vertices × 5 octaves ≈ 5–9 ms per rebuild; 256² × 8 ≈ 22–29 ms (Worley is the slowest: 9 cells checked per sample).

## Related
- [[noise-pipeline]]: the CLASS_03 prototype this builds on (erosion still to bring back)
- [[vector-fields]]: curl noise uses the same Perlin noise
