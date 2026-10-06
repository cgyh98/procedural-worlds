import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, Vector3 } from 'three'
import type { ModuleSceneProps } from '../types'
import { createPerlin3D } from '../../lib/noise'
import { useSeafloor } from '../seafloor/useSeafloor'
import { sphereStats, triangleAreas, unitSphere, type SphereType } from './sphereGeometries'
import { computeAngles, writeWrapped } from './planetMesh'
import { Moon } from './Moon'
import { SUN_DIR } from './sun'

const R = 5 // planet radius

type HeightSource = 'noise3d' | 'map'

// Colours (cosmos-board palette): ocean by depth, islands sea-green → icy
const OCEAN_SHALLOW = new Color('#1f64a8')
const OCEAN_DEEP = new Color('#03061a')
const LAND_LOW = new Color('#2f9f8c')
const LAND_HIGH = new Color('#8fd1b8')
// Debug: triangle area relative to the mean
const SMALL = new Color('#2f6bff')
const MEAN = new Color('#d8dde8')
const LARGE = new Color('#ffb347')

export function PlanetScene({ debug }: ModuleSceneProps) {
  const seafloor = useSeafloor() // the 2D map we can wrap onto the planet

  const planet = useControls('Planet', {
    sphere: {
      value: 'ico' as SphereType,
      options: { Icosphere: 'ico', 'UV sphere': 'uv', 'Cube sphere': 'cube', 'Fibonacci sphere': 'fibonacci' } as Record<string, SphereType>,
      hint: 'How the sphere is built from triangles (all with about the same triangle count). Turn on debug to see triangle sizes: the UV sphere pinches at the poles, the cube sphere shrinks near its corners, the icosphere is the most even.',
    },
    detail: {
      value: 4, min: 1, max: 6, step: 1,
      hint: 'Mesh detail: about 4 × (8 × detail)² triangles for every sphere type.',
    },
    source: {
      value: 'noise3d' as HeightSource,
      options: { '3D noise on the sphere': 'noise3d', 'Wrapped 2D seafloor map': 'map' } as Record<string, HeightSource>,
      hint: '3D noise samples the noise at each point of the sphere itself: seamless, no stretching. Wrapping the flat 2D map (equirectangular) shows the classic problems: a seam where the map edges meet, and features stretched near the poles.',
    },
    scale: { value: 1.6, min: 0.5, max: 5, step: 0.05, hint: '3D noise only: how many continents and basins fit around the planet.' },
    seed: { value: 11, min: 1, max: 999, step: 1, hint: '3D noise only: seed for the planet.' },
    seaLevel: {
      label: 'sea level',
      value: 0.2, min: -1, max: 1, step: 0.01,
      hint: 'Water level on the height scale (−1 … 1). An ocean planet: most of it is water; islands poke above.',
    },
    relief: { value: 0.35, min: 0, max: 1.5, step: 0.01, hint: 'How high islands rise above the ocean, in world units.' },
    view: {
      value: 'Planet',
      options: ['Planet', 'Flat map'],
      hint: 'Wrap the flat map onto the sphere, or unwrap the planet into a map. Same data, two views (the 2D map ↔ 3D planet design requirement).',
    },
    spin: { value: 0.12, min: 0, max: 1, step: 0.01, hint: 'How fast the planet turns (radians per second).' },
  })

  const moon = useControls('Moon', {
    orbitSpeed: {
      label: 'orbit speed',
      value: 0.25, min: 0, max: 2, step: 0.01,
      hint: 'How fast the moon orbits. Its phase is computed from the angle between the sun and the moon as seen from the planet.',
    },
  })

  const [, setPanel] = useControls('Planet stats', () => ({
    mesh: { value: '—', editable: false, hint: 'Unique vertices and triangles of the sphere mesh.' },
    evenness: {
      value: '—', editable: false,
      hint: 'Largest ÷ smallest triangle area, and the coefficient of variation (spread of areas ÷ mean area). Lower = more even triangles.',
    },
    moonPhase: { label: 'moon phase', value: '—', editable: false, hint: '0 = new moon, 1 = full moon. Written to the global moonPhase.' },
  }))

  // 1. The sphere mesh (unit radius), its stats and the angles of every vertex
  const k = 8 * planet.detail
  const unit = useMemo(() => unitSphere(planet.sphere, k), [planet.sphere, k])
  const angles = useMemo(() => computeAngles(unit), [unit])
  const stats = useMemo(() => sphereStats(unit), [unit])
  useEffect(() => {
    setPanel({
      mesh: `${stats.vertices.toLocaleString()} vertices · ${stats.triangles.toLocaleString()} triangles`,
      evenness: `max/min ${stats.ratio.toFixed(1)}× · CV ${stats.cv.toFixed(2)}`,
    })
  }, [stats, setPanel])

  // 2. Height at every vertex: 3D noise on the sphere, or sampled from the 2D map
  const heights = useMemo(() => {
    const h = new Float32Array(unit.length / 3)
    const noise = createPerlin3D(planet.seed)
    const { sampler, size } = seafloor
    for (let i = 0; i < h.length; i++) {
      if (planet.source === 'noise3d') {
        // fBm sampled at the point ON the sphere: neighbours on the surface get similar
        // values whichever way you go, so there's no seam and no pole stretching.
        const x = unit[i * 3] * planet.scale
        const y = unit[i * 3 + 1] * planet.scale
        const z = unit[i * 3 + 2] * planet.scale
        let sum = 0
        let amp = 1
        let f = 1
        for (let o = 0; o < 5; o++) {
          sum += amp * noise(x * f, y * f, z * f)
          amp *= 0.5
          f *= 2
        }
        h[i] = Math.max(-1, Math.min(1, sum * 1.4))
      } else {
        // Equirectangular: longitude → map x, latitude → map z. Every row of the map is
        // squeezed into a smaller and smaller circle towards the poles.
        const u = (((angles.lon[i] + Math.PI) / (2 * Math.PI)) % 1 + 1) % 1
        const v = (angles.lat[i] + Math.PI / 2) / Math.PI
        h[i] = sampler.height((u - 0.5) * size, (v - 0.5) * size)
      }
    }
    return h
  }, [unit, angles, planet.source, planet.scale, planet.seed, seafloor])

  // 3. Displacement (only land rises; the ocean surface is flat) and colours
  const { disp, colors } = useMemo(() => {
    const disp = new Float32Array(heights.length)
    const colors = new Float32Array(heights.length * 3)
    const areas = debug ? triangleAreas(unit) : null
    let mean = 0
    if (areas) mean = areas.reduce((s, a) => s + a, 0) / areas.length
    const c = new Color()
    for (let i = 0; i < heights.length; i++) {
      const e = heights[i] - planet.seaLevel
      disp[i] = e > 0 ? e * planet.relief : 0
      if (areas) {
        // log2(area / mean): −1.5 (≈3× smaller) … 0 (average) … +1.5 (≈3× larger)
        const r = Math.log2(Math.max(areas[Math.floor(i / 3)], 1e-9) / mean)
        const tt = Math.min(Math.abs(r) / 1.5, 1)
        c.copy(MEAN).lerp(r < 0 ? SMALL : LARGE, tt)
      } else if (e < 0) c.copy(OCEAN_SHALLOW).lerp(OCEAN_DEEP, Math.min(-e / (1 + planet.seaLevel), 1))
      else c.copy(LAND_LOW).lerp(LAND_HIGH, Math.min(e / Math.max(1 - planet.seaLevel, 0.01), 1))
      colors.set([c.r, c.g, c.b], i * 3)
    }
    return { disp, colors }
  }, [heights, unit, debug, planet.seaLevel, planet.relief])

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(unit.length), 3))
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    return geo
  }, [unit, colors])
  useEffect(() => () => geometry.dispose(), [geometry])

  // 4. Animate: wrap amount t, planet spin, and only rebuild positions when needed
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const wrap = useRef(planet.view === 'Planet' ? 1 : 0)
  const spinAngle = useRef(0)
  const flyTarget = useRef<Vector3 | null>(null)
  const firstView = useRef(true)
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false // the tab's own starting camera handles the first view
      return
    }
    // The flat map is 2πR × πR: about 31 × 16 units, so it needs a farther camera
    flyTarget.current = planet.view === 'Planet' ? new Vector3(0, 3, 21) : new Vector3(0, 0, 32)
  }, [planet.view])
  const written = useRef<{ t: number; geo: BufferGeometry | null; disp: Float32Array | null }>({ t: -1, geo: null, disp: null })

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05)
    const target = planet.view === 'Planet' ? 1 : 0
    wrap.current += (target - wrap.current) * (1 - Math.exp(-2.2 * dt))
    if (Math.abs(target - wrap.current) < 0.0005) wrap.current = target
    const t = wrap.current

    // Spin only as a planet; while unwrapping, ease back to the nearest full turn so
    // the map lands facing the camera
    const g = groupRef.current
    if (g) {
      if (target === 1 && t > 0.98) spinAngle.current += planet.spin * dt
      else {
        const home = Math.round(spinAngle.current / (2 * Math.PI)) * 2 * Math.PI
        spinAngle.current += (home - spinAngle.current) * (1 - Math.exp(-4 * dt))
      }
      g.rotation.y = spinAngle.current
      // Debug: tilt the north pole towards the camera, where the UV sphere pinches
      const tilt = debug && target === 1 ? 0.75 : 0
      g.rotation.x += (tilt - g.rotation.x) * (1 - Math.exp(-4 * dt))
    }

    // Fly the camera back for the (much wider) flat map, and in again for the planet.
    // Only while flying, so you can still orbit freely afterwards.
    if (flyTarget.current) {
      camera.position.lerp(flyTarget.current, 1 - Math.exp(-2.5 * dt))
      camera.lookAt(0, 0, 0)
      if (camera.position.distanceTo(flyTarget.current) < 0.05) flyTarget.current = null
    }

    // Rewrite positions only when the wrap amount or the data changed
    const geo = meshRef.current?.geometry
    const w = written.current
    if (geo && (w.t !== t || w.geo !== geo || w.disp !== disp)) {
      const pos = geo.attributes.position as BufferAttribute
      writeWrapped(pos.array as Float32Array, angles, disp, R, t)
      pos.needsUpdate = true
      geo.computeVertexNormals() // triangle soup → one normal per face (faceted look)
      geo.computeBoundingSphere()
      written.current = { t, geo, disp }
    }
  })

  const onPhase = useCallback(
    (phase: number, waxing: boolean) => setPanel({ moonPhase: `${phase.toFixed(2)} · ${phaseName(phase, waxing)}` }),
    [setPanel],
  )

  return (
    <>
      <directionalLight position={SUN_DIR.clone().multiplyScalar(40)} intensity={2.2} color="#e8eeff" />
      <ambientLight intensity={0.12} color="#3a5a80" />
      <group ref={groupRef}>
        <mesh ref={meshRef} geometry={geometry}>
          {/* Debug: unlit, so the triangle-size colours read on the night side too */}
          {debug ? (
            <meshBasicMaterial vertexColors side={DoubleSide} />
          ) : (
            <meshStandardMaterial vertexColors roughness={0.8} side={DoubleSide} />
          )}
        </mesh>
        {debug && (
          <mesh geometry={geometry}>
            <meshBasicMaterial color="#ffb347" wireframe transparent opacity={0.18} />
          </mesh>
        )}
      </group>
      <Moon speed={moon.orbitSpeed} visible={planet.view === 'Planet'} onPhase={onPhase} />
    </>
  )
}

function phaseName(phase: number, waxing: boolean) {
  if (phase < 0.03) return 'new moon'
  if (phase > 0.97) return 'full moon'
  const dir = waxing ? 'waxing' : 'waning'
  if (phase < 0.47) return `${dir} crescent`
  if (phase < 0.53) return `${dir === 'waxing' ? 'first' : 'last'} quarter`
  return `${dir} gibbous`
}
