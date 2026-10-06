import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { Color, Group, Vector3 } from 'three'
import { player } from '../../systems/player'
import { useKeys } from './useKeys'

// Placeholder form: a small glowing orb (creature vs. diver is still undecided).
// Colour above 1 + toneMapped={false} → bloom gives it a halo.
const BODY = new Color(1.6, 2.2, 2.4)

const TURN_SPEED = 2.2 // radians per second
const CAMERA_DISTANCE = 6 // behind the player
const CAMERA_HEIGHT = 2.5 // above the player: look down at your trail, not along it
const CAMERA_FOLLOW = 4 // how quickly the camera catches up (higher = stiffer)

// Scratch vectors, reused every frame so the loop never allocates.
// Module-level is fine: there is only ever one player.
const forward = new Vector3()
const cameraTarget = new Vector3()

// The player: swims with the keyboard, disturbs the water, and drives the camera.
//
//   W / S      swim forward / back
//   A / D      turn left / right   (also the arrow keys)
//   E / Q      rise / sink         (Space also rises)
//   Shift      burst: swim harder (more light, but scares creatures later)
export function Player({ debug }: { debug: boolean }) {
  const controls = useControls('Disturbance', {
    radius: {
      value: 1, min: 0.3, max: 5, step: 0.05,
      hint: 'How far your disturbance reaches (r in the Gaussian falloff e^(−d²/2r²)). Debug shows it as a sphere.',
    },
    strength: {
      value: 0.6, min: 0, max: 2, step: 0.01,
      hint: 'How strongly nearby plankton get excited when you pass. A plankton right in your path collects about strength × radius × 2.5 in total.',
    },
    swimForce: {
      label: 'swim force',
      value: 10, min: 1, max: 30, step: 0.5,
      hint: 'How hard you push through the water (acceleration).',
    },
    drag: {
      label: 'water drag',
      value: 2.5, min: 0.2, max: 8, step: 0.1,
      hint: 'How quickly the water slows you down. Top speed ≈ swim force ÷ drag.',
    },
    burst: {
      value: 2.5, min: 1, max: 5, step: 0.1,
      hint: 'Swim force multiplier while holding Shift. Faster = bigger burst of light.',
    },
  })

  const keys = useKeys()
  const groupRef = useRef<Group>(null)
  const yaw = useRef(0) // heading angle around the vertical axis

  // Register as the active player while this component is mounted.
  useEffect(() => {
    player.active = true
    player.position.set(0, 0, 0)
    player.velocity.set(0, 0, 0)
    return () => {
      player.active = false
    }
  }, [])

  // Copy the slider values into the shared state that other systems read.
  useEffect(() => {
    player.radius = controls.radius
    player.strength = controls.strength
  }, [controls.radius, controls.strength])

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05)
    const k = keys.current
    const pressed = (...codes: string[]) => (codes.some((c) => k.has(c)) ? 1 : 0)

    // ── Steering ──
    const turn = pressed('KeyA', 'ArrowLeft') - pressed('KeyD', 'ArrowRight')
    yaw.current += turn * TURN_SPEED * dt
    // yaw = 0 faces −z (three.js "forward"); rotating by yaw around y:
    forward.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))

    // ── Swimming: push → velocity, drag → slow down ──
    const thrust = pressed('KeyW', 'ArrowUp') - pressed('KeyS', 'ArrowDown')
    const lift = pressed('KeyE', 'Space') - pressed('KeyQ')
    const force = controls.swimForce * (pressed('ShiftLeft', 'ShiftRight') ? controls.burst : 1)

    player.velocity.addScaledVector(forward, thrust * force * dt)
    player.velocity.y += lift * force * dt
    // Water drag as exponential decay: frame-rate independent, and it creates a
    // natural top speed where push and drag balance (≈ force / drag).
    player.velocity.multiplyScalar(Math.exp(-controls.drag * dt))

    player.position.addScaledVector(player.velocity, dt)
    player.speed = player.velocity.length()

    const group = groupRef.current
    if (group) {
      group.position.copy(player.position)
      group.rotation.y = yaw.current
    }

    // ── Follow camera ──
    // Target: behind (opposite of forward) and above the player.
    cameraTarget.copy(player.position).addScaledVector(forward, -CAMERA_DISTANCE)
    cameraTarget.y += CAMERA_HEIGHT
    // Move a fraction of the way there each frame. 1 − e^(−k·dt) is the frame-rate
    // independent version of "close 10% of the gap per frame": a smooth trailing camera.
    camera.position.lerp(cameraTarget, 1 - Math.exp(-CAMERA_FOLLOW * dt))
    camera.lookAt(player.position)
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.12, 24, 16]} />
        <meshBasicMaterial color={BODY} toneMapped={false} />
      </mesh>

      {/* Debug: the disturbance radius r (inner) and the 3r cutoff (outer) */}
      {debug && (
        <>
          <mesh scale={controls.radius}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshBasicMaterial color="#ffb347" wireframe transparent opacity={0.18} />
          </mesh>
          <mesh scale={controls.radius * 3}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshBasicMaterial color="#ffb347" wireframe transparent opacity={0.05} />
          </mesh>
        </>
      )}
    </group>
  )
}
