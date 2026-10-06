# Excitation and the player ("You are the disturbance")

The core design mechanic. In the project: the **Disturbance** tab (`src/modules/disturbance/`), the shared rule in `src/systems/excitation.ts`, and the player state in `src/systems/player.ts`.

![[2026-10-04-disturbance-glow.png]]
*Glow only (flow glow off): the plankton around the player light up, the rest of the ocean stays dark.*

## The rule
Every glowing thing has one number, `excitation`. Each frame:

```
excitation += playerSpeed × strength × e^(−d² / 2r²) × dt   ← stirred up
excitation *= e^(−recovery × dt)                             ← fades back to dark
brightness  = rest glow + flow glow + excitation
```

- **Gaussian falloff** `e^(−d²/2r²)`: 1 at the player, ≈0.6 at distance r, ≈0.01 at 3r (skipped beyond 3r).
- **Exponential decay** is frame-rate independent: `e^(−a)·e^(−b) = e^(−(a+b))`, so the glow fades the same on 60 Hz and 120 Hz screens.
- Real-world source: dinoflagellates flash when the water around them is disturbed, then recover.

## A surprise from the math
Integrating the stimulus as the player passes a plankton at sideways distance b:

```
total ≈ strength × r × √(2π) × e^(−b² / 2r²)
```

**Speed cancels out.** Faster swimming excites each plankton more per second, but for proportionally less time. What speed changes: how many plankton you light per second, and how fresh (less faded) your trail is. Useful for tuning too: `strength × r × 2.5` is how bright a direct hit gets (defaults 0.6 × 1 × 2.5 ≈ 1.5).

The same formula explains a tuning problem: with r = 2, everything within ~4 units of the path stayed visibly lit, so the "trail" was a glowing tube ~8 units wide with the camera inside it. Radius 1 makes it a trail.

## The player
- **Swimming with inertia + drag:** keys add acceleration; water drag `velocity *= e^(−drag·dt)` slows you down. Top speed ≈ swim force ÷ drag. Shift = burst (more force).
- **Follow camera:** each frame the camera moves a fraction `1 − e^(−k·dt)` of the way to a point behind and above the player (exponential smoothing), then looks at the player.
- **Keys:** W/S swim · A/D turn · E/Q up/down · Shift burst.
- Form is a placeholder glowing orb (creature vs. diver still undecided).

## Endless water, revisited
The plankton box is centred on the player and wraps around it. **A wrapped plankton resets its excitation to 0:** it's conceptually a new plankton on the far side. Without this, a fast player's trail wrapped from the back of the box to the front and the whole box lit up (a real bug found while taking these screenshots).

## Rendering details
- Plankton near the camera were drawn huge (perspective sizing ∝ 1/distance). Fixed with a small **shader edit** via `onBeforeCompile` on `PointsMaterial`: cap the on-screen point size and fade points closer than ~2 units to the camera. First GLSL in the project.
- Per-frame player data lives in a plain mutable object (`systems/player.ts`), never React state.

## Debug view
![[2026-10-04-disturbance-debug.png]]
*Inner sphere = radius r, outer sphere = 3r cutoff; amber arrows = the current (see [[vector-fields]]).*

## Structure
- `systems/` = shared systems any tab can use (player, excitation). Plankton read them; jellyfish, coral and creatures will too.
- The Disturbance tab = the Currents scene + the player. The World tab now uses Disturbance (Currents joins through it).

## Update (2026-10-06): wake ellipsoid + jellyfish

![[2026-10-06-jelly-swim.png]]
*The jellyfish swimming: the bell tilts forward, tentacles trail, and the wake leaves a line of lit plankton behind.*

### Why the zone was a sphere
The rule only used **distance**, `e^(−d²/2r²)`, and distance is the same in every direction (isotropic), so equal stirring formed a sphere.

### Wake ellipsoid (now the default; Sphere kept in the dropdown)
Split each offset relative to the swim direction:
- `along = offset · direction` (+ ahead, − behind)
- `side² = d² − along²` (Pythagoras)

and give each part its own size:
- behind: `r × stretch`, with `stretch = 1 + wake × min(speed/5, 2)`, so faster means a longer wake
- ahead: `r × 0.7`
- sides: `r × width`

`falloff = e^(−along²/2ra² − side²/2rs²)`: an egg trailing behind the swimmer. Cost: ~6 extra arithmetic operations per plankton (~0.05 ms for 8000).

![[2026-10-06-jelly-wake-debug.png]]
*Debug: the wake's 1σ and 3σ surfaces around the jellyfish.*

### Procedural jellyfish (the player's body; settles creature vs. diver)
- **Bell:** a translucent half-sphere with a bright core. It **pulses** (contracts narrower and taller), faster when swimming faster, and **tilts** towards the velocity (jellyfish swim bell-first), smoothly via quaternion slerp.
- **Tentacles:** 10 chains × 16 points. Each frame: glue point 0 to the moving rim, drift every other point "down" (away from the bell top) with a sway, then a **distance constraint** puts each point exactly one segment from the previous one. Points are only dragged by their neighbour, so they lag and trail: "follow the leader", no physics engine. 160 points, one draw call.
- Movement, body and debug are now three components (`Player`, `Jellyfish`, `WakeDebug`), mounted in that order so the body always draws this frame's position.

![[2026-10-06-jelly-still.png]]
