// A small terrain-style color ramp: water -> sand -> grass -> rock -> snow.
const STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [35, 68, 120]],
  [0.35, [65, 120, 190]],
  [0.42, [210, 195, 140]],
  [0.55, [90, 150, 70]],
  [0.75, [110, 100, 90]],
  [0.9, [150, 145, 140]],
  [1.0, [245, 245, 250]],
]

export function heightToColor(t: number): [number, number, number] {
  const v = t < 0 ? 0 : t > 1 ? 1 : t
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i]
    const [t1, c1] = STOPS[i + 1]
    if (v >= t0 && v <= t1) {
      const f = t1 === t0 ? 0 : (v - t0) / (t1 - t0)
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ]
    }
  }
  return STOPS[STOPS.length - 1][1]
}
