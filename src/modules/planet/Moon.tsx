import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group, IcosahedronGeometry, Vector3 } from 'three'
import { createPerlin3D } from '../../lib/noise'
import { useWorld } from '../../store/useWorld'
import { SUN_DIR } from './sun'

const ORBIT = 13
const moonDir = new Vector3()

// The moon: a grey cratered ball orbiting the planet. Its PHASE (how much of it looks
// lit from the planet) comes from geometry:
//   full moon = the moon is on the far side of the planet from the sun (opposite)
//   new moon  = between the planet and the sun (same direction)
//   lit fraction = (1 − cos θ) / 2, θ = angle between "towards the sun" and
//   "towards the moon"; cos θ is just their dot product.
// This writes the global `moonPhase` (0 = new, 1 = full) that later systems read
// (glow visibility, tides, migration depth…).
export function Moon({ speed, visible, onPhase }: { speed: number; visible: boolean; onPhase: (phase: number, waxing: boolean) => void }) {
  const groupRef = useRef<Group>(null)
  const angle = useRef(Math.PI * 0.8)
  const lastReport = useRef(0)

  // Surface: an icosphere with craters pushed in where 3D noise is high
  const geometry = useMemo(() => {
    const geo = new IcosahedronGeometry(1.3, 12)
    const noise = createPerlin3D(77)
    const p = geo.attributes.position
    const v = new Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize()
      const n = noise(v.x * 3, v.y * 3, v.z * 3) + 0.5 * noise(v.x * 7, v.y * 7, v.z * 7)
      v.multiplyScalar(1.3 * (1 - 0.04 * Math.max(0, n))) // dents, never bumps
      p.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  useFrame(({ clock }, delta) => {
    const g = groupRef.current
    if (!g) return
    angle.current += Math.min(delta, 0.05) * speed
    // A slightly tilted circular orbit
    g.position.set(Math.cos(angle.current) * ORBIT, Math.sin(angle.current) * ORBIT * 0.18, Math.sin(angle.current) * ORBIT)
    g.rotation.y = -angle.current // keeps the same face towards the planet (tidal locking)

    moonDir.copy(g.position).normalize()
    const phase = (1 - moonDir.dot(SUN_DIR)) / 2
    // Waxing = growing towards full: the moon is moving away from the sun's side
    const waxing = Math.sin(angle.current - Math.atan2(SUN_DIR.z, SUN_DIR.x)) > 0
    if (clock.elapsedTime - lastReport.current > 0.25) {
      lastReport.current = clock.elapsedTime
      useWorld.getState().setMoonPhase(phase)
      onPhase(phase, waxing)
    }
  })

  return (
    <group ref={groupRef} visible={visible}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={new Color('#c9cdd6')} roughness={1} />
      </mesh>
    </group>
  )
}
