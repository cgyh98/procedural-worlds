import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { FogExp2, Vector3 } from 'three'
import { reefsNeeded, usePlay } from './usePlay'
import { useWorld } from '../store/useWorld'
import { player } from '../systems/player'
import { reefs } from '../systems/reefs'
import { night } from '../systems/night'
import { ReefBeacon } from './ReefBeacon'

// ─────────────────────────────────────────────────────────────────────────────
// The director: runs inside the canvas and moves the story forward each frame.
// Two parts, one per scale of the world (see the two-scale decision):
//   PlanetFlight: planet view: a slow orbit, then the dive towards the surface
//   Story:        dive view: subtitles, and the moon rising as reefs wake up
// ─────────────────────────────────────────────────────────────────────────────

export function PlayDirector() {
  const stage = usePlay((s) => s.stage)
  if (stage === 'title' || stage === 'diving') return <PlanetFlight />
  if (stage === 'swim' || stage === 'end') return <Story />
  return null
}

const PLANET_R = 5 // the ocean planet's radius (planet module)
const ORBIT = 19
const DIVE_TIME = 3 // seconds from click to the sea
const start = new Vector3()
const target = new Vector3()

// Title: orbit slowly around the planet. Dive: ease the camera from its orbit down to
// just above the surface point it was facing (the planet fills the screen), fading
// to the deep-water colour, then switch to the World (dive view).
function PlanetFlight() {
  const angle = useRef(0.6)
  const diveT = useRef<number | null>(null)
  const faded = useRef(false)

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05)
    const play = usePlay.getState()
    if (play.stage === 'title') {
      angle.current += dt * 0.08
      camera.position.set(Math.sin(angle.current) * ORBIT, 4.5, Math.cos(angle.current) * ORBIT)
      camera.lookAt(0, 0, 0)
      return
    }
    // Diving
    if (diveT.current === null) {
      diveT.current = 0
      start.copy(camera.position)
      target.copy(camera.position).normalize().multiplyScalar(PLANET_R + 0.25) // just above the sea
    }
    diveT.current += dt
    const u = Math.min(diveT.current / DIVE_TIME, 1)
    const e = u * u * (3 - 2 * u) // ease in and out
    camera.position.lerpVectors(start, target, e * e) // slow start, fast fall
    camera.lookAt(0, 0, 0)
    if (u > 0.6 && !faded.current) {
      faded.current = true
      play.setFade(true)
    }
    if (u >= 1) {
      useWorld.getState().setMoonPhase(0) // a new-moon night
      play.setStage('swim')
      useWorld.getState().setActiveModule('world')
    }
  })
  return null
}

// The night, as beats. Each beat waits for a condition (time, the player moving, the
// moon), shows one line, and hands over to the next.
type Beat = { text: string; when: (s: StoryState) => boolean }
type StoryState = { t: number; moved: number; moon: number; awake: number }

const BEATS: Beat[] = [
  { text: 'The moon is dark tonight.', when: (s) => s.t > 1.5 },
  { text: 'Its child has fallen into the sea.', when: (s) => s.t > 5.5 },
  { text: 'Every movement makes light.', when: (s) => s.t > 10 && s.moved > 0 },
  { text: 'The reefs below are sleeping. Wake them.', when: (s) => s.moved > 0 && s.t > s.moved + 5 },
  { text: 'A reef wakes. Far above, the moon stirs.', when: (s) => s.awake >= 1 },
  { text: 'Every reef you wake gives the moon back a little light.', when: (s) => s.moon > 0.45 },
  { text: 'The moon is rising. Your light fades in hers.', when: (s) => s.moon > 0.8 },
]
const SUBTITLE_TIME = 4.5 // seconds each line stays
const NIGHT_LENGTH = 300 // the moon also rises on its own: at most 5 minutes
// The map is finite (40 × 40). Until chunk streaming (module 24) makes it endless,
// three tricks hide the edge (TEMPORARY, see vault/decisions/infinite-seafloor.md):
//   1. the seafloor slopes down into the abyss near its rim (useSeafloor's edge falloff),
//   2. thicker fog while playing, so the slope melts into the water colour,
//   3. a soft boundary that turns you back before you can look over the slope.
const BOUND = 12 // radius of the swimmable area (the slope starts at ~13)
const PLAY_FOG = 0.08 // fog density while playing: thick, so only what's near the child shows (labs keep the shell's slider)

