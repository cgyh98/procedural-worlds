import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshBasicMaterial, Points, type BufferAttribute } from 'three'
import { createGlowTexture } from '../../lib/glowTexture'
import { player } from '../../systems/player'
import { reefs } from '../../systems/reefs'

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
  edges: [number, number][] // which two reefs each route connects (same order as routes)
  sparksPerRoute: number
  speed: number
}

// How close (world units) the player must swim to a reef to wake it up
const WAKE_RADIUS = 3.5

// Draws the network: reef nodes, routes as thin filaments, and sparks that travel
// along the routes (the migration, animated).
//
// SLEEPING REEFS: when a player is swimming (World / play mode), every reef starts
// asleep: barely visible, its routes faint and empty. Swim within WAKE_RADIUS of one
// and it wakes for good: a burst of light that settles into a slow breathing glow.
// A route comes alive (brighter line, migrating sparks) once BOTH of its reefs are
// awake, so waking reefs gradually lights up the network. Without a player (the Reef
// paths lab tab) everything is awake, as before.
export function ReefNetwork({ nodes, routes, edges, sparksPerRoute, speed }: ReefNetworkProps) {
  const nodeRefs = useRef<(Mesh | null)[]>([])
  const lineRefs = useRef<({ material: { opacity: number } } | null)[]>([])
  const state = useRef({ level: new Float32Array(0), wokeAt: new Float32Array(0) }) // per reef: 0 asleep → 1 awake; time it woke (−1 = not yet)
  const routeAwake = useRef(new Float32Array(0)) // per route: 0 → 1

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    const S = state.current
    if (S.level.length !== nodes.length) {
      S.level = new Float32Array(nodes.length)
      S.wokeAt = new Float32Array(nodes.length).fill(-1)
    }
    if (routeAwake.current.length !== routes.length) routeAwake.current = new Float32Array(routes.length)
    const sleeping = player.active // reefs only sleep when someone can wake them
    let awakeCount = 0

    // Find the sleeping reef closest to the player (for play mode's beacon and the
    // presenter's "wake nearest" shortcut).
    let nearest = -1
    let nearestD = Infinity
    if (sleeping) {
      for (let i = 0; i < nodes.length; i++) {
        if (S.wokeAt[i] >= 0) continue
        const [x, y, z] = nodes[i]
        const d = Math.hypot(player.position.x - x, player.position.y - y, player.position.z - z)
        if (d < nearestD) {
          nearestD = d
          nearest = i
        }
      }
    }
    if (reefs.wakeRequest) {
      if (nearest >= 0) S.wokeAt[nearest] = t
      reefs.wakeRequest = false
      nearest = -1 // it's awake now; the beacon moves on next frame
    }
    reefs.hasNearest = nearest >= 0
    if (nearest >= 0) {
      const [x, y, z] = nodes[nearest]
      reefs.nearest.x = x
      reefs.nearest.y = y
      reefs.nearest.z = z
    }

    for (let i = 0; i < nodes.length; i++) {
      const [x, y, z] = nodes[i]
      if (sleeping && S.wokeAt[i] < 0) {
        const d = Math.hypot(player.position.x - x, (player.position.y - y) * 0.6, player.position.z - z)
        if (d < WAKE_RADIUS) S.wokeAt[i] = t
      }
      const target = !sleeping || S.wokeAt[i] >= 0 ? 1 : 0
      if (target) awakeCount++
      S.level[i] += (target - S.level[i]) * (1 - Math.exp(-2.5 * dt))

      const mesh = nodeRefs.current[i]
      if (!mesh) continue
      // The burst: a spike of light right after waking that decays in about a second
      const burst = S.wokeAt[i] >= 0 && sleeping ? 3 * Math.exp(-(t - S.wokeAt[i]) * 2.2) : 0
      const breathe = 0.85 + 0.15 * Math.sin(t * 1.4 + i * 1.7)
      const brightness = 0.07 + S.level[i] * breathe + burst
      ;(mesh.material as MeshBasicMaterial).color.copy(REEF).multiplyScalar(brightness)
      mesh.scale.setScalar(0.55 + 0.45 * S.level[i] + 0.35 * Math.min(burst, 1))
    }

    for (let r = 0; r < routes.length; r++) {
      const [a, b] = edges[r] ?? [0, 0]
      const alive = Math.min(S.level[a] ?? 1, S.level[b] ?? 1)
      routeAwake.current[r] = alive
      const line = lineRefs.current[r]
      if (line) line.material.opacity = 0.1 + 0.7 * alive
    }

    reefs.awake = sleeping ? awakeCount : nodes.length
    reefs.total = nodes.length
  })

  return (
    <>
      {nodes.map((p, i) => (
        <mesh key={i} position={p} ref={(m) => void (nodeRefs.current[i] = m)}>
          <sphereGeometry args={[0.35, 16, 12]} />
          <meshBasicMaterial color={REEF} toneMapped={false} />
        </mesh>
      ))}
      {routes.map((r, i) =>
        r.points.length > 1 ? (
          // drei's <Line> draws real-width lines (plain WebGL lines are always 1px)
          <Line
            key={i}
            ref={(l) => void (lineRefs.current[i] = l as unknown as { material: { opacity: number } } | null)}
            points={r.points}
            color={ROUTE}
            lineWidth={1.5}
            toneMapped={false}
            transparent
            opacity={0.8}
          />
        ) : null,
      )}
      <Sparks routes={routes} perRoute={sparksPerRoute} speed={speed} awake={routeAwake} />
    </>
  )
}

// Sparks moving along the routes. Spark s on a route sits at fraction
//   u = (time × speed / routeLength + s / count) mod 1
// of the way along, so sparks are evenly spaced and loop forever. Odd sparks run
// backwards: migration goes both ways between reefs.
function Sparks({ routes, perRoute, speed, awake }: { routes: Route[]; perRoute: number; speed: number; awake: MutableRefObject<Float32Array> }) {
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
    for (let ri = 0; ri < routes.length; ri++) {
      const r = routes[ri]
      const alive = (awake.current[ri] ?? 1) > 0.5 // sleeping routes carry no migration
      for (let s = 0; s < perRoute; s++) {
        if (!alive) {
          pos[k++] = 0
          pos[k++] = -9999 // parked far below, out of sight
          pos[k++] = 0
          continue
        }
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
