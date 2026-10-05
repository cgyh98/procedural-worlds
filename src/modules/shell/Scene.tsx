import type { ModuleSceneProps } from '../types'

// The empty scene we started from: just the debug helpers.
// It is the reference for "what the shell gives every module for free"
// (background, fog, camera controls, debug toggle).
export function ShellScene({ debug }: ModuleSceneProps) {
  return (
    debug && (
      <>
        <gridHelper args={[20, 20, '#1f4a6b', '#0d2235']} />
        <axesHelper args={[2]} />
      </>
    )
  )
}
