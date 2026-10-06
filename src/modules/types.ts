import type { ComponentType } from 'react'

// Props every module scene receives from the app shell.
export type ModuleSceneProps = {
  // Global debug toggle. Each module decides what its debug layer shows
  // (noise values, voxel boundaries, vector arrows…).
  debug: boolean
}

// The contract every module (= one tab) follows.
// Adding a new class topic means: make a folder in src/modules/, export one
// of these, and add it to the list in registry.ts. Nothing else changes.
export type WorldModule = {
  id: string // used in the URL hash, e.g. "currents"
  title: string // tab label
  syllabus: number[] // which class modules this covers (shown on the tab)
  about: string // concept card text: the idea and the algorithm, in plain words
  // The 3D content of this tab. It renders inside the shared <Canvas>,
  // and declares its own leva sliders, so the panel only shows the active tab's controls.
  Scene: ComponentType<ModuleSceneProps>
  // Whether this module is ready to be part of the combined World tab.
  inWorld?: boolean
  // What the World draws for this module, if not the whole tab Scene. Used by layers
  // that sit on top of something another module already draws (e.g. caustics on the seafloor).
  WorldLayer?: ComponentType<ModuleSceneProps>
  // True if the module moves the camera itself (e.g. a follow camera), so the
  // shell should not add its orbit controls.
  controlsCamera?: boolean
  // Where the camera starts when this tab opens (it looks at the origin).
  camera?: [number, number, number]
}
