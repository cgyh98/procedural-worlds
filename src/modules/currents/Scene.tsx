import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import type { ModuleSceneProps } from '../types'
import { createField, type FieldType } from './fields'
import { Plankton } from './Plankton'
import { FieldArrows } from './FieldArrows'

// The simulation clock, shared by everything in this module.
// `t` = simulated time in seconds, `dt` = this frame's simulated step (0 when paused).
export type SimClock = { t: number; dt: number }

export function CurrentsScene({ debug }: ModuleSceneProps) {
  // ── Sliders & dropdown (leva). `hint` = the tooltip. ──
  const current = useControls('Current', {
    type: {
      label: 'field',
      value: 'curl' as FieldType,
      options: { 'Curl noise': 'curl', 'Vortex (whirlpool)': 'vortex', Uniform: 'uniform' } as Record<string, FieldType>,
      hint: 'Which vector field algorithm drives the water. Switch between them to compare.',
    },
    size: {
      value: 5, min: 0.5, max: 12, step: 0.1,
      hint: 'Feature size in world units: how big the swirls are (curl noise) or the whirlpool core radius (vortex).',
    },
    strength: {
      value: 1, min: 0, max: 4, step: 0.05,
      hint: 'How fast the water flows: the length of the arrows.',
    },
    vertical: {
      value: 0.15, min: 0, max: 1, step: 0.01,
      hint: 'How much the water moves up and down. Real ocean currents are mostly horizontal (0). For the vortex, it pulls water down the drain.',
    },
    evolution: {
      value: 0.5, min: 0, max: 3, step: 0.05,
      hint: 'How fast the current pattern itself changes over time (curl noise only). 0 = a frozen pattern.',
    },
    seed: {
      value: 1, min: 1, max: 999, step: 1,
      hint: 'Seed for the random numbers. Same seed = same currents and plankton every time.',
    },
  })

  const plankton = useControls('Plankton', {
    count: {
      value: 8000, min: 500, max: 20000, step: 500,
      hint: 'How many plankton. Each one samples the field every frame on the CPU, so very high counts get slow (the curl field costs ~14 noise samples per plankton).',
    },
    boxSize: {
      label: 'box size',
      value: 16, min: 6, max: 30, step: 1,
      hint: 'The plankton live in this box. Drifting out one side brings them back in the other (modulo wrap), so the water feels endless.',
    },
    pointSize: {
      label: 'point size',
      value: 0.12, min: 0.02, max: 0.4, step: 0.01,
      hint: 'Size of each plankton dot.',
    },
    restGlow: {
      label: 'rest glow',
      value: 0.12, min: 0, max: 1, step: 0.01,
      hint: 'Brightness of calm, undisturbed plankton. Turn it down for a darker ocean where only disturbed water lights up.',
    },
    flowGlow: {
      label: 'flow glow',
      value: 0.6, min: 0, max: 4, step: 0.05,
      hint: 'How much faster-moving water makes plankton glow. Real dinoflagellates flash when the water around them is stirred.',
    },
    recovery: {
      value: 0.8, min: 0.1, max: 6, step: 0.05,
      hint: 'How fast excited plankton fade back to dark after you pass (per second). Low = long glowing trails.',
    },
  })

  const anim = useControls('Animation', {
    playing: { value: true, hint: 'Play / pause the simulation.' },
    timeScale: {
      label: 'time scale',
      value: 1, min: 0, max: 4, step: 0.05,
      hint: 'Simulation speed. 1 = real time.',
    },
    arrows: {
      value: 8, min: 3, max: 16, step: 1,
      hint: 'Debug view: arrows per side of the grid (this number cubed in total).',
    },
  })

  // Rebuild the field function only when one of its parameters changes.
  const field = useMemo(
    () =>
      createField({
        type: current.type,
        size: current.size,
        strength: current.strength,
        vertical: current.vertical,
        evolution: current.evolution,
        seed: current.seed,
      }),
    [current.type, current.size, current.strength, current.vertical, current.evolution, current.seed],
  )

  // Advance the simulation clock. Children read it through the ref.
  // (Their useFrame callbacks run before this one, so they see last frame's
  // values; one frame of lag is invisible.)
  const clock = useRef<SimClock>({ t: 0, dt: 0 })
  useFrame((_, delta) => {
    // Clamp delta: after switching browser tabs the first frame can report a huge
    // delta, which would teleport every plankton.
    const dt = anim.playing ? Math.min(delta, 0.05) * anim.timeScale : 0
    clock.current.dt = dt
    clock.current.t += dt
  })

  return (
    <>
      <Plankton
        field={field}
        clock={clock}
        count={plankton.count}
        boxSize={plankton.boxSize}
        pointSize={plankton.pointSize}
        restGlow={plankton.restGlow}
        flowGlow={plankton.flowGlow}
        recovery={plankton.recovery}
        seed={current.seed}
      />
      {debug && (
        <FieldArrows
          field={field}
          clock={clock}
          boxSize={plankton.boxSize}
          resolution={anim.arrows}
          strength={current.strength}
        />
      )}
    </>
  )
}
