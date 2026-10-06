import { Vector3 } from 'three'

// Where the sunlight comes from, as seen from the planet. The planet's directional
// light and the moon-phase calculation both use it, so they always agree.
export const SUN_DIR = new Vector3(1, 0.25, 0.35).normalize()
