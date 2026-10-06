import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { AdditiveBlending, BoxGeometry, BufferGeometry, Color, Float32BufferAttribute } from 'three'
import type { ModuleSceneProps } from '../types'
import { createGlowTexture } from '../../lib/glowTexture'
import { generateVoxels, voxelIndex, type VoxelShape } from './voxelGrid'
import { buildVoxelMesh, hash3 } from './voxelMesh'

const WIDTH = 24 // world units across (x and z), whatever the resolution
const BASE_Y = -6 // bottom of the voxel box
const CAVE_GLOW = new Color(0.4, 2.2, 1.3) // sea-green life hiding in the caves

export function VoxelScene({ debug }: ModuleSceneProps) {
  const reef = useControls('Voxel reef', {
    shape: {
      value: 'seabed' as VoxelShape,
      options: { 'Seabed + caves': 'seabed', '3D noise caves': 'caves', Spheres: 'spheres' } as Record<string, VoxelShape>,
      hint: 'The density function that decides rock vs. water for every voxel. Seabed: solid ground minus 3D noise (caves, arches, overhangs). 3D noise: floating Swiss-cheese reef. Spheres: the simplest rule, rock inside a few balls.',
    },
    resolution: {
      value: 48, min: 16, max: 64, step: 8,
      hint: 'Voxels along x and z (y gets half). The box stays the same size, so more voxels = smaller cubes. Cost grows with the cube of this.',
    },
    scale: {
      value: 9, min: 2, max: 24, step: 0.5,
      hint: 'Size of the noise features, in voxels: how big the caves and rock chunks are.',
    },
    threshold: {
      value: 0, min: -0.6, max: 0.6, step: 0.01,
      hint: 'A voxel is rock where its density is above this. Raise it for more water (bigger caves), lower it for more rock.',
    },
    ground: {
      value: 0.4, min: 0, max: 1, step: 0.01,
      hint: 'Seabed shape only: height of the ground surface, from the bottom (0) to the top (1) of the box.',
    },
    seed: { value: 4, min: 1, max: 999, step: 1, hint: 'Seed for the noise and spheres.' },
  })

  // The build animation. The button bumps `buildRequest`; an effect then sets
  // buildStart to −1 ("start on the next frame"), and useFrame takes it from there.
  const buildStart = useRef<number | null>(null)
  const [buildRequest, setBuildRequest] = useState(0)
  const [buildLayer, setBuildLayer] = useState<number | null>(null) // null = fully built
  useEffect(() => {
    if (buildRequest > 0) buildStart.current = -1
  }, [buildRequest])

  const view = useControls('Voxel view', {
    'build animation': button(() => setBuildRequest((n) => n + 1)),
    buildSpeed: {
      label: 'build speed',
      value: 8, min: 1, max: 30, step: 1,
      hint: 'Layers per second for the build animation, which fills the voxel grid from the bottom up.',
    },
    slice: {
      value: 1, min: 0.05, max: 1, step: 0.01,
      hint: 'Cut the reef open: layers above this fraction are hidden, so you can see inside the caves.',
    },
    caveGlow: {
      label: 'cave glow',
      value: 0.04, min: 0, max: 0.2, step: 0.005,
      hint: 'Chance that a sheltered water voxel (rock somewhere above it) holds glowing life.',
    },
  })

  const grid = useMemo(
    () => generateVoxels({ shape: reef.shape, n: reef.resolution, scale: reef.scale, threshold: reef.threshold, ground: reef.ground, seed: reef.seed }),
    [reef.shape, reef.resolution, reef.scale, reef.threshold, reef.ground, reef.seed],
  )
  const voxelSize = WIDTH / grid.nx

  // Advance the build animation: one more layer every 1/buildSpeed seconds.
  useFrame(({ clock }) => {
    if (buildStart.current === null) return
    if (buildStart.current < 0) buildStart.current = clock.elapsedTime
    const layer = Math.floor((clock.elapsedTime - buildStart.current) * view.buildSpeed)
    if (layer >= grid.ny) {
      buildStart.current = null
      setBuildLayer(null)
    } else if (layer !== buildLayer) {
      setBuildLayer(layer) // a re-render only when a new layer appears (≈ ny times)
    }
  })

  const visibleLayers = buildLayer ?? grid.ny
  const sliceLayer = Math.max(1, Math.round(view.slice * grid.ny))
  const maxY = Math.min(visibleLayers, sliceLayer)

  const { geometry, stats } = useMemo(
    () => buildVoxelMesh(grid, voxelSize, visibleLayers, sliceLayer),
    [grid, voxelSize, visibleLayers, sliceLayer],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  // Live counts, as read-only fields in the panel: how much the "only visible faces"
  // rule saves. (Function form of useControls returns a `set` to update them.)
  const [, setStats] = useControls('Voxel stats', () => ({
    voxels: { value: '', editable: false, hint: 'Grid size and how many voxels are rock.' },
    faces: { value: '', editable: false, hint: 'Faces drawn vs. faces skipped because they touch other rock (buried, never visible).' },
  }))
  useEffect(() => {
    const total = grid.nx * grid.ny * grid.nz
    const pct = stats.rock ? Math.round((100 * stats.skipped) / (stats.rock * 6)) : 0
    setStats({
      voxels: `${grid.nx}×${grid.ny}×${grid.nz} = ${total.toLocaleString()} · rock ${stats.rock.toLocaleString()}`,
      faces: `drawn ${stats.drawn.toLocaleString()} · skipped ${stats.skipped.toLocaleString()} (${pct}%)`,
    })
  }, [grid, stats, setStats])

  // Glowing life in sheltered water: water voxels with rock somewhere above them.
  // Scan each column from the top down, remembering whether we've passed rock yet.
  const glow = useMemo(() => {
    const pts: number[] = []
    for (let z = 0; z < grid.nz; z++)
      for (let x = 0; x < grid.nx; x++) {
        let sheltered = false
        for (let y = grid.ny - 1; y >= 0; y--) {
          if (grid.solid[voxelIndex(grid, x, y, z)]) sheltered = true
          else if (sheltered && y < maxY && hash3(x, y, z) < view.caveGlow)
            pts.push((x + 0.5 - grid.nx / 2) * voxelSize, (y + 0.5) * voxelSize, (z + 0.5 - grid.nz / 2) * voxelSize)
        }
      }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(pts, 3))
    return geo
  }, [grid, voxelSize, maxY, view.caveGlow])
  useEffect(() => () => glow.dispose(), [glow])

  const texture = useMemo(() => createGlowTexture(), [])
  const box = useMemo(() => new BoxGeometry(WIDTH, grid.ny * voxelSize, WIDTH), [grid.ny, voxelSize])
  const boxHeight = grid.ny * voxelSize

  return (
    <>
      <directionalLight position={[12, 20, 6]} intensity={1.6} color="#b8c8ff" />
      <ambientLight intensity={0.3} color="#3a5a80" />

      <group position={[0, BASE_Y, 0]}>
        <mesh geometry={geometry}>
          <meshStandardMaterial vertexColors roughness={0.9} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        </mesh>

        <points geometry={glow}>
          <pointsMaterial map={texture} color={CAVE_GLOW} size={0.5} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </points>

        {debug && (
          <>
            {/* Voxel edges: every drawn face outlined, so the cubes and the skipped faces are visible */}
            <mesh geometry={geometry}>
              <meshBasicMaterial color="#ffb347" wireframe transparent opacity={0.15} />
            </mesh>
            {/* The voxel grid's bounding box */}
            <lineSegments position={[0, boxHeight / 2, 0]}>
              <edgesGeometry args={[box]} />
              <lineBasicMaterial color="#ffb347" transparent opacity={0.5} />
            </lineSegments>
          </>
        )}
      </group>
    </>
  )
}
