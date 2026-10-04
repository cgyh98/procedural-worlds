// Droplet-based hydraulic erosion (after Hans Theobald Beyer / Sebastian Lague's algorithm).
// Each droplet flows downhill across the heightmap, picking up sediment on steep fast stretches
// and depositing it where it slows down, mutating the map in place.

export interface ErosionParams {
  dropletsPerFrame: number
  inertia: number // 0..1, how much a droplet keeps its previous direction vs following the slope
  sedimentCapacityFactor: number // how much sediment a fast droplet on a steep slope can carry
  minSedimentCapacity: number
  erodeSpeed: number // 0..1, fraction of the capacity gap picked up per step
  depositSpeed: number // 0..1, fraction of excess sediment dropped per step
  evaporateSpeed: number // 0..1, fraction of water lost per step
  gravity: number
  maxDropletLifetime: number
  initialWaterVolume: number
  initialSpeed: number
}

export const DEFAULT_EROSION_PARAMS: ErosionParams = {
  dropletsPerFrame: 60,
  inertia: 0.05,
  sedimentCapacityFactor: 4,
  minSedimentCapacity: 0.01,
  erodeSpeed: 0.3,
  depositSpeed: 0.3,
  evaporateSpeed: 0.02,
  gravity: 4,
  maxDropletLifetime: 30,
  initialWaterVolume: 1,
  initialSpeed: 1,
}

function clampIndex(v: number, max: number): number {
  return v < 0 ? 0 : v > max ? max : v
}

function heightAndGradient(
  map: Float32Array,
  res: number,
  x: number,
  y: number,
): [height: number, gradX: number, gradY: number] {
  const x0 = clampIndex(Math.floor(x), res - 1)
  const y0 = clampIndex(Math.floor(y), res - 1)
  const x1 = clampIndex(x0 + 1, res - 1)
  const y1 = clampIndex(y0 + 1, res - 1)
  const fx = x - Math.floor(x)
  const fy = y - Math.floor(y)

  const h00 = map[y0 * res + x0]
  const h10 = map[y0 * res + x1]
  const h01 = map[y1 * res + x0]
  const h11 = map[y1 * res + x1]

  const gradX = (h10 - h00) * (1 - fy) + (h11 - h01) * fy
  const gradY = (h01 - h00) * (1 - fx) + (h11 - h10) * fx
  const height = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy

  return [height, gradX, gradY]
}

// Bilinear-splats a height delta onto the 4 grid points surrounding (x, y).
function addHeight(map: Float32Array, res: number, x: number, y: number, amount: number): void {
  const x0 = clampIndex(Math.floor(x), res - 1)
  const y0 = clampIndex(Math.floor(y), res - 1)
  const x1 = clampIndex(x0 + 1, res - 1)
  const y1 = clampIndex(y0 + 1, res - 1)
  const fx = x - Math.floor(x)
  const fy = y - Math.floor(y)

  map[y0 * res + x0] += amount * (1 - fx) * (1 - fy)
  map[y0 * res + x1] += amount * fx * (1 - fy)
  map[y1 * res + x0] += amount * (1 - fx) * fy
  map[y1 * res + x1] += amount * fx * fy
}

function simulateDroplet(
  map: Float32Array,
  res: number,
  params: ErosionParams,
  rand: () => number,
): void {
  let posX = rand() * (res - 1)
  let posY = rand() * (res - 1)
  let dirX = 0
  let dirY = 0
  let speed = params.initialSpeed
  let water = params.initialWaterVolume
  let sediment = 0

  for (let step = 0; step < params.maxDropletLifetime; step++) {
    const [height, gradX, gradY] = heightAndGradient(map, res, posX, posY)

    dirX = dirX * params.inertia - gradX * (1 - params.inertia)
    dirY = dirY * params.inertia - gradY * (1 - params.inertia)
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1
    dirX /= len
    dirY /= len

    const oldX = posX
    const oldY = posY
    posX += dirX
    posY += dirY

    if (posX < 0 || posX >= res - 1 || posY < 0 || posY >= res - 1) break

    const newHeight = heightAndGradient(map, res, posX, posY)[0]
    const deltaHeight = newHeight - height

    const sedimentCapacity = Math.max(
      -deltaHeight * speed * water * params.sedimentCapacityFactor,
      params.minSedimentCapacity,
    )

    if (deltaHeight > 0 || sediment > sedimentCapacity) {
      const depositAmount =
        deltaHeight > 0 ? Math.min(deltaHeight, sediment) : (sediment - sedimentCapacity) * params.depositSpeed
      sediment -= depositAmount
      addHeight(map, res, oldX, oldY, depositAmount)
    } else {
      const erodeAmount = Math.min((sedimentCapacity - sediment) * params.erodeSpeed, -deltaHeight)
      addHeight(map, res, oldX, oldY, -erodeAmount)
      sediment += erodeAmount
    }

    speed = Math.sqrt(Math.max(0, speed * speed + deltaHeight * params.gravity))
    water *= 1 - params.evaporateSpeed
    if (water < 0.001) break
  }
}

export function simulateErosionStep(
  map: Float32Array,
  res: number,
  params: ErosionParams,
  rand: () => number,
): void {
  for (let i = 0; i < params.dropletsPerFrame; i++) {
    simulateDroplet(map, res, params, rand)
  }
}
