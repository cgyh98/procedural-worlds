# Biomes and flood fill (tides and bioluminescent bays)

Class module 11. In the project: the **Biomes & tides** tab (`src/modules/biomes/`), on the seafloor from [[heightmaps-and-noise]].

![[2026-10-06-biomes-habitats.png]]

## Biomes: rules on map data
Every heightmap cell gets a category from data we already have. Two classifiers (dropdown):

| Classifier | Rules | Categories |
|---|---|---|
| **Depth zones** | Thresholds on height only | sunlit · twilight · midnight · abyss · hadal trench (the ocean's real light layers) |
| **Habitats** | Depth + slope + a Worley vent field; first matching rule wins | vent field · cliff · reef · kelp forest · abyssal plain · slope |

Habitat rules, in order: deep + near a Worley feature point → **vent field** (the board's rare amber accent); slope > 38° → **cliff**; shallow + gentle → **reef**; shallow-ish → **kelp forest**; deep + flat → **abyssal plain**; else **slope**.

![[2026-10-06-biomes-zones.png]]
*Depth zones.*

## Flood fill
"Start somewhere and spread to every matching neighbour until you can't" (paint bucket). Implemented as **breadth-first search** with a queue: take a cell from the front, push its unvisited matching neighbours to the back. The flood grows in rings, and the order cells are reached in drives the animation.

### Tides → islands and bays
- The **tide level** is a water surface; ground above it is an island.
- Flood **from every map-edge water cell** = the open ocean flowing in.
- Water the flood **never reaches is enclosed**: a **bay**. Real bioluminescent bays (e.g. Mosquito Bay, Puerto Rico) are enclosed waters where dinoflagellates concentrate, so bays get glowing sparkles.
- The moon drives the tide: lower it and bays close off from the ocean (later: tie it to `moonPhase`).

![[2026-10-06-biomes-flood.png]]
*Flood animation: the white front spreads from the edges; dark water hasn't been reached yet.*

### 4 vs. 8 neighbours (dropdown)
With 8 (diagonals), water leaks between two diagonal land cells, so fewer bays stay enclosed. Measured at tide −0.2: 4-neighbour = 26 islands / 8 bays; 8-neighbour = 19 islands / 6 bays.

### Counting with flood fill: connected-component labeling
Flood from every not-yet-labeled cell, giving each patch its own label. Used to count islands, bays, and the patches of each biome (shown live in the panel; the in-browser counts matched the standalone test exactly).

| Tide | Islands | Bays (4-nbr) |
|---|---|---|
| −0.2 (default) | 26 | 8 |
| 0.3 | 33 | 7 |
| 0.45 | 30 | 3 |

Flood fill on 160² cells: ~1 ms.

![[2026-10-06-biomes-high-tide.png]]
*Higher tide (0.3): more, smaller islands.*

## Debug
Every connected biome region in its own colour. Hues step by the golden ratio (0.618 of a turn) per label, so consecutive labels never look alike (a simple hash gave muddy, similar colours). The water sheet is hidden in debug and during the flood animation so the colours underneath read clearly.

![[2026-10-06-biomes-debug.png]]

## Not yet
Biomes don't drive the kelp/reef placement yet (Kelp distribution uses its own height/slope filter). Lab tab for now.
