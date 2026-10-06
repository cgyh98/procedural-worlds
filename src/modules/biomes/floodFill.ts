// ─────────────────────────────────────────────────────────────────────────────
// Flood fill (class module 11)
//
// Flood fill = "start somewhere and spread to every neighbour that matches, until you
// can't spread any more", like paint-bucket in a drawing app. We use a queue
// (breadth-first search): take a cell from the front, add its matching unvisited
// neighbours to the back. The flood grows outwards in rings, which is also how we
// animate it (the order cells were reached in).
// ─────────────────────────────────────────────────────────────────────────────

export type Connectivity = 4 | 8

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]]

// Flood from every border cell that passes `canEnter`. Returns the order each cell was
// reached in (−1 = never reached). Used for the sea: water connected to the open ocean
// at the map edge. Water it can't reach is enclosed (a bay or lagoon).
export function floodFromEdges(n: number, canEnter: (k: number) => boolean, connectivity: Connectivity) {
  const order = new Int32Array(n * n).fill(-1)
  const queue = new Int32Array(n * n) // every cell enters at most once
  let head = 0
  let tail = 0
  let count = 0
  const visit = (k: number) => {
    order[k] = count++
    queue[tail++] = k
  }
  // Seed: all border cells that are water
  for (let i = 0; i < n; i++)
    for (const k of [i, (n - 1) * n + i, i * n, i * n + n - 1]) if (order[k] < 0 && canEnter(k)) visit(k)

  const dirs = connectivity === 4 ? N4 : N8
  while (head < tail) {
    const k = queue[head++]
    const x = k % n
    const y = (k - x) / n
    for (const [dx, dy] of dirs) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue
      const nk = ny * n + nx
      if (order[nk] < 0 && canEnter(nk)) visit(nk)
    }
  }
  return { order, reached: count }
}

// Connected-component labeling: flood fill from every not-yet-labeled cell, giving
// each separate patch of cells with the same `group` value its own label.
// Returns a label per cell and the number of components.
export function labelComponents(n: number, group: (k: number) => number, connectivity: Connectivity) {
  const labels = new Int32Array(n * n).fill(-1)
  const queue = new Int32Array(n * n)
  const dirs = connectivity === 4 ? N4 : N8
  let next = 0
  for (let start = 0; start < n * n; start++) {
    if (labels[start] >= 0) continue
    const g = group(start)
    let head = 0
    let tail = 0
    labels[start] = next
    queue[tail++] = start
    while (head < tail) {
      const k = queue[head++]
      const x = k % n
      const y = (k - x) / n
      for (const [dx, dy] of dirs) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue
        const nk = ny * n + nx
        if (labels[nk] < 0 && group(nk) === g) {
          labels[nk] = next
          queue[tail++] = nk
        }
      }
    }
    next++
  }
  return { labels, count: next }
}
