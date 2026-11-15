import { useControls } from 'leva'
import type { ModuleSceneProps } from '../types'
import { CurrentsScene } from '../currents/Scene'
import { Player } from './Player'
import { Jellyfish, type JellyStyle } from './Jellyfish'
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
// creature drawn on top changes. The jellyfish is the default (with a glow or a
// painted-illustration style); the moon child stays as an alternative body.
//
// <Atmosphere> paints the water around the dive (gradient, fog colour, god rays,
// bubbles), driven by the moon phase.
//
// Order matters: Player moves first each frame (it was mounted first), then the
// body and the debug shape read the updated position.
export function DisturbanceScene({ debug }: ModuleSceneProps) {
  const { body, style } = useControls('Player body', {
    body: {
      value: 'jellyfish' as Body,
      options: { Jellyfish: 'jellyfish', 'Moon child': 'moonChild' } as Record<string, Body>,
      hint: 'Which creature you swim as. Movement and the glow rule are identical; only the body differs. Jellyfish: a pulsing bell and trailing tentacles (follow-the-leader chains). Moon child: the procedural skinned character from the painted art direction.',
    },
    style: {
      label: 'jellyfish style',
      value: 'glow' as JellyStyle,
      options: { Glow: 'glow', 'Painted illustration': 'painted' } as Record<string, JellyStyle>,
      hint: 'How the jellyfish is drawn (same body and motion). Glow: additive glowing bell and thin light tentacles. Painted illustration: the moon child\'s art direction: toon-shaded bell (soft steps, blue shadows, peach highlight, cyan rim, caustics) with an ink outline, and ribbon tentacles in the palette.',
      render: (get) => get('Player body.body') === 'jellyfish',
    },
  })
  return (
    <>
      <Atmosphere />
      <CurrentsScene debug={debug} />
      <Player />
      {body === 'moonChild' ? <MoonChild debug={debug} /> : <Jellyfish style={style} />}
      {debug && <WakeDebug />}
    </>
  )
}
