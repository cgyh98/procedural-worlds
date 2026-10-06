import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Group, ShaderMaterial } from 'three'
import { buildTerrainGeometry } from '../seafloor/terrainGeometry'
import { FLOOR_Y, type Seafloor } from '../seafloor/useSeafloor'
import { causticsFragmentShader, causticsVertexShader, createCausticsUniforms } from './causticsShader'
import type { CausticsSettings } from './useCaustics'

// The caustics, drawn as a second copy of the seafloor's shape right on top of it.
// Its shader outputs only light, and AdditiveBlending ADDS that light to whatever
// is already on screen (the terrain), the way real light adds up.
export function CausticsLayer({ seafloor, settings, debug }: { seafloor: Seafloor; settings: CausticsSettings; debug: boolean }) {
  const groupRef = useRef<Group>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const reliefNow = useRef(seafloor.is2D ? 0 : 1)

  const geometry = useMemo(
    () => buildTerrainGeometry(seafloor.heights, seafloor.resolution, seafloor.size),
    [seafloor.heights, seafloor.resolution, seafloor.size],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  // Created once; the values inside are updated every frame below.
  const uniforms = useMemo(() => createCausticsUniforms(), [])

  useFrame(({ clock }, delta) => {
    const group = groupRef.current
    const mat = materialRef.current
    if (!group || !mat) return

    // Follow the terrain's 2D ↔ 3D animation (same easing as Terrain)
    const target = seafloor.is2D ? 0 : 1
    reliefNow.current += (target - reliefNow.current) * (1 - Math.exp(-3 * Math.min(delta, 0.05)))
    const yScale = Math.max(reliefNow.current, 0.001) * seafloor.depth
    group.scale.y = yScale

    // Send this frame's values to the GPU
    const u = mat.uniforms
    u.uTime.value = clock.elapsedTime
    u.uScale.value = settings.size
    u.uSpeed.value = settings.speed
    u.uIntensity.value = settings.intensity
    u.uSharpness.value = settings.sharpness
    u.uHeightBoost.value = settings.heightBoost
    u.uLayered.value = settings.mode === 'layered' ? 1 : 0
    u.uDebug.value = debug ? 1 : 0
    u.uYScale.value = yScale
  })

  if (settings.mode === 'off') return null

  return (
    <group ref={groupRef} position={[0, FLOOR_Y, 0]}>
      {/* renderOrder 1: draw after the terrain, so there's something to add light to */}
      <mesh geometry={geometry} renderOrder={1}>
        <shaderMaterial
          ref={materialRef}
          args={[{ uniforms, vertexShader: causticsVertexShader, fragmentShader: causticsFragmentShader }]}
          fog // ask three.js to feed the fog uniforms
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false} // bright web lines can go above 1, so bloom picks them up
          // Same shape as the terrain: pull it slightly towards the camera so the two
          // surfaces don't flicker against each other (z-fighting).
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  )
}
