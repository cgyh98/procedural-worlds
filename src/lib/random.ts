// Seeded pseudo-random numbers.
//
// Math.random() gives different numbers every time you reload, so the world would
// never look the same twice. A *seeded* generator always produces the same sequence
// for the same seed, so worlds are reproducible ("seed 42" always looks like seed 42).
//
// mulberry32 is a tiny, fast generator: it keeps one 32-bit number of state and
// scrambles it with multiplications and bit shifts on every call.
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 // → a float in [0, 1)
  }
}
