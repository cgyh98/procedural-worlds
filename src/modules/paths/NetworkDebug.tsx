import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'

type NetworkDebugProps = {
  nodes: [number, number, number][]
  edges: [number, number][]
  visited: number[] // x, y, z of every explored cell
}

// Debug layer for the network:
//   amber straight lines = the graph itself (which reefs are connected), before any
//   pathfinding; compare with the curved routes to see what the terrain changed.
//   dim amber dots = every grid cell the search explored. Switch between Dijkstra and
//   A* to see A*'s heuristic focus the search towards each goal.
export function NetworkDebug({ nodes, edges, visited }: NetworkDebugProps) {
  const edgeGeo = useMemo(() => {
    const out: number[] = []
    for (const [a, b] of edges) out.push(...nodes[a], ...nodes[b])
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(out, 3))
    return geo
  }, [nodes, edges])

  const visitedGeo = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(visited, 3))
    return geo
  }, [visited])

  useEffect(() => () => edgeGeo.dispose(), [edgeGeo])
  useEffect(() => () => visitedGeo.dispose(), [visitedGeo])

  return (
    <>
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial color="#ffb347" transparent opacity={0.6} />
      </lineSegments>
      <points geometry={visitedGeo}>
        <pointsMaterial color="#ffb347" size={2.5} sizeAttenuation={false} transparent opacity={0.45} />
      </points>
    </>
  )
}
