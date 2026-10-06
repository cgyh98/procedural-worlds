import type { WorldModule } from './types'
import { shellModule } from './shell'
import { seafloorModule } from './seafloor'
import { distributionsModule } from './distributions'
import { pathsModule } from './paths'
import { currentsModule } from './currents'
import { disturbanceModule } from './disturbance'
import { createWorldModule } from './world'

// The ordered list of tabs. Add new modules here, roughly in syllabus order.
// The World tab always comes last.
const labs: WorldModule[] = [shellModule, seafloorModule, currentsModule, distributionsModule, pathsModule, disturbanceModule]

export const modules: WorldModule[] = [...labs, createWorldModule(() => labs)]

// Look a module up by id; unknown ids (empty hash, typo) fall back to the first tab.
export const findModule = (id: string) => modules.find((m) => m.id === id) ?? modules[0]
