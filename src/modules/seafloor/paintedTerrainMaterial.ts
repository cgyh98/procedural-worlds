import { ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from 'three'
import { PALETTE, color } from '../../style/palette'

// ─────────────────────────────────────────────────────────────────────────────
// The seafloor in the painted style (test of the hero art direction on terrain)
//
// Same recipe as the hero's toon shader (disturbance/heroShader.ts), adapted to a
// landscape:
//   1. VALUE = lighting (how much the slope faces the moon) mixed with HEIGHT
//      (trenches darker, ridges lighter), plus a little low-frequency noise so big
//      areas aren't perfectly flat: like uneven brush strokes.
//   2. POSTERIZE the value into a few soft-edged steps (the painted bands).
//   3. COLOUR each step from the palette: navy → ultramarine → cobalt → periwinkle →
//      pale aqua. Hue shifts, never black.
//   4. A faint peach on the brightest ridge tops, Worley caustics on up-facing
//      ground, everything scaled by the moon (exposure), and the scene fog on top.
// ─────────────────────────────────────────────────────────────────────────────

export function createPaintedTerrainMaterial() {
  return new ShaderMaterial({
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uC0: { value: color(PALETTE.navy) },
        uC1: { value: color(PALETTE.ultramarine) },
        uC2: { value: color(PALETTE.cobalt) },
        uC3: { value: color(PALETTE.periwinkle) },
        uC4: { value: color(PALETTE.paleAqua) },
        uWarm: { value: color(PALETTE.peach) },
        uCausticColor: { value: color(PALETTE.paleAqua) },
        uLightDir: { value: new Vector3(0.35, 1, 0.2).normalize() },
        uSteps: { value: 3 },
        uSoftness: { value: 0.3 },
        uBrush: { value: 0.12 },
        uWarmAmount: { value: 0.25 },
        uCaustic: { value: 0.12 }, // low: the World tab also has the Caustics layer on top
        uExposure: { value: 1 },
        uTime: { value: 0 },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying float vHeight;
      void main() {
        vHeight = position.y; // the geometry stores heights in [-1, 1]
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        // The group is stretched vertically (scale.y = relief depth), which tilts the
        // true normals. The inverse-transpose of the model matrix corrects that.
        vWorldNormal = normalize(transpose(inverse(mat3(modelMatrix))) * normal);
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uC0, uC1, uC2, uC3, uC4, uWarm, uCausticColor, uLightDir;
      uniform float uSteps, uSoftness, uBrush, uWarmAmount, uCaustic, uExposure, uTime;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying float vHeight;

      // Smooth value noise (for the uneven "brush" variation)
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }
      float caustic(vec2 p, float time) {
        vec2 cell = floor(p), local = fract(p);
        float f1 = 8.0, f2 = 8.0;
        for (int j = -1; j <= 1; j++)
          for (int i = -1; i <= 1; i++) {
            vec2 o = vec2(float(i), float(j));
            vec2 pt = o + 0.5 + 0.4 * sin(time + 6.2831 * hash2(cell + o));
            float d = length(pt - local);
            if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
          }
        return pow(1.0 - smoothstep(0.0, 0.2, f2 - f1), 3.0);
      }
      // A 5-stop palette gradient, t in 0…1
      vec3 palette(float t) {
        t = clamp(t, 0.0, 1.0) * 4.0;
        if (t < 1.0) return mix(uC0, uC1, t);
        if (t < 2.0) return mix(uC1, uC2, t - 1.0);
        if (t < 3.0) return mix(uC2, uC3, t - 2.0);
        return mix(uC3, uC4, t - 3.0);
      }

      void main() {
        vec3 n = normalize(vWorldNormal);
        float light = dot(n, uLightDir) * 0.5 + 0.5;            // half-Lambert, 0…1
        float height = smoothstep(-0.9, 0.9, vHeight);          // trench 0 … ridge 1
        float brush = (vnoise(vWorldPos.xz * 0.35) + 0.5 * vnoise(vWorldPos.xz * 1.1) - 0.75) * uBrush;
        float value = clamp(0.65 * light + 0.35 * height + brush - 0.12, 0.0, 1.0);

        // Posterize into soft-edged steps (painted bands)
        float x = value * uSteps;
        float w = max(uSoftness, 0.001) * 0.5;
        float stepped = (floor(x) + smoothstep(0.5 - w, 0.5 + w, fract(x))) / uSteps;

        vec3 col = palette(stepped * 0.92);
        // A touch of warmth on the brightest, flattest ridge tops
        col = mix(col, uWarm, smoothstep(0.8, 1.0, stepped) * smoothstep(0.7, 1.0, n.y) * uWarmAmount);
        col *= uExposure;
        // Caustics on ground facing up
        col += uCausticColor * caustic(vWorldPos.xz / 2.2, uTime * 1.2) * clamp(n.y, 0.0, 1.0) * uCaustic * uExposure;

        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  })
}
