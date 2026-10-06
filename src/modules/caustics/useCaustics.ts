import { useControls } from 'leva'

export type CausticsMode = 'worley' | 'layered' | 'off'

// The caustics sliders, as a hook so both the Caustics tab and the World use the same ones.
export function useCaustics() {
  return useControls('Caustics', {
    mode: {
      value: 'layered' as CausticsMode,
      options: { 'Layered webs': 'layered', 'Worley web': 'worley', Off: 'off' } as Record<string, CausticsMode>,
      hint: 'Worley web: light on the borders between Worley cells (F2 − F1 ≈ 0). Layered: two webs at different sizes drifting different ways, closer to real caustics. Off: compare with the bare seafloor.',
    },
    size: {
      value: 2.5, min: 0.5, max: 8, step: 0.1,
      hint: 'Size of the light cells in world units.',
    },
    speed: {
      value: 0.6, min: 0, max: 3, step: 0.05,
      hint: 'How fast the web dances (how fast the Worley points drift).',
    },
    intensity: {
      value: 0.7, min: 0, max: 4, step: 0.05,
      hint: 'Brightness of the light web. Above ~1 it starts to bloom. Kept low so moonlight does not wash out the bioluminescence (later: tied to the moon phase).',
    },
    sharpness: {
      value: 6.5, min: 1, max: 12, step: 0.1,
      hint: 'How thin the lines are: the exponent in (1 − (F2 − F1))^sharpness. Higher = thinner, crisper lines.',
    },
    heightBoost: {
      label: 'height boost',
      value: 0.6, min: 0, max: 1, step: 0.01,
      hint: 'How much brighter the caustics are on high ground (closer to the moonlit surface) than in the trenches.',
    },
  })
}

export type CausticsSettings = ReturnType<typeof useCaustics>
