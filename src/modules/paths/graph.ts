// ─────────────────────────────────────────────────────────────────────────────
// Networks: nodes and edges (class modules 21–22)
//
// Given a set of nodes (reef colonies), decide which pairs get connected.
// Each rule below builds a different network from the same nodes.
// Edges are returned as [i, j] index pairs, each pair once.
// ─────────────────────────────────────────────────────────────────────────────

export type GraphType = 'mst' | 'gabriel' | 'knn'
export type Node2D = { x: number; z: number }

export function buildGraph(nodes: Node2D[], type: GraphType, k: number): [number, number][] {
  switch (type) {
    case 'mst':
      return minimumSpanningTree(nodes)
    case 'gabriel':
      return gabrielGraph(nodes)
    case 'knn':
      return nearestNeighbours(nodes, k)
  }
}

const dist2 = (a: Node2D, b: Node2D) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2

// ── Minimum spanning tree (Prim's algorithm) ─────────────────────────────────
// Connect every node using the least total edge length, with no loops.
// Prim: start with one node "in the tree". Repeatedly add the shortest edge that
// joins a node in the tree to a node outside it, until every node is in.
// `best[v]` remembers v's shortest known edge to the tree, so each step is a scan.
function minimumSpanningTree(nodes: Node2D[]) {
  const n = nodes.length
  if (n < 2) return []
  const inTree = new Array(n).fill(false)
  const best = new Array(n).fill(Infinity) // shortest distance² from v to the tree
  const from = new Array(n).fill(-1) // which tree node gives that shortest edge
  const edges: [number, number][] = []
  best[0] = 0
  for (let step = 0; step < n; step++) {
    // Pick the closest node not yet in the tree
    let u = -1
    for (let v = 0; v < n; v++) if (!inTree[v] && (u === -1 || best[v] < best[u])) u = v
    inTree[u] = true
    if (from[u] >= 0) edges.push([from[u], u])
    // Now that u is in the tree, it may offer shorter edges to the others
    for (let v = 0; v < n; v++) {
      const d = dist2(nodes[u], nodes[v])
      if (!inTree[v] && d < best[v]) {
        best[v] = d
        from[v] = u
      }
    }
  }
  return edges
}

// ── Gabriel graph ────────────────────────────────────────────────────────────
// Connect a and b if the circle that has the segment ab as its diameter contains
// no other node. Intuition: a and b are "direct neighbours" with nobody standing
// between them. It contains the MST, plus extra edges that create natural loops.
function gabrielGraph(nodes: Node2D[]) {
  const edges: [number, number][] = []
  for (let a = 0; a < nodes.length; a++)
    for (let b = a + 1; b < nodes.length; b++) {
      const mid = { x: (nodes[a].x + nodes[b].x) / 2, z: (nodes[a].z + nodes[b].z) / 2 }
      const r2 = dist2(nodes[a], nodes[b]) / 4 // (diameter / 2)²
      let empty = true
      for (let c = 0; c < nodes.length && empty; c++)
        if (c !== a && c !== b && dist2(nodes[c], mid) < r2) empty = false
      if (empty) edges.push([a, b])
    }
  return edges
}

// ── k nearest neighbours ─────────────────────────────────────────────────────
// Each node connects to its k closest nodes. Simple and local, but nothing
// guarantees the whole network is connected: separate clusters can appear.
function nearestNeighbours(nodes: Node2D[], k: number) {
  const seen = new Set<string>()
  const edges: [number, number][] = []
  for (let a = 0; a < nodes.length; a++) {
    const closest = nodes
      .map((n, b) => ({ b, d: dist2(nodes[a], n) }))
      .filter((o) => o.b !== a)
      .sort((p, q) => p.d - q.d)
      .slice(0, k)
    for (const { b } of closest) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}` // store each pair once
      if (!seen.has(key)) {
        seen.add(key)
        edges.push([Math.min(a, b), Math.max(a, b)])
      }
    }
  }
  return edges
}
