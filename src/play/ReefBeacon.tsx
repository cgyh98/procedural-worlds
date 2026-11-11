import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, Mesh, ShaderMaterial } from 'three'
import { player } from '../systems/player'
import { reefs } from '../systems/reefs'

// ─────────────────────────────────────────────────────────────────────────────
// Reef beacon: a glowing hint instead of on-screen text
//
// In the dark, the sleeping reefs are hard to find. A faint column of light rises
// from the NEAREST sleeping reef (systems/reefs.ts finds it each frame), like
// moonlight reaching down to it. It ignores the fog (fog: false), so you can see it
// from across the map, and it fades out as you arrive (the reef takes over).
// When that reef wakes, the beacon moves on to the next nearest one.
//
// Shader: brightest at the base, fading upwards; soft edges where the cylinder
// turns away from the camera (the same facing trick as the god rays).
// ─────────────────────────────────────────────────────────────────────────────

const HEIGHT = 16
const COLOR = new Color(0.45, 2.0, 1.4) // reef sea-green, above 1 so it blooms softly

export function ReefBeacon({ visibleAfter }: { visibleAfter: RefObject<number> }) {
  const meshRef = useRef<Mesh>(null)
  const fade = useRef(0)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        fog: false,
        uniforms: { uColor: { value: COLOR }, uOpacity: { value: 0 } },
        vertexShader: /* glsl */ `
          varying float vH;
          varying float vFacing;
          void main() {
            vH = uv.y; // 0 at the base, 1 at the top
            vec3 n = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vFacing = abs(dot(n, normalize(-mv.xyz))); // 1 = facing the camera
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vH;
          varying float vFacing;
          void main() {
            float up = pow(1.0 - vH, 1.6);        // fades towards the top
            float core = pow(vFacing, 3.0);       // soft edges: only the centre line glows
            gl_FragColor = vec4(uColor * up * core * uOpacity, 1.0);
          }
        `,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const dt = Math.min(delta, 0.05)
    const { x, y, z } = reefs.nearest
    const dist = Math.hypot(player.position.x - x, player.position.z - z)
    // Visible once you've started swimming, while a reef is still asleep, and not
    // when you're already on top of it
    const show = (visibleAfter.current ?? 0) > 0 && reefs.hasNearest ? Math.min(Math.max((dist - 3) / 4, 0), 1) : 0
    fade.current += (show - fade.current) * (1 - Math.exp(-2 * dt))
    mesh.position.set(x, y + HEIGHT / 2, z)
    mesh.visible = fade.current > 0.01
    const pulse = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 1.6)
    ;(mesh.material as ShaderMaterial).uniforms.uOpacity.value = 0.16 * fade.current * pulse
  })

  return (
    <mesh ref={meshRef} material={material} renderOrder={2} frustumCulled={false}>
      <cylinderGeometry args={[0.2, 0.45, HEIGHT, 16, 1, true]} />
    </mesh>
  )
}
