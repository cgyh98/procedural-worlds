import type { SeafloorSampler } from '../modules/seafloor/useSeafloor'

// Shared seafloor: the sampler of whichever seafloor is on screen right now.
// Written by useSeafloor() (seafloor module) while a tab that uses it is mounted, read
// by the player so it can't swim through the ground. null = no seafloor in this tab
// (open water: the player swims freely).
// A plain object, like systems/player.ts, so per-frame reads never touch React.
export const seafloor: { sampler: SeafloorSampler | null } = {
  sampler: null,
}
