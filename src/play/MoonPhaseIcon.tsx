// A moon phase drawn as an SVG path (waxing: lit from the right, as seen from the
// northern hemisphere).
//
// How a phase is drawn: the lit part is bounded by
//   1. the moon's right half-circle (the edge that faces the sun), and
//   2. the TERMINATOR, the line between day and night. Seen from Earth it's half of
//      an ellipse whose width depends on how much is lit:
//          rx = r × |2·lit − 1|
//      lit = 0.5 (half moon): rx = 0, a straight line.
//      lit < 0.5 (crescent):  the ellipse bulges right, eating into the lit half.
//      lit > 0.5 (gibbous):   it bulges left, adding to the lit half.
//      lit = 1 (full):        rx = r, the left half-circle → a full disk.
//
// lit: illuminated fraction 0…1. awake: this reef has been woken (the phase glows).

const R = 9
const C = 10 // centre of the 20 × 20 viewBox

export function MoonPhaseIcon({ lit, awake }: { lit: number; awake: boolean }) {
  const rx = R * Math.abs(2 * lit - 1)
  // From the top, down the right edge (clockwise), then back up along the terminator:
  // through the right side for a crescent (sweep 0), through the left for gibbous (sweep 1).
  const sweep = lit > 0.5 ? 1 : 0
  const d = `M ${C} ${C - R} A ${R} ${R} 0 0 1 ${C} ${C + R} A ${rx} ${R} 0 0 ${sweep} ${C} ${C - R} Z`
  return (
    <svg className={awake ? 'moon-icon awake' : 'moon-icon'} viewBox="0 0 20 20" aria-hidden>
      <circle className="disk" cx={C} cy={C} r={R} />
      <path className="lit" d={d} />
    </svg>
  )
}
