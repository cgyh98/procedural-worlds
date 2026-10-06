import type { ModuleSceneProps } from '../types'
import { CurrentsScene } from '../currents/Scene'
import { Player } from './Player'
import { Jellyfish } from './Jellyfish'
import { WakeDebug } from './WakeDebug'

// The core mechanic, "You are the disturbance": the currents scene plus a player.
// Reusing CurrentsScene means the plankton, field and sliders are the same system;
// the new part is the player, which the plankton react to through the shared
// excitation rule.
//
// Order matters: Player moves first each frame (it was mounted first), then the
// jellyfish body and the debug shape read the updated position.
export function DisturbanceScene({ debug }: ModuleSceneProps) {
  return (
    <>
      <CurrentsScene debug={debug} />
      <Player />
      <Jellyfish />
      {debug && <WakeDebug />}
    </>
  )
}
