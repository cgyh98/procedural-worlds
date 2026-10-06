import { useMemo } from 'react'
import { useControls } from 'leva'
import type { ModuleSceneProps } from '../types'
import { useSeafloor, FLOOR_Y } from '../seafloor/useSeafloor'
import { DistributionsScene } from '../distributions/Scene'
import { samplePoints } from '../distributions/sampling'
import { buildGraph, type GraphType } from './graph'
import { chaikin, createCostGrid, findPath, type PathAlgorithm } from './pathfinding'
import { ReefNetwork, type Route } from './ReefNetwork'
import { NetworkDebug } from './NetworkDebug'

const HOVER = 0.3 // routes float a little above the seafloor

// Paths = the kelp-covered seafloor + a network of reefs and migration routes.
export function PathsScene({ debug }: ModuleSceneProps) {
  const seafloor = useSeafloor()
  const { sampler, size, is2D } = seafloor

  const net = useControls('Reef network', {
    spacing: {
      value: 7, min: 4, max: 16, step: 0.5,
      hint: 'Minimum distance between reef colonies (they are placed with Poisson disk sampling, like the kelp).',
    },
    minHeight: {
      label: 'min height',
      value: -0.3, min: -1, max: 1, step: 0.01,
      hint: 'Reefs only form where the seafloor is at least this high (−1 trench … 1 ridge): they need light.',
    },
    graph: {
      value: 'gabriel' as GraphType,
      options: { 'Gabriel graph': 'gabriel', 'Minimum spanning tree': 'mst', 'k nearest neighbours': 'knn' } as Record<string, GraphType>,
      hint: 'Which reefs get connected. MST: every reef, shortest total length, no loops. Gabriel: connect two reefs if no other reef is inside the circle between them (natural loops). k nearest: each reef links to its k closest (may leave clusters apart).',
    },
    k: {
      value: 2, min: 1, max: 5, step: 1,
      hint: 'For k nearest neighbours: how many links each reef makes.',
    },
    seed: {
      value: 5, min: 1, max: 999, step: 1,
      hint: 'Seed for the reef positions.',
    },
  })

  const pf = useControls('Pathfinding', {
    algorithm: {
      value: 'astar' as PathAlgorithm,
      options: { 'A*': 'astar', Dijkstra: 'dijkstra', 'Straight line': 'straight' } as Record<string, PathAlgorithm>,
      hint: 'How each connection becomes a route. Straight line ignores the terrain. Dijkstra explores outward evenly and finds the cheapest route. A* finds the same route but uses the distance to the goal as a guide, so it explores fewer cells (turn on debug to compare).',
    },
    slopeCost: {
      label: 'slope cost',
      value: 6, min: 0, max: 20, step: 0.5,
      hint: 'Extra cost per unit of climbing or descending. 0 = routes go straight; higher = routes curve around ridges and follow valleys, saving energy.',
    },
    grid: {
      value: 80, min: 32, max: 128, step: 8,
      hint: 'Cells per side of the pathfinding grid. Finer = smoother routes, slower search.',
    },
    smoothing: {
      value: 2, min: 0, max: 4, step: 1,
      hint: 'Chaikin smoothing passes: each pass cuts the corners of the grid zig-zag into curves.',
    },
  })

  const mig = useControls('Migration', {
    sparks: {
      value: 6, min: 0, max: 20, step: 1,
      hint: 'Glowing sparks travelling along each route (half each way): creatures migrating between reefs.',
    },
    speed: {
      value: 1.5, min: 0, max: 6, step: 0.1,
      hint: 'How fast the sparks travel (world units per second).',
    },
  })

  // 1. Reef nodes: Poisson disk (inset from the edges), kept where the seafloor is high enough
  const nodes2D = useMemo(() => {
    const pts = samplePoints('poisson', size * 0.85, net.spacing, net.seed)
    const out: { x: number; z: number }[] = []
    for (let p = 0; p < pts.length; p += 2)
      if (sampler.height(pts[p], pts[p + 1]) >= net.minHeight) out.push({ x: pts[p], z: pts[p + 1] })
    return out
  }, [size, net.spacing, net.seed, net.minHeight, sampler])

  // 2. Edges: which reefs connect
  const edges = useMemo(() => buildGraph(nodes2D, net.graph, net.k), [nodes2D, net.graph, net.k])

  // 3. Routes: pathfind each edge over the terrain cost grid
  const grid = useMemo(() => createCostGrid(sampler, size, pf.grid), [sampler, size, pf.grid])
  const search = useMemo(() => {
    const results = edges.map(([a, b]) => findPath(grid, nodes2D[a], nodes2D[b], pf.algorithm, pf.slopeCost))
    // Every explored cell (once), as world positions for the debug view
    const seen = new Uint8Array(grid.n * grid.n)
    const visited: number[] = []
    for (const r of results)
      for (const c of r.visited)
        if (!seen[c]) {
          seen[c] = 1
          visited.push(-size / 2 + ((c % grid.n) + 0.5) * grid.cell, grid.y[c] + 0.05, -size / 2 + (Math.floor(c / grid.n) + 0.5) * grid.cell)
        }
    return { paths: results.map((r) => r.points), visited }
  }, [edges, grid, nodes2D, pf.algorithm, pf.slopeCost, size])

  // 4. Final geometry: smooth, lift above the terrain (or flatten onto the 2D map),
  //    and measure arc lengths for the sparks.
  const routes = useMemo<Route[]>(
    () =>
      search.paths.map((raw) => {
        const points = chaikin(raw, pf.smoothing).map(([x, y, z]) => [x, is2D ? FLOOR_Y + 0.05 : y + HOVER, z] as [number, number, number])
        const cumulative = [0]
        for (let i = 1; i < points.length; i++)
          cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]))
        return { points, cumulative, length: cumulative[cumulative.length - 1] }
      }),
    [search, pf.smoothing, is2D],
  )
  const nodes = useMemo(
    () => nodes2D.map(({ x, z }) => [x, is2D ? FLOOR_Y + 0.1 : sampler.worldY(x, z) + HOVER, z] as [number, number, number]),
    [nodes2D, sampler, is2D],
  )
  const visited = useMemo(
    () => (is2D ? search.visited.map((v, i) => (i % 3 === 1 ? FLOOR_Y + 0.03 : v)) : search.visited),
    [search.visited, is2D],
  )

  return (
    <>
      {/* The kelp-covered seafloor, without its own markers or debug: this tab's debug is the network */}
      <DistributionsScene debug={false} embedded />
      <ReefNetwork nodes={nodes} routes={routes} sparksPerRoute={mig.sparks} speed={mig.speed} />
      {debug && <NetworkDebug nodes={nodes} edges={edges} visited={visited} />}
    </>
  )
}
