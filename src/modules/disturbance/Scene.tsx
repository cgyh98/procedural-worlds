import type { ModuleSceneProps } from '../types'
import { CurrentsScene } from '../currents/Scene'
import { Player } from './Player'

// The core mechanic, "You are the disturbance": the currents scene plus a player.
// Reusing CurrentsScene means the plankton, field and sliders are the same system;
// the only new thing is the player, which the plankton react to through the
// shared excitation rule.
export function DisturbanceScene({ debug }: ModuleSceneProps) {
  return (
    <>
      <CurrentsScene debug={debug} />
      <Player debug={debug} />
    </>
  )
}
