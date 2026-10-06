import { Color, UniformsLib, UniformsUtils } from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Moonlight caustics: a custom GLSL shader (class topic: shaders)
//
// A shader is a small program that runs on the GPU, massively in parallel:
//   - the VERTEX shader runs once per vertex and decides where it lands on screen;
//   - the FRAGMENT shader runs once per pixel and decides its colour.
// Every pixel runs the same code at the same time, knowing only its own inputs.
//
// Caustics are the dancing web of light that rippling water focuses onto the
// seafloor. We fake them with animated Worley noise: scatter moving points, and
// light up the pixels that sit on the BORDER between two points' cells, where the
// nearest and second-nearest point are about equally far away (F2 − F1 ≈ 0).
// ─────────────────────────────────────────────────────────────────────────────

// Uniforms = values sent from JavaScript to the shader, the same for every pixel.
// (Per-frame and slider values are updated in CausticsLayer's useFrame.)
export function createCausticsUniforms() {
  return UniformsUtils.merge([
    UniformsLib.fog, // fogColor, fogDensity…: lets the shader fade into the fog like everything else
    {
      uTime: { value: 0 },
      uScale: { value: 2.5 }, // cell size in world units
      uSpeed: { value: 0.6 },
      uIntensity: { value: 0.7 },
      uSharpness: { value: 6.5 },
      uHeightBoost: { value: 0.6 },
      uLayered: { value: 0 }, // 0 = one web, 1 = two webs stacked
      uDebug: { value: 0 }, // 1 = show the raw Worley cells
      uYScale: { value: 4 }, // the terrain's vertical stretch (to correct normals)
      uColor: { value: new Color(0.35, 0.8, 1.7) }, // icy electric blue (cosmos board)
    },
  ])
}

export const causticsVertexShader = /* glsl */ `
  // three.js provides: position, normal (attributes), and modelMatrix,
  // modelViewMatrix, projectionMatrix (uniforms).
  #include <fog_pars_vertex>

  uniform float uYScale;

  // "varyings" are handed from each vertex to the pixels between vertices,
  // blended smoothly across each triangle.
  varying vec2 vWorldXZ;   // position on the seafloor, in world units
  varying float vHeight;   // normalized height, −1 (trench) … 1 (ridge)
  varying float vUp;       // how much the surface faces upwards (0 = wall, 1 = flat)

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldXZ = worldPos.xz;
    vHeight = position.y; // the geometry stores heights in [-1, 1]

    // The terrain is stretched vertically by uYScale, which tilts the true normals:
    // stretching y by s divides the normal's y by s. Light from above lands mostly
    // on surfaces facing up, so walls get fewer caustics.
    vUp = normalize(vec3(normal.x, normal.y / uYScale, normal.z)).y;

    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

export const causticsFragmentShader = /* glsl */ `
  #include <fog_pars_fragment>

  uniform float uTime;
  uniform float uScale;
  uniform float uSpeed;
  uniform float uIntensity;
  uniform float uSharpness;
  uniform float uHeightBoost;
  uniform float uLayered;
  uniform float uDebug;
  uniform vec3 uColor;

  varying vec2 vWorldXZ;
  varying float vHeight;
  varying float vUp;

  // A pseudo-random 2D vector per grid cell: the same input always gives the same
  // output, so every pixel agrees on where each cell's point is.
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  // Animated Worley noise. Returns (F1, F2, cellId):
  //   F1 = distance to the nearest point, F2 = to the second nearest.
  // Each grid cell owns one point that wanders in a small circle over time.
  vec3 worley(vec2 p, float time) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    float f1 = 8.0;
    float f2 = 8.0;
    float id = 0.0;
    // The nearest points can only be in this cell or the 8 around it
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 offset = vec2(float(i), float(j));
        vec2 rnd = hash2(cell + offset);
        // The point drifts around its home position: this makes the web dance
        vec2 pointPos = offset + 0.5 + 0.4 * sin(time + 6.2831 * rnd);
        float d = length(pointPos - local);
        if (d < f1) {
          f2 = f1;
          f1 = d;
          id = dot(cell + offset, vec2(7.0, 113.0));
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
    return vec3(f1, f2, id);
  }

  // Turn (F1, F2) into a bright thin line on the cell borders.
  // F2 − F1 is 0 exactly on a border and grows towards a cell's centre. Raising
  // (1 − that) to a power ("sharpness") keeps only the pixels very close to a border.
  float web(vec3 w) {
    return pow(clamp(1.0 - (w.y - w.x) * 1.6, 0.0, 1.0), uSharpness);
  }

  void main() {
    float time = uTime * uSpeed;
    vec2 p = vWorldXZ / uScale;

    vec3 w1 = worley(p, time);
    float c = web(w1);

    // Layered: a second, finer web drifting another way. Where two webs cross, the
    // light adds up, closer to the tangled look of real caustics.
    if (uLayered > 0.5) {
      vec3 w2 = worley(p * 1.7 + vec2(time * 0.13, -time * 0.09), time * 1.3 + 2.0);
      c = c * 0.65 + web(w2) * 0.65;
    }

    // Brighter on high ground (closer to the moon, less water above) and on
    // surfaces facing up; dimmer in deep trenches and on steep walls.
    float heightFactor = mix(1.0 - uHeightBoost, 1.0, (vHeight + 1.0) * 0.5);
    float facing = smoothstep(0.2, 0.9, vUp);
    vec3 col = uColor * c * uIntensity * heightFactor * facing;

    // Debug: show the Worley cells themselves (each cell a random dim colour) with
    // their borders, i.e. the structure behind the web.
    if (uDebug > 0.5) {
      vec3 cellColor = 0.25 + 0.35 * vec3(fract(sin(w1.z) * 43758.5), fract(sin(w1.z + 1.7) * 43758.5), fract(sin(w1.z + 3.1) * 43758.5));
      col = cellColor * 0.6 + vec3(1.0, 0.7, 0.3) * web(w1);
    }

    // Fade into the fog. This layer is ADDED on top of the terrain, so instead of
    // blending towards the fog colour we simply dim it with distance.
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
      #else
        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      #endif
      col *= 1.0 - fogFactor;
    #endif

    gl_FragColor = vec4(col, 1.0);
  }
`
