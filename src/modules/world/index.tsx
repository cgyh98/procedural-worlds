import type { ModuleSceneProps, WorldModule } from '../types'

// The combined world. It renders every module marked `inWorld: true`, one after another,
// in the same scene. Modules are passed in (instead of imported from the registry)
// to avoid a circular import: registry → world → registry.
export function createWorldModule(getModules: () => WorldModule[]): WorldModule {
  function WorldScene(props: ModuleSceneProps) {
    const parts = getModules().filter((m) => m.inWorld)
    return parts.map(({ id, Scene }) => <Scene key={id} {...props} />)
  }

  return {
    id: 'world',
    title: 'World',
    syllabus: [],
    about:
      'Every finished module, together in one ocean. ' +
      'Each lab tab isolates one concept; this tab shows how they add up. ' +
      '(Empty for now: modules join once they are marked inWorld.)',
    Scene: WorldScene,
  }
}
