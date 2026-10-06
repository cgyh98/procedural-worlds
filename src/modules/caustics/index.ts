import type { WorldModule } from '../types'
import { CausticsScene, CausticsWorldLayer } from './Scene'

// Shaders: a custom GLSL ShaderMaterial (class topic: shaders).
export const causticsModule: WorldModule = {
  id: 'caustics',
  title: 'Caustics (shader)',
  syllabus: [],
  about:
    'A shader is a tiny program the GPU runs for every pixel at once. This one paints moonlight caustics: ' +
    'it scatters drifting points (Worley noise, now on the GPU) and lights up pixels on the borders between ' +
    'their cells, where the nearest and second-nearest point are equally far (F2 − F1 ≈ 0). Sharpness is the ' +
    'exponent that keeps only pixels close to a border. The light is brighter on high, upward-facing ground ' +
    'and is added on top of the seafloor (additive blending). Debug shows the Worley cells behind the web.',
  Scene: CausticsScene,
  WorldLayer: CausticsWorldLayer,
  inWorld: true,
  camera: [0, 16, 22],
}
