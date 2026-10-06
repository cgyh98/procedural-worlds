import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { Vector3 } from 'three'
import { player, type DisturbanceShape } from '../../systems/player'
import { useKeys } from './useKeys'

const TURN_SPEED = 2.2 // radians per second
const CAMERA_DISTANCE = 6 // behind the player
const CAMERA_HEIGHT = 2.5 // above the player: look down at your trail, not along it
const CAMERA_FOLLOW = 4 // how quickly the camera catches up (higher = stiffer)

// Scratch vectors, reused every frame so the loop never allocates.
// Module-level is fine: there is only ever one player.
const forward = new Vector3()
const cameraTarget = new Vector3()

// The player's movement and camera: swims with the keyboard, writes the shared player
// state (systems/player.ts) and drives the camera. It draws nothing itself: the body
// is <Jellyfish>, the debug shape is <WakeDebug>. Mount it BEFORE them, so this frame's
// position is ready when they draw.
//
//   W / S      swim forward / back
//   A / D      turn left / right   (also the arrow keys)
//   E / Q      rise / sink         (Space also rises)
//   Shift      burst: swim harder (more light, but scares creatures later)
export function Player() {
  const controls = useControls('Disturbance', {
    shape: {
      value: 'wake' as DisturbanceShape,
      options: { 'Wake ellipsoid': 'wake', Sphere: 'sphere' } as Record<string, DisturbanceShape>,
      hint: 'The shape of the water you stir. Sphere: same in every direction (only distance matters). Wake: an egg stretched out behind you, longer the faster you swim, like the churned water behind a real swimmer.',
    },
    radius: {
      value: 1, min: 0.3, max: 5, step: 0.05,
      hint: 'Base size r of the disturbance (the Gaussian falloff). Debug shows the shape around you.',
    },
    wake: {
      value: 1, min: 0, max: 3, step: 0.05,
      hint: 'Wake only: how much the zone stretches behind you as you speed up. Behind size = r × (1 + wake × speed/5).',
    },
    width: {
      value: 0.8, min: 0.2, max: 2, step: 0.05,
      hint: 'Wake only: sideways size, as a fraction of r. Lower = a slimmer trail.',
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
    player.shape = controls.shape
    player.radius = controls.radius
    player.strength = controls.strength
    player.wake = controls.wake
    player.width = controls.width
  }, [controls.shape, controls.radius, controls.strength, controls.wake, controls.width])

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

    // ── Follow camera ──
    // Target: behind (opposite of forward) and above the player.
    cameraTarget.copy(player.position).addScaledVector(forward, -CAMERA_DISTANCE)
    cameraTarget.y += CAMERA_HEIGHT
    // Move a fraction of the way there each frame. 1 − e^(−k·dt) is the frame-rate
    // independent version of "close 10% of the gap per frame": a smooth trailing camera.
    camera.position.lerp(cameraTarget, 1 - Math.exp(-CAMERA_FOLLOW * dt))
    camera.lookAt(player.position)
  })

  return null
}
