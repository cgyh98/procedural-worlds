import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, type BufferAttribute } from 'three'
import { createGlowTexture } from '../../lib/glowTexture'

export type Route = {
  points: [number, number, number][] // smoothed, lifted above the terrain
  cumulative: number[] // arc length from the start to each point (for the sparks)
  length: number
}

// Palette from the cosmos board: electric blue filaments, sea-green reef nodes,
// cyan-white sparks (the hottest cores).
const ROUTE = new Color(0.25, 0.75, 2.2)
const REEF = new Color(0.4, 2.2, 1.3)
const SPARK = new Color(1.1, 2.4, 2.8)

type ReefNetworkProps = {
  nodes: [number, number, number][]
  routes: Route[]
  sparksPerRoute: number
  speed: number
}

// Draws the network: glowing reef nodes, routes as thin filaments, and sparks that
// travel along the routes (the migration, animated).
export function ReefNetwork({ nodes, routes, sparksPerRoute, speed }: ReefNetworkProps) {
  return (
    <>
      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.35, 16, 12]} />
          <meshBasicMaterial color={REEF} toneMapped={false} />
        </mesh>
      ))}
      {routes.map((r, i) =>
        r.points.length > 1 ? (
          // drei's <Line> draws real-width lines (plain WebGL lines are always 1px)
          <Line key={i} points={r.points} color={ROUTE} lineWidth={1.5} toneMapped={false} transparent opacity={0.8} />
        ) : null,
      )}
      <Sparks routes={routes} perRoute={sparksPerRoute} speed={speed} />
    </>
  )
}

// Sparks moving along the routes. Spark s on a route sits at fraction
//   u = (time × speed / routeLength + s / count) mod 1
// of the way along, so sparks are evenly spaced and loop forever. Odd sparks run
// backwards: migration goes both ways between reefs.
function Sparks({ routes, perRoute, speed }: { routes: Route[]; perRoute: number; speed: number }) {
  const pointsRef = useRef<Points>(null)
  const texture = useMemo(() => createGlowTexture(), [])
  const count = routes.length * perRoute
  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3))
    return geo
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    const pts = pointsRef.current
    if (!pts || count === 0) return
    const attr = pts.geometry.attributes.position as BufferAttribute
    const pos = attr.array as Float32Array
    const t = clock.elapsedTime
    let k = 0
    for (const r of routes) {
      for (let s = 0; s < perRoute; s++) {
        let u = (((t * speed) / Math.max(r.length, 0.001) + s / perRoute) % 1 + 1) % 1
        if (s % 2 === 1) u = 1 - u
        const [x, y, z] = pointAt(r, u * r.length)
        pos[k++] = x
        pos[k++] = y
        pos[k++] = z
      }
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={texture}
        color={SPARK}
        size={0.45}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

// The point at arc length d along a route: binary-search the segment that contains
// d, then interpolate inside it.
function pointAt(r: Route, d: number): [number, number, number] {
  const c = r.cumulative
  if (r.points.length < 2) return r.points[0] ?? [0, 0, 0]
  let lo = 0
  let hi = c.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (c[mid] <= d) lo = mid
    else hi = mid
  }
  const seg = c[hi] - c[lo] || 1
  const f = (d - c[lo]) / seg
  const a = r.points[lo]
  const b = r.points[hi]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}
