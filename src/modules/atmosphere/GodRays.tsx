import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, Group, Mesh, ShaderMaterial } from 'three'
import { player } from '../../systems/player'
import { useWorld } from '../../store/useWorld'
import { mulberry32 } from '../../lib/random'
import { PALETTE, color } from '../../style/palette'

// ─────────────────────────────────────────────────────────────────────────────
// God rays: soft shafts of moonlight slanting down from the surface.
//
// Real volumetric light (marching rays through the fog) is expensive. The cheap,
// painterly trick: a few long, open cones, drawn additively, whose shader is
// brightest along the middle of the shaft and fades at its edges, along its length
// and with distance, and flickers slowly (the surface waves above).
//
// The shafts live in a box around the player and wrap around it (modulo), like the
// plankton, so you never swim out of them.
// ─────────────────────────────────────────────────────────────────────────────

const COUNT = 9
const BOX = 36 // size of the wrap box around the player (x and z)
const LENGTH = 28
const TILT = 0.22 // radians: the moon is a little off to the side

export function GodRays({ strength = 1 }: { strength?: number }) {
  const groupRef = useRef<Group>(null)
  // Seeded home positions and sizes, so the rays are the same every visit
  const rays = useMemo(() => {
    const rand = mulberry32(7)
    return Array.from({ length: COUNT }, () => ({
      x: (rand() - 0.5) * BOX,
      z: (rand() - 0.5) * BOX,
      width: 0.8 + rand() * 1.8,
      phase: rand() * 10,
    }))
  }, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: { uColor: { value: color(PALETTE.paleAqua) }, uStrength: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying float vAlong;   // 0 at the top of the shaft, 1 at the bottom
          varying float vFacing;  // 1 where the cone faces the camera (its middle), 0 at its edges
          varying float vDist;
          varying float vSeed;
          void main() {
            vAlong = 0.5 - position.y / ${LENGTH.toFixed(1)};
            vec4 world = modelMatrix * vec4(position, 1.0);
            vec3 n = normalize(mat3(modelMatrix) * normal);
            vec3 v = normalize(cameraPosition - world.xyz);
            vFacing = abs(dot(n, v));
            vDist = length(cameraPosition - world.xyz);
            vSeed = modelMatrix[3].x * 0.37 + modelMatrix[3].z * 0.11;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uStrength, uTime;
          varying float vAlong, vFacing, vDist, vSeed;
          void main() {
            // Soft edges: brightest where the shaft faces you. Written as x²·√x (= x^2.5)
            // with a clamp, because pow() of a value that drifts below 0 is undefined on
            // some GPUs and can return NaN, which blacks out the whole frame through bloom.
            float f = clamp(vFacing, 0.0, 1.0);
            if (!(f >= 0.0)) f = 0.0; // NaN guard
            float core = f * f * sqrt(f);
            float fade = smoothstep(0.0, 0.15, vAlong) * (1.0 - smoothstep(0.35, 1.0, vAlong)); // fades in, then out with depth
            float flicker = 0.65 + 0.35 * sin(uTime * 0.7 + vSeed) * sin(uTime * 0.43 + vSeed * 2.1);
            float distFade = exp(-vDist * 0.035);
            float a = core * fade * flicker * distFade * uStrength;
            gl_FragColor = vec4(uColor * a, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return
    const moon = useWorld.getState().moonPhase
    // Shafts are a full-moon thing: almost none at new moon. (All shafts share one
    // material; reach it through the first mesh.)
    const m = (group.children[0] as Mesh | undefined)?.material as ShaderMaterial | undefined
    if (m) {
      m.uniforms.uStrength.value = 0.22 * strength * moon * moon
      m.uniforms.uTime.value = clock.elapsedTime
    }
    // Wrap each shaft into the box centred on the player (same rule as the plankton)
    const wrap = (v: number) => ((((v + BOX / 2) % BOX) + BOX) % BOX) - BOX / 2
    group.children.forEach((child, i) => {
      const r = rays[i]
      child.position.set(
        player.position.x + wrap(r.x - player.position.x),
        player.position.y + LENGTH * 0.25,
        player.position.z + wrap(r.z - player.position.z),
      )
    })
  })

  return (
    <group ref={groupRef}>
      {rays.map((r, i) => (
        // An open cone: narrow at the surface, wider below. Tilted towards the moon.
        <mesh key={i} material={material} rotation={[0, 0, TILT]} frustumCulled={false}>
          <cylinderGeometry args={[r.width * 0.4, r.width, LENGTH, 16, 1, true]} />
        </mesh>
      ))}
    </group>
  )
}
