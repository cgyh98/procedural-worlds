import { BackSide, ShaderMaterial, Vector3 } from 'three'
import { PALETTE, color } from '../../style/palette'

// ─────────────────────────────────────────────────────────────────────────────
// The hero's painterly toon shader
//
// Goal: a digital painting that moves, not realistic 3D. Four layers, each simple:
//
//   1. LIGHTING RAMP (toon / cel shading). Normal lighting is a smooth gradient:
//      brightness = how much the surface faces the light (n·l). Toon shading cuts that
//      gradient into a few flat steps, like a painter blocking in light and shadow.
//      We soften the edges between steps with smoothstep, so they read as brush
//      strokes rather than hard bands.
//
//   2. COLOUR BY STEP, NOT BY DARKENING. Each step picks a colour from the palette:
//      shadow = saturated cobalt (cool), midtone = periwinkle, light = pale aqua.
//      Painters shift the HUE in shadows instead of just adding black.
//
//   3. WARM ACCENT. Only the brightest, upward-facing parts (shoulders, cheeks, knees,
//      fingertips catching light from above) shift towards peach: warm on cool.
//
//   4. RIM + CAUSTICS. A fresnel rim in pale cyan outlines the silhouette (it glows
//      against the dark water), and an animated Worley web (the same idea as the
//      seafloor caustics) is projected onto surfaces facing up.
//
// uDebug shows a single layer on its own: 1 = lighting ramp, 2 = caustic mask, 3 = rim mask, 4 = brush.
// ─────────────────────────────────────────────────────────────────────────────

export type HeroShaderOptions = { hair?: boolean }

