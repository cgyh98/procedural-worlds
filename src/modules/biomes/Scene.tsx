import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, PointsMaterial } from 'three'
import type { ModuleSceneProps } from '../types'
import { useSeafloor, FLOOR_Y } from '../seafloor/useSeafloor'
import { Terrain } from '../seafloor/Terrain'
import { createGlowTexture } from '../../lib/glowTexture'
import { classify, HABITATS, ZONES, type Classifier } from './classify'
import { floodFromEdges, labelComponents, type Connectivity } from './floodFill'
import { hash3 } from '../voxels/voxelMesh'

const BAY = new Color('#7ff0c0') // enclosed water: where the bioluminescent bays glow
const UNFLOODED = new Color('#05070d') // during the flood animation: water not reached yet
const FRONTIER = new Color('#e6f4ff') // the flood's advancing edge
const BAY_GLOW = new Color(0.4, 2.2, 1.3)

export function BiomesScene({ debug }: ModuleSceneProps) {
  const seafloor = useSeafloor()
  const { heights, resolution: n, size, depth, sampler, is2D } = seafloor

  const bio = useControls('Biomes', {
    classifier: {
      value: 'habitats' as Classifier,
      options: { 'Habitats (depth + slope + vents)': 'habitats', 'Depth zones': 'zones' } as Record<string, Classifier>,
      hint: 'How each cell gets its biome. Depth zones: thresholds on depth only (sunlit, twilight, midnight, abyss, hadal). Habitats: depth + slope + a Worley vent field (reef, kelp forest, cliff, slope, abyssal plain, vent field).',
    },
  })

  const [floodRequest, setFloodRequest] = useState(0)
  const tide = useControls('Tide & flood fill', {
    level: {
      label: 'tide level',
      value: -0.2, min: -1, max: 1, step: 0.01,
      hint: 'The water surface (−1 = deepest point, 1 = highest ridge). Ground above it becomes islands. The moon drives the tide: lower it and bays close off from the ocean.',
    },
    connectivity: {
      value: 4 as Connectivity,
      options: { '4 neighbours': 4, '8 neighbours (diagonals)': 8 } as Record<string, Connectivity>,
      hint: 'Which neighbours the flood can spread to. With 8, water leaks diagonally between two land cells, so fewer bays stay enclosed.',
    },
    'animate flood': button(() => setFloodRequest((r) => r + 1)),
    floodSeconds: {
      label: 'flood duration',
      value: 4, min: 1, max: 12, step: 0.5,
      hint: 'How long the flood animation takes to spread from the map edges across all reachable water.',
    },
  })

  // 1. Biome per cell
  const biomes = useMemo(() => classify(bio.classifier, heights, n, size, sampler, 3), [bio.classifier, heights, n, size, sampler])
  const palette = bio.classifier === 'zones' ? ZONES : HABITATS

  // 2. Water = below the tide. Flood from the map edges through water = open ocean.
  //    Water the flood never reaches is enclosed: a bay.
  const flood = useMemo(
    () => floodFromEdges(n, (k) => heights[k] < tide.level, tide.connectivity),
    [n, heights, tide.level, tide.connectivity],
  )

  // 3. Counting things with connected-component labeling (flood fill from every cell)
  const counts = useMemo(() => {
    const kind = (k: number) => (heights[k] >= tide.level ? 0 : flood.order[k] < 0 ? 1 : 2) // land / bay / ocean
    const geo = labelComponents(n, kind, tide.connectivity)
    const kindOf = new Map<number, number>()
    for (let k = 0; k < n * n; k++) kindOf.set(geo.labels[k], kind(k))
    let islands = 0
    let bays = 0
    for (const v of kindOf.values()) {
      if (v === 0) islands++
      else if (v === 1) bays++
    }
    const regions = labelComponents(n, (k) => biomes[k], tide.connectivity)
    const perBiome = new Array(palette.length).fill(0)
    const seen = new Set<number>()
    for (let k = 0; k < n * n; k++)
      if (!seen.has(regions.labels[k])) {
        seen.add(regions.labels[k])
        perBiome[biomes[k]]++
      }
    return { islands, bays, regions, perBiome }
  }, [n, heights, tide.level, tide.connectivity, flood, biomes, palette.length])

  const [, setStats] = useControls('Biome stats', () => ({
    water: { value: '—', editable: false, hint: 'Islands and enclosed bays at the current tide (counted by flood-fill labeling).' },
    regions: { value: '—', editable: false, hint: 'How many separate connected patches of each biome there are.' },
  }))
  useEffect(() => {
    setStats({
      water: `${counts.islands} islands · ${counts.bays} bays`,
      regions: palette.map((b, i) => `${b.name} ${counts.perBiome[i]}`).join(' · '),
    })
  }, [counts, palette, setStats])

  // 4. Flood animation: reveal cells in the order the flood reached them
  const [shown, setShown] = useState<number | null>(null) // null = no animation running
  const animStart = useRef<number | null>(null)
  useEffect(() => {
    if (floodRequest > 0) animStart.current = -1
  }, [floodRequest])
  const lastSet = useRef(0)
  useFrame(({ clock }) => {
    if (animStart.current === null) return
    if (animStart.current < 0) animStart.current = clock.elapsedTime
    const f = (clock.elapsedTime - animStart.current) / tide.floodSeconds
    if (f >= 1) {
      animStart.current = null
      setShown(null)
    } else if (clock.elapsedTime - lastSet.current > 0.08) {
      lastSet.current = clock.elapsedTime
      setShown(Math.floor(f * flood.reached))
    }
  })

  // 5. Colours per vertex
  const colors = useMemo(() => {
    const out = new Float32Array(n * n * 3)
    const c = new Color()
    const frontierWidth = Math.max(1, Math.floor(flood.reached / 60))
    for (let k = 0; k < n * n; k++) {
      if (debug) {
        // Debug: every connected biome region in its own colour. Hue steps by the golden
        // ratio (0.618… of a turn) per label, so consecutive labels never look alike.
        const label = counts.regions.labels[k]
        c.setHSL((label * 0.618034) % 1, 0.75, 0.55)
      } else {
        c.copy(palette[biomes[k]].color)
        if (heights[k] < tide.level && flood.order[k] < 0) c.copy(BAY) // enclosed water: a bay
        if (shown !== null && flood.order[k] >= 0) {
          if (flood.order[k] >= shown) c.copy(UNFLOODED)
          else if (flood.order[k] >= shown - frontierWidth) c.copy(FRONTIER)
        }
      }
      out[k * 3] = c.r
      out[k * 3 + 1] = c.g
      out[k * 3 + 2] = c.b
    }
    return out
  }, [n, debug, counts, palette, biomes, flood, shown, heights, tide.level])

  // 6. Bioluminescent bays: sparkles over the enclosed water
  const sparkles = useMemo(() => {
    const pts: number[] = []
    const cell = size / (n - 1)
    const y = FLOOR_Y + tide.level * depth + 0.05
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i
        if (heights[k] < tide.level && flood.order[k] < 0 && hash3(i, j, 5) < 0.35)
          pts.push(-size / 2 + i * cell, y, -size / 2 + j * cell)
      }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(pts, 3))
    return geo
  }, [n, size, depth, heights, tide.level, flood])
  useEffect(() => () => sparkles.dispose(), [sparkles])

  const texture = useMemo(() => createGlowTexture(), [])
  const sparkleMat = useRef<PointsMaterial>(null)
  useFrame(({ clock }) => {
    if (sparkleMat.current) sparkleMat.current.opacity = 0.65 + 0.35 * Math.sin(clock.elapsedTime * 2.2) // a gentle pulse
  })

  const waterY = FLOOR_Y + tide.level * depth

  return (
    <>
      <directionalLight position={[12, 20, 6]} intensity={1.6} color="#b8c8ff" />
      <ambientLight intensity={0.35} color="#3a5a80" />
      <Terrain heights={heights} resolution={n} size={size} depth={depth} relief={is2D ? 0 : 1} debug={false} colors={colors} />
      {!is2D && (
        <>
          {/* The sea surface at the tide level: a translucent sheet; islands poke through it.
              Hidden while the flood animates and in debug, so the colours underneath read clearly. */}
          <mesh position={[0, waterY, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={!debug && shown === null}>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial color="#2a6fb8" emissive="#0b2a5c" transparent opacity={0.62} depthWrite={false} roughness={0.15} metalness={0.1} />
          </mesh>
          <points geometry={sparkles}>
            <pointsMaterial
              ref={sparkleMat}
              map={texture}
              color={BAY_GLOW}
              size={0.6}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
              toneMapped={false}
            />
          </points>
        </>
      )}
    </>
  )
}
