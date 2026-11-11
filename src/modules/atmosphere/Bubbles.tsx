import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, CanvasTexture, Float32BufferAttribute, Points, ShaderMaterial } from 'three'
import { player } from '../../systems/player'
import { mulberry32 } from '../../lib/random'

// ─────────────────────────────────────────────────────────────────────────────
// Bubbles: rising spheres the hero stirs up as they swim.
//
// A fixed POOL of bubbles is recycled: when one pops (reaches its lifetime), it's
// reused for the next one that's spawned. No allocation while playing.
//
//   spawn:  near the hero, more per second the faster you swim (+ a few while still)
//   rise:   buoyancy pushes them up; big bubbles rise faster than small ones
//   wobble: a small sideways sine, so they don't rise in straight lines
//
// The look (from the art direction): a translucent outline with a small white
// highlight and a tiny warm-orange reflection on one side, painted once on a canvas.
// ─────────────────────────────────────────────────────────────────────────────

const POOL = 240

function createBubbleTexture() {
  const s = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = s
  const ctx = canvas.getContext('2d')!
  const c = s / 2
  const r = s * 0.42
  // Faint inner fill and a pale outline
  ctx.fillStyle = 'rgba(191, 238, 247, 0.10)'
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(220, 245, 255, 0.85)'
  ctx.lineWidth = s * 0.045
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke()
  // White highlight, top-left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.beginPath(); ctx.ellipse(c - r * 0.42, c - r * 0.45, r * 0.18, r * 0.11, -0.7, 0, Math.PI * 2); ctx.fill()
  // Tiny warm reflection, lower right
  ctx.strokeStyle = 'rgba(242, 164, 120, 0.9)'
  ctx.lineWidth = s * 0.05
  ctx.beginPath(); ctx.arc(c, c, r * 0.8, 0.15 * Math.PI, 0.38 * Math.PI); ctx.stroke()
  return new CanvasTexture(canvas)
}

export function Bubbles({ amount = 1 }: { amount?: number }) {
  const pointsRef = useRef<Points>(null)
  // Per-bubble state in a ref (per-frame data never goes in React state)
  const state = useRef({
    vel: new Float32Array(POOL), // rise speed
    age: new Float32Array(POOL).fill(1e9), // seconds since spawn (huge = dead)
    life: new Float32Array(POOL),
    phase: new Float32Array(POOL),
    next: 0, // next pool slot to reuse
    debt: 0, // fractional bubbles owed (spawn rate × dt rarely gives whole numbers)
    rand: mulberry32(11),
  })

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(POOL * 3), 3))
    geo.setAttribute('aSize', new Float32BufferAttribute(new Float32Array(POOL), 1))
    return geo
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useMemo(() => {
    const tex = createBubbleTexture()
    return new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uMap: { value: tex } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // Perspective size: world size → pixels (bigger when close)
          gl_PointSize = aSize * 600.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        void main() {
          vec4 c = texture2D(uMap, gl_PointCoord);
          if (c.a < 0.02) discard;
          gl_FragColor = c;
          #include <colorspace_fragment>
        }
      `,
    })
  }, [])
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }, delta) => {
    const points = pointsRef.current
    if (!points) return
    const dt = Math.min(delta, 0.05)
    const S = state.current
    const pos = (points.geometry.attributes.position as BufferAttribute).array as Float32Array
    const size = (points.geometry.attributes.aSize as BufferAttribute).array as Float32Array

    // Spawn: a trickle while still, many more when swimming fast
    S.debt += (0.8 + player.speed * 6) * amount * dt
    while (S.debt >= 1) {
      S.debt -= 1
      const i = S.next
      S.next = (S.next + 1) % POOL
      const r = S.rand
      const big = r() ** 3 // mostly small, a few big ones
      pos[i * 3] = player.position.x + (r() - 0.5) * 0.4
      pos[i * 3 + 1] = player.position.y + (r() - 0.2) * 0.5
      pos[i * 3 + 2] = player.position.z + (r() - 0.5) * 0.4
      size[i] = 0.03 + big * 0.12
      S.vel[i] = 0.4 + size[i] * 6 // bigger bubbles rise faster
      S.age[i] = 0
      S.life[i] = 3 + r() * 4
      S.phase[i] = r() * 10
    }

    // Rise, wobble, pop
    const t = clock.elapsedTime
    for (let i = 0; i < POOL; i++) {
      S.age[i] += dt
      if (S.age[i] > S.life[i]) {
        size[i] = 0 // popped: invisible until reused
        continue
      }
      pos[i * 3] += Math.sin(t * 3 + S.phase[i]) * 0.15 * dt
      pos[i * 3 + 1] += S.vel[i] * dt
      pos[i * 3 + 2] += Math.cos(t * 2.6 + S.phase[i]) * 0.15 * dt
    }
    points.geometry.attributes.position.needsUpdate = true
    points.geometry.attributes.aSize.needsUpdate = true
  })

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
}
