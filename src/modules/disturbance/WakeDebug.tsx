import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Quaternion, Vector3 } from 'three'
import { player } from '../../systems/player'
import { wakeStretch } from '../../systems/excitation'

const FORWARD = new Vector3(0, 0, 1)
const dir = new Vector3()
const q = new Quaternion()

// Debug: draws the disturbance zone's actual shape around the player.
//   inner wireframe = the 1σ surface (falloff ≈ 0.6), outer = 3σ (falloff ≈ 0.01, the cutoff)
// Sphere mode: plain spheres of radius r and 3r.
// Wake mode: an egg stretched behind you, approximated by an ellipsoid whose front
// reaches r × 0.7 ahead and whose back reaches r × stretch behind, pointing along
// your velocity. Watch it lengthen as you speed up.
export function WakeDebug() {
  const groupRef = useRef<Group>(null)
  const innerRef = useRef<Group>(null)
  const outerRef = useRef<Group>(null)

  useFrame(() => {
    const g = groupRef.current
    if (!g || !innerRef.current || !outerRef.current) return
    g.position.copy(player.position)
    const r = player.radius
    if (player.shape === 'sphere' || player.speed < 0.05) {
      g.quaternion.identity()
      for (const [ref, k] of [[innerRef, 1], [outerRef, 3]] as const) {
        ref.current!.scale.setScalar(r * k)
        ref.current!.position.set(0, 0, 0)
      }
      return
    }
    // Point the group's +z along the velocity
    dir.copy(player.velocity).divideScalar(player.speed)
    q.setFromUnitVectors(FORWARD, dir)
    g.quaternion.copy(q)
    const ahead = r * 0.7
    const behind = r * wakeStretch()
    const sideR = r * player.width
    for (const [ref, k] of [[innerRef, 1], [outerRef, 3]] as const) {
      // An ellipsoid spanning from −behind to +ahead along z, centred in between
      ref.current!.scale.set(sideR * k, sideR * k, ((ahead + behind) / 2) * k)
      ref.current!.position.set(0, 0, ((ahead - behind) / 2) * k)
    }
  })

  return (
    <group ref={groupRef}>
      <group ref={innerRef}>
        <mesh>
          <sphereGeometry args={[1, 16, 10]} />
          <meshBasicMaterial color="#ffb347" wireframe transparent opacity={0.22} />
        </mesh>
      </group>
      <group ref={outerRef}>
        <mesh>
          <sphereGeometry args={[1, 16, 10]} />
          <meshBasicMaterial color="#ffb347" wireframe transparent opacity={0.06} />
        </mesh>
      </group>
    </group>
  )
}
