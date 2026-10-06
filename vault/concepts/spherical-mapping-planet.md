# Spherical mapping: the ocean planet

Class module 6, plus the sphere-pinching data-structure requirement and the animated 2D map ↔ 3D planet design requirement. In the project: the **Ocean planet** tab (`src/modules/planet/`), the first tab and the page the site opens on (the atlas cover). Decision: [[two-scale-ocean-planet]].

![[2026-10-06-planet.png]]

## Four sphere constructions (dropdown)
Every sphere is a mesh of flat triangles; the layout decides how even the detail is. All four are sized from one detail number so they get about the same triangle count (fair comparison). Measured at 2,200–2,400 triangles:

| Sphere | How | Largest ÷ smallest area | CV (spread / mean) |
|---|---|---|---|
| **UV** | Latitude/longitude grid | **7.7×** (pole pinching) | 0.43 |
| **Cube** | Subdivided cube, vertices pushed to radius 1 | 4.7× (corners) | 0.38 |
| **Icosphere** | Subdivided icosahedron | 1.8× | 0.13 |
| **Fibonacci** | N points spiralled by the golden angle (≈137.5°), joined by their convex hull | 1.6× | **0.03** |

**Debug** colours each triangle by `log2(area / mean area)`: blue = smaller, white = average, amber = larger. It also tilts the north pole towards the camera and turns lighting off so the colours read everywhere.

| UV: pinching at the pole | Icosphere: faint pentagons at the 12 original corners |
|---|---|
| ![[2026-10-06-planet-debug-uv.png]] | ![[2026-10-06-planet-debug-ico.png]] |

| Cube sphere | Fibonacci sphere |
|---|---|
| ![[2026-10-06-planet-debug-cube.png]] | ![[2026-10-06-planet-debug-fib.png]] |

## Where the heights come from (dropdown)
- **3D noise on the sphere:** fBm sampled at each point *on* the sphere. Neighbours on the surface get similar values in every direction: no seam, no pole stretching.
- **Wrapped 2D seafloor map** (equirectangular): longitude → map x, latitude → map z. Shows the classic problems: a **seam** where the map's left and right edges meet, and features **smeared into horizontal streaks near the poles** (every map row is squeezed into a smaller circle).

![[2026-10-06-planet-wrapped-map.png]]

## Longitude / latitude per vertex
`lat = asin(y)`, `lon = atan2(x, z)`. Two fixes per triangle:
- **Seam:** if a triangle's corners span more than π in longitude it straddles the ±π line; add 2π to its negative corners so it stays whole.
- **Poles:** longitude is undefined at ±90°; a pole corner takes the average longitude of the triangle's other corners.

Triangles that *contain* the pole still span widely on the flat map. That's the true picture: on an equirectangular map the pole is stretched across the whole top edge.

## The wrap / unwrap animation
Lay the flat map on a sphere of radius `Rt`. Huge `Rt` → it looks flat; shrink `Rt` to `R` → it curls into the planet. With `t = R / Rt` from 0 to 1:

```
angles scale by t:   lon·t, lat·t
point  = (0, 0, R − Rt) + (Rt + height) · (cos(lat·t)·sin(lon·t), sin(lat·t), cos(lat·t)·cos(lon·t))
```

The centre keeps the map's front at `z = R` the whole time. At t = 1 it matches the sphere (verified: error ~10⁻⁶). Because it only needs each vertex's lon/lat/height, it works for **all four** sphere types. The camera flies back for the map (it's 2πR × πR ≈ 31 × 16 units) and the planet's spin eases back to face front.

| Unwrapping | Flat map |
|---|---|
| ![[2026-10-06-planet-unwrapping.png]] | ![[2026-10-06-planet-map.png]] |

## Ocean planet look
- Only land above sea level is raised; the ocean surface is flat and coloured by depth (a bathymetric map).
- Triangle soup + `computeVertexNormals` = one normal per face: a faceted, low-poly look.

## The moon
- A cratered icosphere (3D noise dents) on a slightly tilted orbit, tidally locked (same face towards the planet).
- **Phase** from geometry: `lit fraction = (1 − sun · moon) / 2` (dot product of the unit directions from the planet). Full = opposite the sun; new = between planet and sun. Waxing/waning from which side of the sun line it's on.
- Writes the global **`moonPhase`** (zustand store) four times a second, ready for glow visibility, tides and migration. Shown live in the panel (e.g. "0.78 · waxing gibbous").

## Not yet
- Click a region to dive in (LOD / streaming, modules 23–24).
- Tides on the planet driven by the moon; biome colours on the globe.
- The seafloor sliders appear in this tab's panel (they feed the wrapped-map source), including the seafloor's own "view" dropdown, which doesn't affect the planet.
