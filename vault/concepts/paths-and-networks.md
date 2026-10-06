# Paths and networks (reef migration routes)

Class modules 21–22. In the project: the **Reef paths** tab (`src/modules/paths/`), built on the kelp-covered seafloor ([[distributions]], [[heightmaps-and-noise]]).

![[2026-10-05-paths-3d.png]]

## The ocean reading
- **Nodes = reef colonies**, placed with Poisson disk sampling (large spacing) where the seafloor is high enough (they need light).
- **Edges = which reefs are connected.**
- **Routes = the paths creatures migrate along**, found over the terrain.
- **Sparks** travel the routes both ways: the migration, animated.

## Building the graph (dropdown)
| Rule | Idea | Character |
|---|---|---|
| **Minimum spanning tree** (Prim) | Connect all nodes with the least total length, no loops | A tree; always n − 1 edges |
| **Gabriel graph** | Connect a–b if the circle with diameter ab has no other node inside | Natural network with loops; contains the MST |
| **k nearest neighbours** | Each node links to its k closest | Local; can leave clusters disconnected |

For 15 test nodes: MST 14 edges, Gabriel 30, k = 2 nearest 23.

**Prim's algorithm:** start with one node in the tree; repeatedly add the shortest edge joining the tree to a node outside it.

![[2026-10-05-paths-map-mst.png]]
*Minimum spanning tree: one connected tree, no loops.*

## Finding a route over the terrain
A grid covers the map; each step goes to one of 8 neighbours and costs

```
cost = horizontal distance + slopeCost × |height change|
```

so routes bend around ridges and follow valleys (saving energy, like a migrating animal).

| Algorithm | How | Explored cells |
|---|---|---|
| **Straight line** | Ignore the terrain | none (baseline) |
| **Dijkstra** | Always expand the cheapest-so-far cell; spreads evenly in all directions | many |
| **A\*** | Dijkstra + heuristic h = straight-line distance to the goal; priority = cost so far + h | fewer, focused towards the goal |

Because every step costs at least its distance, h never overestimates (**admissible**), so A\* finds the *same* cheapest route as Dijkstra. Verified: both found cost 76.5 on a test terrain; A\* explored 4312 cells vs. Dijkstra's 5948 (27% fewer; the gap grows when slope cost is lower, because then the straight-line guess is closer to the truth).

- **Priority queue:** a binary min-heap (array where node k's children are 2k+1 and 2k+2) gives the cheapest cell in O(log n).
- **Chaikin smoothing:** replace each segment with points at ¼ and ¾; repeated passes round the grid's zig-zags into curves.

![[2026-10-05-paths-map-astar.png]]
*Gabriel graph, debug on: straight amber lines = the graph, blue curves = terrain-aware routes, dots = cells A\* explored.*

![[2026-10-05-paths-map-dijkstra.png]]
*Same network with Dijkstra: the explored area spreads much further.*

## Sparks (animation)
Spark s on a route sits at fraction `u = (time × speed / length + s / count) mod 1` of its arc length (odd sparks run backwards). The position is found by binary search over the route's cumulative lengths.

## Structure
- The Reef paths tab = Kelp distribution (embedded: kelp without its markers/debug) + the network. The World tab includes it, so the World now has seafloor, kelp, reefs, routes, plankton and the player.
- `graph.ts` (graph rules), `pathfinding.ts` (cost grid, A\*/Dijkstra, Chaikin, heap), `ReefNetwork.tsx` (nodes, routes, sparks), `NetworkDebug.tsx`.

## Related
- Answers the open question "how do networks fit the ocean?" → **migration routes between reefs**.