export function createHeroMaterial({ hair = false }: HeroShaderOptions = {}) {
  return new ShaderMaterial({
    uniforms: {
      uShadow: { value: color(PALETTE.cobalt) },
      uDeep: { value: color(PALETTE.ultramarine) },
      uMid: { value: color(hair ? PALETTE.periwinkle : PALETTE.softViolet) },
      uLight: { value: color(PALETTE.paleAqua) },
      uWarm: { value: color(PALETTE.peach) },
      uRimColor: { value: color(PALETTE.paleAqua) },
      uCausticColor: { value: color(PALETTE.paleAqua) },
      uLightDir: { value: new Vector3(0.25, 1, 0.15).normalize() }, // moonlight from above
      uSteps: { value: 3 },
      uSoftness: { value: 0.35 },
      uRim: { value: 0.7 },
      uWarmAmount: { value: hair ? 0 : 0.7 },
      uCausticScale: { value: 1.2 },
      uCausticSpeed: { value: 0.4 },
      uCausticAmount: { value: 0.35 },
      uTime: { value: 0 },
      uDebug: { value: 0 },
      uExposure: { value: 1 }, // how lit the scene is (set from the moon phase)
      uBrush: { value: 0.18 }, // strength of the painted brush-stroke texture
    },
    vertexShader: /* glsl */ `
      // three.js skinning chunks: on a SkinnedMesh they blend each vertex between its
      // bones (USE_SKINNING is defined automatically); on a plain mesh they do nothing.
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vBodyPos; // position in the bind pose: the brush texture sticks to the body
      void main() {
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vBodyPos = position;
        vec4 world = modelMatrix * vec4(transformed, 1.0);
        vWorldPos = world.xyz;
        // World-space normal (fine here: the hero's parts are never scaled unevenly much)
        vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uShadow, uDeep, uMid, uLight, uWarm, uRimColor, uCausticColor, uLightDir;
      uniform float uSteps, uSoftness, uRim, uWarmAmount, uCausticScale, uCausticSpeed, uCausticAmount, uTime, uDebug, uExposure, uBrush;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vBodyPos;

      // Smooth value noise, used for the brush strokes
      float hash1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash1(i), hash1(i + vec2(1, 0)), u.x), mix(hash1(i + vec2(0, 1)), hash1(i + vec2(1, 1)), u.x), u.y);
      }
      // Brush strokes: noise STRETCHED along one direction (long in one axis, short in
      // the other) looks like streaks of paint. Two layers at different angles.
      float brush(vec3 p) {
        vec2 a = vec2(p.x + p.z * 0.5, p.y);
        float s1 = vnoise(vec2(a.x * 9.0, a.y * 38.0));
        float s2 = vnoise(vec2((a.x + a.y) * 30.0, (a.y - a.x) * 8.0));
        return 0.6 * s1 + 0.4 * s2; // 0…1
      }

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }
      // Animated Worley borders: bright where F2 − F1 ≈ 0 (see the Caustics tab)
      float caustic(vec2 p, float time) {
        vec2 cell = floor(p);
        vec2 local = fract(p);
        float f1 = 8.0, f2 = 8.0;
        for (int j = -1; j <= 1; j++)
          for (int i = -1; i <= 1; i++) {
            vec2 o = vec2(float(i), float(j));
            vec2 pt = o + 0.5 + 0.4 * sin(time + 6.2831 * hash2(cell + o));
            float d = length(pt - local);
            if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
          }
        return pow(1.0 - smoothstep(0.0, 0.25, f2 - f1), 3.0);
      }

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 v = normalize(cameraPosition - vWorldPos);

        // 1. Lighting ramp: half-Lambert (n·l remapped to 0…1, softer than plain n·l),
        //    then posterized into uSteps soft-edged steps.
        float light = dot(n, normalize(uLightDir)) * 0.5 + 0.5;
        // Brush: nudge the light before it's cut into steps, so step edges become
        // ragged like painted strokes, and big areas aren't perfectly flat.
        float strokes = brush(vBodyPos * 6.0);
        light += (strokes - 0.5) * uBrush;
        float x = light * uSteps;
        float w = max(uSoftness, 0.001) * 0.5;
        float ramp = clamp((floor(x) + smoothstep(0.5 - w, 0.5 + w, fract(x))) / uSteps, 0.0, 1.0);

        // 2. Colour by step: deep → cobalt → periwinkle → pale aqua (hue shifts, no black)
        vec3 col = ramp < 0.5
          ? mix(mix(uDeep, uShadow, 0.6), uMid, ramp * 2.0)
          : mix(uMid, uLight, (ramp - 0.5) * 2.0);

        // 3. Warm accent: only the brightest, upward-facing surfaces
        float warmMask = smoothstep(0.6, 1.0, ramp) * smoothstep(0.2, 0.9, n.y);
        col = mix(col, uWarm, warmMask * uWarmAmount);
        // The moon sets how lit the painted body is (dim at new moon, full at full moon)
        col *= uExposure;

        // 4a. Caustics projected from above, on surfaces facing up
        float up = clamp(n.y, 0.0, 1.0);
        vec2 cp = (vWorldPos.xz + vWorldPos.y * 0.3) / uCausticScale;
        float causticMask = caustic(cp, uTime * uCausticSpeed * 3.0) * up;
        col += uCausticColor * causticMask * uCausticAmount * uExposure;

        // 4b. Rim (fresnel): bright where the surface turns away from the camera
        float rimMask = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
        col += uRimColor * rimMask * uRim;

        if (uDebug > 0.5 && uDebug < 1.5) col = vec3(ramp);
        else if (uDebug > 1.5 && uDebug < 2.5) col = vec3(causticMask);
        else if (uDebug > 2.5 && uDebug < 3.5) col = vec3(rimMask);
        else if (uDebug > 3.5) col = vec3(strokes);

        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Ink outline (option B): the "inverted hull" trick
//
// Draw the body a SECOND time, slightly inflated (every vertex pushed out along its
// normal) and showing only its BACK faces, in a dark ink colour. Where the inflated
// copy sticks out past the real body (the silhouette) you see a dark rim: an outline.
// Everywhere else the real body covers it. No edge detection needed.
//
// The push is measured in view space and multiplied by the depth, so the line keeps
// about the same width on screen near or far. A little noise varies the width along
// the body, like a hand-drawn line.
// ─────────────────────────────────────────────────────────────────────────────
export function createOutlineMaterial() {
  return new ShaderMaterial({
    side: BackSide,
    uniforms: {
      uColor: { value: color(PALETTE.navy).lerp(color(PALETTE.ultramarine), 0.45) }, // ink: dark blue, not black
      uWidth: { value: 0.0028 },
      uExposure: { value: 1 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <skinning_pars_vertex>
      uniform float uWidth;
            void main() {
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
        vec3 nView = normalize(normalMatrix * objectNormal);
        // Hand-drawn feel: the width swells and thins gently (75%–125%) along the body
        float wobble = 0.75 + 0.5 * (0.5 + 0.5 * sin(position.y * 14.0 + position.x * 9.0 + position.z * 5.0));
        mv.xyz += nView * uWidth * wobble * -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uExposure;
      void main() {
        gl_FragColor = vec4(uColor * (0.6 + 0.4 * uExposure), 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
}
