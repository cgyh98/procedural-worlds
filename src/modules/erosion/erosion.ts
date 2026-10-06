// ─────────────────────────────────────────────────────────────────────────────
// Particle (droplet) erosion (class module 10)
//
// Ported from my CLASS_03 prototype (after Hans Theobald Beyer / Sebastian Lague).
//
// On land: a raindrop rolls downhill. Fast on a steep slope → it scrapes up sediment;
// slowing down → it drops what it can no longer carry. Tens of thousands of drops
// carve channels along the paths they share, and pile sediment in fans below.
//
// In the ocean the same physics happens through TURBIDITY CURRENTS: underwater
// avalanches of sediment-laden water rushing down slopes. They carve submarine
// canyons and spread sediment fans on the abyssal plain. So each "droplet" here is a
// parcel of sediment flow; "water" is how much flow it has left.
//
// Units: the grid is the heightmap (resolution × resolution), positions are in grid
// cells, heights are the normalized seafloor heights (−1 … 1). The map is changed in
// place.
// ─────────────────────────────────────────────────────────────────────────────

export type ErosionParams = {
  inertia: number // 0…1: how much a droplet keeps its direction vs. following the slope
  capacity: number // how much sediment a fast droplet on a steep slope can carry
  minCapacity: number
  erodeSpeed: number // 0…1: fraction of the free capacity picked up per step
  depositSpeed: number // 0…1: fraction of the excess sediment dropped per step
  evaporateSpeed: number // 0…1: fraction of the flow lost per step
  gravity: number
  lifetime: number // max steps per droplet
}

// Height and slope at a fractional grid position (bilinear: blend the 4 corners).
// The gradient points uphill; a droplet goes the other way.
function heightAndGradient(map: Float32Array, n: number, x: number, y: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const i = y0 * n + x0
  const h00 = map[i]
  const h10 = map[i + 1]
  const h01 = map[i + n]
  const h11 = map[i + n + 1]
  return {
    height: h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy,
    gradX: (h10 - h00) * (1 - fy) + (h11 - h01) * fy,
    gradY: (h01 - h00) * (1 - fx) + (h11 - h10) * fx,
  }
}

// Add (or remove, if negative) height at a fractional position, shared between the
// 4 surrounding grid points by how close each is ("bilinear splat").
function addHeight(map: Float32Array, n: number, x: number, y: number, amount: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const i = y0 * n + x0
  map[i] += amount * (1 - fx) * (1 - fy)
  map[i + 1] += amount * fx * (1 - fy)
  map[i + n] += amount * (1 - fx) * fy
  map[i + n + 1] += amount * fx * fy
}

// Simulate one droplet from a random start. If `path` is given, its positions
// (x, y in grid cells) are recorded for the debug view.
export function simulateDroplet(map: Float32Array, n: number, p: ErosionParams, rand: () => number, path?: number[]) {
  let x = rand() * (n - 2)
  let y = rand() * (n - 2)
  let dirX = 0
  let dirY = 0
  let speed = 1
  let water = 1
  let sediment = 0

  for (let step = 0; step < p.lifetime; step++) {
    path?.push(x, y)
    const here = heightAndGradient(map, n, x, y)

    // New direction: a blend of the old direction (inertia) and downhill (−gradient)
    dirX = dirX * p.inertia - here.gradX * (1 - p.inertia)
    dirY = dirY * p.inertia - here.gradY * (1 - p.inertia)
    const len = Math.hypot(dirX, dirY)
    if (len < 1e-9) break // perfectly flat: nowhere to go
    dirX /= len
    dirY /= len

    // Move one cell along it
    const oldX = x
    const oldY = y
    x += dirX
    y += dirY
    if (x < 0 || x >= n - 1 || y < 0 || y >= n - 1) break // flowed off the map

    const deltaH = heightAndGradient(map, n, x, y).height - here.height // < 0 = going down

    // How much sediment it could carry right now: more when fast, steep and with
    // plenty of flow left
    const capacity = Math.max(-deltaH * speed * water * p.capacity, p.minCapacity)

    if (deltaH > 0 || sediment > capacity) {
      // Going uphill (fill the dip it's climbing out of) or overloaded: DEPOSIT
      const amount = deltaH > 0 ? Math.min(deltaH, sediment) : (sediment - capacity) * p.depositSpeed
      sediment -= amount
      addHeight(map, n, oldX, oldY, amount)
    } else {
      // Room to carry more: ERODE (never dig deeper than the step it just went down)
      const amount = Math.min((capacity - sediment) * p.erodeSpeed, -deltaH)
      addHeight(map, n, oldX, oldY, -amount)
      sediment += amount
    }

    // Gravity speeds it up going down and slows it going up; it slowly runs out of flow
    speed = Math.sqrt(Math.max(0, speed * speed - deltaH * p.gravity))
    water *= 1 - p.evaporateSpeed
    if (water < 0.01) break
  }
}
