import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'

type SamplePointsProps = {
  accepted: number[] // [x, y, z, …] world positions that passed the habitat filter
  rejected: number[] // positions the filter threw away
  spacing: number
  showRings: boolean
}

// Debug / map layer: the raw sample points.
//   amber dots = accepted (kelp grows here)
//   dim red dots = rejected by the habitat filter (too deep, too high, too steep)
//   rings = a circle of radius spacing/2 around each accepted point. With Poisson disk
//   sampling the rings never overlap: that's the "no two points closer than r" rule,
//   made visible. With random sampling they overlap all over the place.
export function SamplePoints({ accepted, rejected, spacing, showRings }: SamplePointsProps) {
  const acceptedGeo = useMemo(() => pointsGeometry(accepted), [accepted])
  const rejectedGeo = useMemo(() => pointsGeometry(rejected), [rejected])
  const ringsGeo = useMemo(() => ringsGeometry(accepted, spacing / 2), [accepted, spacing])

  // Free GPU memory of replaced geometries
  useEffect(() => () => acceptedGeo.dispose(), [acceptedGeo])
  useEffect(() => () => rejectedGeo.dispose(), [rejectedGeo])
  useEffect(() => () => ringsGeo.dispose(), [ringsGeo])

  return (
    <>
      <points geometry={acceptedGeo}>
        {/* sizeAttenuation off: a fixed size in pixels, like map markers */}
        <pointsMaterial color="#ffb347" size={6} sizeAttenuation={false} toneMapped={false} />
      </points>
      <points geometry={rejectedGeo}>
        <pointsMaterial color="#b04848" size={3} sizeAttenuation={false} />
      </points>
      {showRings && (
        <lineSegments geometry={ringsGeo}>
          <lineBasicMaterial color="#ffb347" transparent opacity={0.7} />
        </lineSegments>
      )}
    </>
  )
}

function pointsGeometry(xyz: number[]) {
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(xyz, 3))
  return geo
}

// One flat circle (16 line pieces) per point, lying on the ground.
function ringsGeometry(xyz: number[], radius: number) {
  const SIDES = 16
  const out: number[] = []
  for (let p = 0; p < xyz.length; p += 3) {
    for (let s = 0; s < SIDES; s++) {
      const a0 = (s / SIDES) * Math.PI * 2
      const a1 = ((s + 1) / SIDES) * Math.PI * 2
      out.push(xyz[p] + Math.cos(a0) * radius, xyz[p + 1], xyz[p + 2] + Math.sin(a0) * radius)
      out.push(xyz[p] + Math.cos(a1) * radius, xyz[p + 1], xyz[p + 2] + Math.sin(a1) * radius)
    }
  }
  return pointsGeometry(out)
}
