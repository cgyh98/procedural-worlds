// ─────────────────────────────────────────────────────────────────────────────
// Spherical mapping and the map ↔ planet animation (class module 6)
//
// Every point on a sphere has a longitude (angle around, −π…π) and a latitude
// (angle up/down, −π/2…π/2). A 2D map is just those two angles laid out flat:
//   x = lon × R,  y = lat × R        (the "equirectangular" projection)
// so the map is 2πR wide and πR tall.
//
// The wrap animation: imagine the flat map lying on a sphere of radius Rt. If Rt is
// huge, the sphere is so big the map looks flat. Shrink Rt down to R and the map
// curls up until it closes into the planet. With t = R / Rt going from 0 to 1:
//   angles scale by t:  lon·t, lat·t
//   point = centre + (Rt + height) × (cos(lat·t)·sin(lon·t), sin(lat·t), cos(lat·t)·cos(lon·t))
//   centre = (0, 0, R − Rt), so the front of the map stays at z = R the whole time.
// At t = 1 this is exactly the planet; as t → 0 it becomes the flat map at z = R.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanetAngles = { lon: Float32Array; lat: Float32Array }

// Longitude/latitude for every vertex of a triangle soup on the unit sphere.
//
// Two classic problems handled per triangle:
//  - The SEAM: lon jumps from +π to −π. A triangle straddling it would get one corner
//    at the far left of the map and two at the far right, i.e. a sliver stretched
//    across the whole map. Fix: if its corners span more than π, add 2π to the
//    negative ones, so the triangle sits whole just past the right edge.
//  - The POLES: at lat = ±90°, longitude is undefined (every lon is the same point).
//    Fix: give a pole corner the average lon of the triangle's other corners.
export function computeAngles(pos: Float32Array): PlanetAngles {
  const n = pos.length / 3
  const lon = new Float32Array(n)
  const lat = new Float32Array(n)
  for (let t = 0; t < n; t += 3) {
    const pole = [false, false, false]
    for (let k = 0; k < 3; k++) {
      const i = (t + k) * 3
      const y = Math.min(Math.max(pos[i + 1], -1), 1)
      lat[t + k] = Math.asin(y)
      lon[t + k] = Math.atan2(pos[i], pos[i + 2])
      pole[k] = Math.abs(y) > 0.9999
    }
    const others = [0, 1, 2].filter((k) => !pole[k])
    const ls = others.map((k) => lon[t + k])
    if (ls.length && Math.max(...ls) - Math.min(...ls) > Math.PI)
      for (const k of others) if (lon[t + k] < 0) lon[t + k] += 2 * Math.PI
    const avg = others.length ? others.reduce((s, k) => s + lon[t + k], 0) / others.length : 0
    for (let k = 0; k < 3; k++) if (pole[k]) lon[t + k] = avg
  }
  return { lon, lat }
}

// Write vertex positions for wrap amount t (0 = flat map, 1 = planet).
export function writeWrapped(out: Float32Array, a: PlanetAngles, disp: Float32Array, R: number, t: number) {
  const n = a.lon.length
  if (t < 0.001) {
    // Flat map
    for (let i = 0; i < n; i++) {
      out[i * 3] = a.lon[i] * R
      out[i * 3 + 1] = a.lat[i] * R
      out[i * 3 + 2] = R + disp[i]
    }
    return
  }
  const Rt = R / t
  const cz = R - Rt
  for (let i = 0; i < n; i++) {
    const lo = a.lon[i] * t
    const la = a.lat[i] * t
    const r = Rt + disp[i]
    const c = Math.cos(la)
    out[i * 3] = r * c * Math.sin(lo)
    out[i * 3 + 1] = r * Math.sin(la)
    out[i * 3 + 2] = cz + r * c * Math.cos(lo)
  }
}
