import type { WorldModule } from './types'
import { shellModule } from './shell'
import { createWorldModule } from './world'

// The ordered list of tabs. Add new modules here, roughly in syllabus order.
// The World tab always comes last.
const labs: WorldModule[] = [shellModule]

export const modules: WorldModule[] = [...labs, createWorldModule(() => labs)]

// Look a module up by id; unknown ids (empty hash, typo) fall back to the first tab.
export const findModule = (id: string) => modules.find((m) => m.id === id) ?? modules[0]
