# Distributions (kelp on the seafloor)

Class modules 15–16. In the project: the **Kelp distribution** tab (`src/modules/distributions/`), built on the seafloor from [[heightmaps-and-noise]].

![[2026-10-05-kelp.png]]

## The question
"Where do I put things?" Three answers, compared with a dropdown:

| Method | How | Result |
|---|---|---|
| **Random** (white noise) | Every point independent, uniform | Clumps and gaps by pure chance; unnatural for plants |
| **Jittered grid** (stratified) | One random point per grid cell | No big gaps, but neighbours can touch across cell borders; the grid can show |
| **Poisson disk** (Bridson 2007) | No two points closer than r | Even but irregular ("blue noise"), like plants competing for space |

Measured on a 40×40 map with r = 1.2:

| Method | Points | Closest pair |
|---|---|---|
| Random | 1111 | 0.019 |
| Jittered grid | 1089 | 0.061 |
| Poisson disk | 712 | **1.200** (exactly r, as guaranteed) |

## Bridson's algorithm
1. Start with one random point; mark it **active**.
2. Pick a random active point; try k = 30 candidates in the ring between r and 2r around it. Keep the first one that's at least r from every existing point (and make it active).
3. If none fit, the point is surrounded: retire it.
4. Repeat until nothing is active.

**Speed trick:** a background grid with cells of side r/√2. A cell that small holds at most one point (its diagonal is r), so checking "anything within r?" only needs the 5×5 nearby cells. ~5 ms for 700 points.

## Filtering by the map (module 16: custom maps)
Candidates are kept only where the seafloor allows it, using a **sampler** that reads the heightmap at any (x, z) with bilinear interpolation:
- **Height band** (habitat): kelp needs light, so only the shallows (default −0.2 … 1 on the −1 … 1 scale).
- **Slope** ≤ max (default 40°): `slope = atan(|∇height|)`, from central differences on the heightmap.

## Poisson vs. random, on the 2D map
Debug rings have radius r/2, so two rings overlap exactly when two points are closer than r.

![[2026-10-05-map-poisson.png]]
*Poisson disk: rings never overlap.*

![[2026-10-05-map-random.png]]
*Random: overlapping clumps and empty patches.*

Switching to the 2D map view now also **flies the camera overhead** while the terrain flattens.

## The kelp itself
- Each accepted point grows a strand: seeded random length (±40%) and sway phase.
- All strands live in **one** `LineSegments` object (one draw call). Every frame on the CPU each strand bends with a sine wave whose amplitude grows as f² towards the tip (roots fixed, tips free).
- Colour: dark cobalt root → sea-green tip, the "glowing edges" motif from [[design-reference-cosmos-board]].
- Follows the shared **excitation** rule ([[excitation-and-player]]): in the World tab, kelp brightens when you swim past.

![[2026-10-05-world-kelp.png]]

## Structure
- `useSeafloor()` (in `src/modules/seafloor/useSeafloor.ts`) = seafloor sliders + heightmap + sampler, reusable by any tab that places things on the terrain.
- The Distributions tab = seafloor + kelp. The World tab includes it (and the seafloor through it).
- Each tab's debug shows its own concept: here the terrain draws normally, and debug shows only the points and rings.