function Story() {
  const t = useRef(0)
  const moved = useRef(0) // time of the first real movement (0 = not yet)
  const beat = useRef(0)
  const shownAt = useRef(-99)
  const moon = useRef(0)
  const ended = useRef(false)
  const scene = useThree((st) => st.scene)

  // Presenter shortcuts (not shown on screen, so the audience doesn't see them):
  //   N  show the next story line now      R  wake the nearest sleeping reef
  const skip = useRef(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.repeat) return
      if (e.code === 'KeyN') skip.current = true
      if (e.code === 'KeyR') reefs.wakeRequest = true
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Thicker fog for the night; give the shell's value back when the story ends.
  useEffect(() => {
    const fog = scene.fog instanceof FogExp2 ? scene.fog : null
    if (!fog) return
    const before = fog.density
    // Pitch-black night: no resting light at new moon, water almost black.
    // The world appears only where the child goes (her light + the glow she stirs up).
    night.minDarkness = 1
    night.waterFloor = 0.04
    return () => {
      fog.density = before
      night.minDarkness = 0
      night.waterFloor = 0.3
    }
  }, [scene])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const play = usePlay.getState()
    t.current += dt
    if (t.current > 0.4 && play.fade) play.setFade(false) // fade in from the dive
    if (!moved.current && player.speed > 0.6) moved.current = t.current
    if (state.scene.fog instanceof FogExp2) state.scene.fog.density = PLAY_FOG

    // A soft invisible wall: past BOUND from the centre, the water gently pushes you
    // back (and keeps you between the seafloor and the surface), so you can't swim off the map.
    const r = Math.hypot(player.position.x, player.position.z)
    if (r > BOUND) {
      const push = (r - BOUND) * 6 * dt
      player.velocity.x -= (player.position.x / r) * push
      player.velocity.z -= (player.position.z / r) * push
    }
    if (player.position.y > 4) player.velocity.y -= (player.position.y - 4) * 6 * dt
    if (player.position.y < -8) player.velocity.y += (-8 - player.position.y) * 6 * dt
    // Mirror the reef count into the store (only when it changes) for the overlay's dots
    if (reefs.awake !== play.reefsAwake || reefs.total !== play.reefsTotal) play.setReefs(reefs.awake, reefs.total)

    // The moon rises with every reef woken (discovery is the progress), and slowly by itself
    const needed = reefsNeeded(play.reefsTotal)
    const goal = Math.min(1, (play.reefsAwake / needed) * 0.95 + t.current / NIGHT_LENGTH)
    moon.current += (goal - moon.current) * (1 - Math.exp(-0.6 * dt)) // the sky changes slowly
    const world = useWorld.getState()
    if (Math.abs(world.moonPhase - moon.current) > 0.002) world.setMoonPhase(moon.current)

    // Story beats
    const s: StoryState = { t: t.current, moved: moved.current, moon: moon.current, awake: play.reefsAwake }
    const next = BEATS[beat.current]
    if (next && ((next.when(s) && t.current - shownAt.current > 1.2) || skip.current)) {
      skip.current = false
      play.setSubtitle(next.text)
      shownAt.current = t.current
      beat.current++
    } else if (play.subtitle && t.current - shownAt.current > SUBTITLE_TIME) {
      play.setSubtitle('')
    }

    // Full moon: the night is over
    if (!ended.current && moon.current > 0.97) {
      ended.current = true
      play.setSubtitle('')
      play.setStage('end')
    }
  })
  // Once you've started swimming, a beacon marks the nearest sleeping reef
  return <ReefBeacon visibleAfter={moved} />
}
