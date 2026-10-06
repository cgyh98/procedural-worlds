import type { SeafloorSampler } from '../seafloor/useSeafloor'

// ─────────────────────────────────────────────────────────────────────────────
// Pathfinding over the seafloor (class modules 21–22)
//
// The map is covered by a grid of cells. A path is a sequence of cells, each step
// going to one of the 8 neighbours. Every step has a cost:
//
//   cost = horizontal distance + slopeCost × |height change|
//
// so climbing over a ridge is expensive and following a valley is cheap, the way a
// migrating creature would save energy. The search finds the cheapest sequence.
// ─────────────────────────────────────────────────────────────────────────────

export type PathAlgorithm = 'astar' | 'dijkstra' | 'straight'

export type CostGrid = {
  n: number // cells per side
  size: number // map width in world units
  cell: number // cell width
  y: Float32Array // surface height (world units) at each cell centre
}

export function createCostGrid(sampler: SeafloorSampler, size: number, n: number): CostGrid {
  const cell = size / n
  const y = new Float32Array(n * n)
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) y[j * n + i] = sampler.worldY(-size / 2 + (i + 0.5) * cell, -size / 2 + (j + 0.5) * cell)
  return { n, size, cell, y }
}

export type PathResult = {
  points: [number, number, number][] // world positions along the route
  visited: number[] // cell indices the search explored (for the debug view)
}

const toCell = (g: CostGrid, x: number, z: number) => {
  const clamp = (v: number) => Math.min(Math.max(v, 0), g.n - 1)
  return clamp(Math.floor((z + g.size / 2) / g.cell)) * g.n + clamp(Math.floor((x + g.size / 2) / g.cell))
}
const cellX = (g: CostGrid, id: number) => -g.size / 2 + ((id % g.n) + 0.5) * g.cell
const cellZ = (g: CostGrid, id: number) => -g.size / 2 + (Math.floor(id / g.n) + 0.5) * g.cell

// The 8 neighbour directions (di, dj) and their horizontal step lengths (in cells)
const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
] as const

export function findPath(
  g: CostGrid,
  from: { x: number; z: number },
  to: { x: number; z: number },
  algorithm: PathAlgorithm,
  slopeCost: number,
): PathResult {
  const start = toCell(g, from.x, from.z)
  const goal = toCell(g, to.x, to.z)
  if (algorithm === 'straight') return straightLine(g, start, goal)

  // Dijkstra and A* are the same loop; A* adds a heuristic h (an estimate of the
  // remaining cost) to each cell's priority, which pulls the search towards the goal.
  // h = straight-line distance never overestimates (every step costs at least its
  // distance), so A* still finds the truly cheapest path ("admissible" heuristic).
  const useHeuristic = algorithm === 'astar'
  const gx = cellX(g, goal)
  const gz = cellZ(g, goal)
  const h = (id: number) => (useHeuristic ? Math.hypot(cellX(g, id) - gx, cellZ(g, id) - gz) : 0)

  const cost = new Float32Array(g.n * g.n).fill(Infinity) // best known cost from start
  const cameFrom = new Int32Array(g.n * g.n).fill(-1)
  const closed = new Uint8Array(g.n * g.n) // 1 = finished (cheapest cost is final)
  const visited: number[] = []
  const open = new MinHeap()
  cost[start] = 0
  open.push(start, h(start))

  while (open.size > 0) {
    const cur = open.pop()
    if (closed[cur]) continue // stale queue entry: we already found a cheaper way here
    closed[cur] = 1
    visited.push(cur)
    if (cur === goal) break

    const ci = cur % g.n
    const cj = Math.floor(cur / g.n)
    for (const [di, dj, step] of DIRS) {
      const ni = ci + di
      const nj = cj + dj
      if (ni < 0 || nj < 0 || ni >= g.n || nj >= g.n) continue
      const nb = nj * g.n + ni
      if (closed[nb]) continue
      const stepCost = step * g.cell + slopeCost * Math.abs(g.y[nb] - g.y[cur])
      const newCost = cost[cur] + stepCost
      if (newCost < cost[nb]) {
        cost[nb] = newCost
        cameFrom[nb] = cur
        open.push(nb, newCost + h(nb)) // priority: cost so far + estimate of what's left
      }
    }
  }

  // Walk backwards from the goal along cameFrom to recover the route
  const cells: number[] = []
  for (let c = goal; c !== -1; c = cameFrom[c]) cells.push(c)
  cells.reverse()
  return { points: cells.map((c) => [cellX(g, c), g.y[c], cellZ(g, c)]), visited }
}

// Baseline: a straight line from start to goal, just draped over the terrain.
function straightLine(g: CostGrid, start: number, goal: number): PathResult {
  const x0 = cellX(g, start)
  const z0 = cellZ(g, start)
  const x1 = cellX(g, goal)
  const z1 = cellZ(g, goal)
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / g.cell))
  const points: [number, number, number][] = []
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const x = x0 + (x1 - x0) * t
    const z = z0 + (z1 - z0) * t
    points.push([x, g.y[toCell(g, x, z)], z])
  }
  return { points, visited: [] }
}

// Chaikin smoothing: replace every segment by two points at 1/4 and 3/4 of its length.
// Repeating it rounds off the grid's zig-zag corners into smooth curves.
export function chaikin(points: [number, number, number][], iterations: number) {
  let pts = points
  for (let it = 0; it < iterations; it++) {
    if (pts.length < 3) return pts
    const out: [number, number, number][] = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay, az] = pts[i]
      const [bx, by, bz] = pts[i + 1]
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25, az * 0.75 + bz * 0.25])
      out.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75, az * 0.25 + bz * 0.75])
    }
    out.push(pts[pts.length - 1])
    pts = out
  }
  return pts
}

// A binary min-heap: a priority queue that always hands back the item with the
// smallest priority in O(log n). Stored as an array where node k's children are at
// 2k+1 and 2k+2; push "bubbles up", pop moves the last item to the top and "sinks" it.
class MinHeap {
  private ids: number[] = []
  private prio: number[] = []

  get size() {
    return this.ids.length
  }

  push(id: number, p: number) {
    this.ids.push(id)
    this.prio.push(p)
    let k = this.ids.length - 1
    while (k > 0) {
      const parent = (k - 1) >> 1
      if (this.prio[parent] <= this.prio[k]) break
      this.swap(k, parent)
      k = parent
    }
  }

  pop() {
    const top = this.ids[0]
    const lastId = this.ids.pop()!
    const lastP = this.prio.pop()!
    if (this.ids.length > 0) {
      this.ids[0] = lastId
      this.prio[0] = lastP
      let k = 0
      for (;;) {
        const l = 2 * k + 1
        const r = l + 1
        let m = k
        if (l < this.ids.length && this.prio[l] < this.prio[m]) m = l
        if (r < this.ids.length && this.prio[r] < this.prio[m]) m = r
        if (m === k) break
        this.swap(k, m)
        k = m
      }
    }
    return top
  }

  private swap(a: number, b: number) {
    ;[this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]]
    ;[this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]]
  }
}
