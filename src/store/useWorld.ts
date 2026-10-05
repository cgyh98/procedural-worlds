import { create } from 'zustand'

// Global app state lives in one small zustand store.
// Rule of thumb: put things here that several parts of the app read
// (the active tab, the moon phase). Per-frame values (positions, velocities)
// never go here; they live in refs inside useFrame.

// The URL hash (#currents, #world…) remembers which tab is open, so a reload
// or a shared link lands on the same module. Handy during the presentation.
const readHash = () => window.location.hash.replace('#', '')

type WorldState = {
  activeModuleId: string
  setActiveModule: (id: string) => void

  moonPhase: number // 0 = new moon, 1 = full moon
  setMoonPhase: (v: number) => void
}

export const useWorld = create<WorldState>((set) => ({
  activeModuleId: readHash(),
  setActiveModule: (id) => {
    window.location.hash = id
    set({ activeModuleId: id })
  },

  moonPhase: 0.5,
  setMoonPhase: (v) => set({ moonPhase: v }),
}))

// Keep the store in sync if the hash changes some other way (back/forward buttons).
window.addEventListener('hashchange', () => {
  useWorld.setState({ activeModuleId: readHash() })
})
