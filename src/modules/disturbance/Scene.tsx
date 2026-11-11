import { useControls } from 'leva'
import type { ModuleSceneProps } from '../types'
import { CurrentsScene } from '../currents/Scene'
import { Player } from './Player'
import { Jellyfish } from './Jellyfish'
import { MoonChild } from './MoonChild'
import { WakeDebug } from './WakeDebug'
import { Atmosphere } from '../atmosphere/Atmosphere'

type Body = 'moonChild' | 'jellyfish'

// The core mechanic, "You are the disturbance": the currents scene plus a player.
// Reusing CurrentsScene means the plankton, field and sliders are the same system;
// the new part is the player, which the plankton react to through the shared
// excitation rule.
//
// The player's BODY is swappable: movement and disturbance are the same, only the
// creature drawn on top changes (the moon child is the story's main character; the
// jellyfish was the first body and becomes a species of the world).
//
// <Atmosphere> paints the water around the dive (gradient, fog colour, god rays,
// bubbles), driven by the moon phase.
//
// Order matters: Player moves first each frame (it was mounted first), then the
// body and the debug shape read the updated position.
export function DisturbanceScene({ debug }: ModuleSceneProps) {
  const { body } = useControls('Player body', {
    body: {
      value: 'moonChild' as Body,
      options: { 'Moon child': 'moonChild', Jellyfish: 'jellyfish' } as Record<string, Body>,
      hint: 'Which creature you swim as. Movement and the glow rule are identical; only the body differs. Moon child: a silhouette with a rim shader, a procedural swim cycle and glowing hair chains. Jellyfish: a pulsing bell and trailing tentacles.',
    },
  })
  return (
    <>
      <Atmosphere />
      <CurrentsScene debug={debug} />
      <Player />
      {body === 'moonChild' ? <MoonChild debug={debug} /> : <Jellyfish />}
      {debug && <WakeDebug />}
    </>
  )
}
