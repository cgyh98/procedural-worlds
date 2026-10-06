import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { BufferAttribute, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, Points } from 'three'
import type { ModuleSceneProps } from '../types'
import { useSeafloor, FLOOR_Y } from '../seafloor/useSeafloor'
import { buildTerrainGeometry } from '../seafloor/terrainGeometry'
import { mulberry32 } from '../../lib/random'
import { simulateDroplet, type ErosionParams } from './erosion'

// Same cobalt depth ramp as the seafloor, kept short here
const DEEP = new Color('#03061a')
const MID = new Color('#143a7a')
const HIGH = new Color('#6cc4e4')
// Debug diff colours: carved away vs. deposited
const ERODED = new Color('#ffb347')
const DEPOSITED = new Color('#3fd6e0')
const NEUTRAL = new Color('#1a2440')

export function ErosionScene({ debug }: ModuleSceneProps) {
  const seafloor = useSeafloor()
  const { heights: original, resolution: n, size, depth } = seafloor

  const [resetCount, setResetCount] = useState(0)
  const sim = useControls('Erosion', {
    running: { value: true, hint: 'Play / pause the simulation. Each frame drops a batch of sediment flows on the seafloor.' },
    reset: button(() => setResetCount((c) => c + 1)),
    dropletsPerFrame: {
      label: 'flows / frame',
      value: 120, min: 0, max: 600, step: 10,
      hint: 'How many sediment-flow "droplets" run each frame. More = faster erosion (and more CPU).',
    },
    maxThousands: {
      label: 'total flows (k)',
      value: 60, min: 5, max: 300, step: 5,
      hint: 'The simulation stops after this many droplets, in thousands (60 = 60,000).',
    },
    inertia: {
      value: 0.05, min: 0, max: 0.9, step: 0.01,
      hint: 'How much a flow keeps its direction instead of following the slope. Higher = straighter, longer canyons.',
    },
    capacity: {
      value: 2, min: 0.5, max: 16, step: 0.1,
      hint: 'How much sediment a fast flow on a steep slope can carry. Higher = deeper carving.',
    },
    erodeSpeed: {
      label: 'erode speed',
      value: 0.3, min: 0, max: 1, step: 0.01,
      hint: 'Fraction of its free carrying capacity a flow picks up per step.',
    },
    depositSpeed: {
      label: 'deposit speed',
      value: 0.3, min: 0, max: 1, step: 0.01,
      hint: 'Fraction of its excess sediment a slowing flow drops per step. Higher = sediment settles closer to where it was picked up.',
    },
    evaporate: {
      value: 0.02, min: 0.001, max: 0.2, step: 0.001,
      hint: 'Fraction of the flow lost each step (on land: evaporation; underwater: the current dissipating).',
    },
    gravity: {
      value: 4, min: 0.5, max: 12, step: 0.1,
      hint: 'How strongly going downhill speeds a flow up.',
    },
  })

  const [, setStats] = useControls('Erosion stats', () => ({
    // Start with text, not '0': leva guesses the field type from the first value
    flows: { value: '—', editable: false, hint: 'Droplets simulated so far.' },
  }))

  // The working copy of the heightmap that the simulation carves. Reset whenever the
  // seafloor itself changes or the reset button is pressed.
  const working = useRef<Float32Array>(new Float32Array(0))
  const done = useRef(0) // droplets simulated
  const rand = useRef(mulberry32(1))
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const pathsRef = useRef<Points>(null)

  const geometry = useMemo(() => {
    const geo = buildTerrainGeometry(original, n, size)
    geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * n * 3), 3))
    return geo
  }, [original, n, size])
  useEffect(() => () => geometry.dispose(), [geometry])

  useEffect(() => {
    working.current = original.slice()
    done.current = 0
    rand.current = mulberry32(12345 + resetCount)
  }, [original, resetCount])

  // Debug: the paths of the latest batch of droplets
  const pathGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(4000 * 3), 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])
  useEffect(() => () => pathGeometry.dispose(), [pathGeometry])

  const params: ErosionParams = {
    inertia: sim.inertia,
    capacity: sim.capacity,
    minCapacity: 0.01,
    erodeSpeed: sim.erodeSpeed,
    depositSpeed: sim.depositSpeed,
    evaporateSpeed: sim.evaporate,
    gravity: sim.gravity,
    lifetime: 40,
  }

  const maxDroplets = sim.maxThousands * 1000
  const lastStats = useRef(0)
  useFrame(({ clock }) => {
    const map = working.current
    const mesh = meshRef.current
    if (map.length !== n * n || !groupRef.current || !mesh) return
    groupRef.current.scale.y = depth

    // 1. Run this frame's batch of droplets (recording a few paths for the debug view)
    const path: number[] = []
    if (sim.running && done.current < maxDroplets) {
      const batch = Math.min(sim.dropletsPerFrame, maxDroplets - done.current)
      for (let d = 0; d < batch; d++) simulateDroplet(map, n, params, rand.current, d < 40 ? path : undefined)
      done.current += batch
    }

    // 2. Copy the carved heights into the mesh, and colour it
    const geo = mesh.geometry
    const pos = geo.attributes.position as BufferAttribute
    const col = geo.attributes.color as BufferAttribute
    const c = new Color()
    for (let k = 0; k < map.length; k++) {
      pos.setY(k, map[k])
      if (debug) {
        // Debug: how much each point changed. Amber = carved away, cyan = deposited.
        const diff = map[k] - original[k]
        // Scaled so a change of 0.25 (1/8 of the height range) shows at full colour
        const t = Math.min(Math.abs(diff) * 4, 1)
        c.copy(NEUTRAL).lerp(diff < 0 ? ERODED : DEPOSITED, t)
      } else {
        const t = (map[k] + 1) / 2
        if (t < 0.5) c.copy(DEEP).lerp(MID, t * 2)
        else c.copy(MID).lerp(HIGH, (t - 0.5) * 2)
      }
      col.setXYZ(k, c.r, c.g, c.b)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    geo.computeVertexNormals() // the surface changed shape, so lighting must too

    // 3. Debug paths: grid cells → world positions on the surface
    const paths = pathsRef.current
    if (paths) {
      const pp = paths.geometry.attributes.position as BufferAttribute
      const cell = size / (n - 1)
      const count = Math.min(path.length / 2, pp.count)
      for (let i = 0; i < count; i++) {
        const gx = path[i * 2]
        const gy = path[i * 2 + 1]
        const h = map[Math.floor(gy) * n + Math.floor(gx)]
        pp.setXYZ(i, -size / 2 + gx * cell, FLOOR_Y + h * depth + 0.08, -size / 2 + gy * cell)
      }
      pp.needsUpdate = true
      paths.geometry.setDrawRange(0, count)
    }

    // 4. Update the counter twice a second (leva re-renders on every set)
    if (clock.elapsedTime - lastStats.current > 0.5) {
      lastStats.current = clock.elapsedTime
      setStats({ flows: `${done.current.toLocaleString()} / ${maxDroplets.toLocaleString()}` })
    }
  })

  return (
    <>
      <directionalLight position={[12, 20, 6]} intensity={1.6} color="#b8c8ff" />
      <ambientLight intensity={0.25} color="#3a5a80" />
      <group ref={groupRef} position={[0, FLOOR_Y, 0]}>
        <mesh ref={meshRef} geometry={geometry}>
          <meshStandardMaterial vertexColors roughness={0.95} />
        </mesh>
      </group>
      {debug && (
        <points ref={pathsRef} geometry={pathGeometry} frustumCulled={false}>
          <pointsMaterial color="#ffffff" size={3} sizeAttenuation={false} transparent opacity={0.8} toneMapped={false} />
        </points>
      )}
    </>
  )
}
