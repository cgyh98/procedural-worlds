import { create } from 'zustand'

// Reefs to wake for a full moon (or all of them, if the map has fewer).
export const REEFS_NEEDED = 5
export const reefsNeeded = (total: number) => Math.max(1, Math.min(REEFS_NEEDED, total || REEFS_NEEDED))
import { useWorld } from '../store/useWorld'

// ─────────────────────────────────────────────────────────────────────────────
// Play mode: the atlas as a short game-like experience ("one night").
//
//   title   the ocean planet turns slowly under a title card; click to dive
//   diving  the camera falls towards the planet's surface and fades into the sea
//   swim    the World tab, full screen: new moon, sleeping reefs. Waking reefs
//           makes the moon rise; the story appears as quiet subtitles
//   end     full moon: the closing card
//
// This store only holds what the HTML overlay needs (stage, subtitle, fade, reef
// count). Per-frame work happens in PlayDirector (inside the canvas).
// ─────────────────────────────────────────────────────────────────────────────

export type PlayStage = 'off' | 'title' | 'diving' | 'swim' | 'end'

type PlayState = {
  stage: PlayStage
  subtitle: string
  fade: boolean // true = screen faded to the deep-water colour
  reefsAwake: number
  reefsTotal: number
  run: number // bumped on start/stop so the scene remounts fresh (player back at the start)
  start: () => void
  stop: () => void
  setStage: (s: PlayStage) => void
  setSubtitle: (s: string) => void
  setFade: (f: boolean) => void
  setReefs: (awake: number, total: number) => void
}

export const usePlay = create<PlayState>((set) => ({
  stage: 'off',
  subtitle: '',
  fade: false,
  reefsAwake: 0,
  reefsTotal: 0,
  run: 0,
  start: () => {
    set((s) => ({ stage: 'title', subtitle: '', fade: false, reefsAwake: 0, run: s.run + 1 }))
    useWorld.getState().setActiveModule('planet')
  },
  stop: () => {
    set((s) => ({ stage: 'off', subtitle: '', fade: false, run: s.run + 1 }))
    useWorld.getState().setMoonPhase(0.5)
    useWorld.getState().setActiveModule('world')
  },
  setStage: (stage) => set({ stage }),
  setSubtitle: (subtitle) => set({ subtitle }),
  setFade: (fade) => set({ fade }),
  setReefs: (reefsAwake, reefsTotal) => set({ reefsAwake, reefsTotal }),
}))

/** True while any play stage is running (the shell hides the lab UI). */
export const isPlaying = (s: PlayStage) => s !== 'off'
