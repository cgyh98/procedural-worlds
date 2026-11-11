import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PointLight } from 'three'
import { player } from '../../systems/player'
import { night } from '../../systems/night'
import { PALETTE } from '../../style/palette'

// ─────────────────────────────────────────────────────────────────────────────
// The child's own light (line of sight in its simplest form, module 25)
//
// On a dark night nothing is lit, so you can only see what is NEAR you. One point
// light travels with the moon child and lights the seafloor around her:
//
//   reach     = 4 + 5 × swim     (swim = speed as 0…1: faster → you see further)
//   intensity = strength × (1 − night.light) × (0.5 + 0.5 × swim)
//
// (1 − night.light): her light only matters in the dark. As the moon rises and the
// world gets its own light, hers fades out, so it never looks doubled.
//
// Only ONE light for the player, never one per creature (the glowing creatures use
// emissive colours + bloom instead, which is far cheaper). It only affects lit
// materials (the terrain); plankton and kelp react through the excitation rule.
// ─────────────────────────────────────────────────────────────────────────────

const TOP_SPEED = 5 // speed that counts as "swimming flat out"

export function RevealLight({ strength = 1 }: { strength?: number }) {
  const lightRef = useRef<PointLight>(null)
  const swim = useRef(0) // smoothed, so the light breathes instead of flickering

  useFrame((_, delta) => {
    const light = lightRef.current
    if (!light) return
    const dt = Math.min(delta, 0.05)
    const target = Math.min(player.speed / TOP_SPEED, 1)
    swim.current += (target - swim.current) * (1 - Math.exp(-3 * dt))
    const s = swim.current

    light.position.copy(player.position)
    light.position.y += 0.4 // from her chest, so the ground under her catches it
    light.distance = 4 + 5 * s
    light.intensity = strength * 6 * (1 - night.light) * (0.5 + 0.5 * s)
  })

  // decay 1: a gentler falloff than the physical 2, so the lit pool has soft edges
  return <pointLight ref={lightRef} color={PALETTE.cyan} decay={1} distance={4} intensity={0} />
}
