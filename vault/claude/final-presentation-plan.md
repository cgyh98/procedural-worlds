# Final presentation plan

Written 2026-11-09. **Progress presentation: 2026-11-11. Final due: ~2026-11-23.**

Goal for the final: one ocean where every system feeds the next and the moon conducts them all. *Seafloor → biomes → life → creatures; moon → light, tides, behaviour; you → disturbance.*

## Story and game feel (proposal)
The game-like vibe the class aims for, within the concept's rules (no scores, levels or heavy UI; the reward is discovery).

**Two modes:** **Play** (full screen, no panels, the story) and **Atlas** (today's lab tabs with sliders and debug views, for the presentation). The same systems drive both.

**One night, three acts** (about 5–8 minutes of play):
1. **Birth (new moon).** Title over the dark planet. Click → the camera dives into a black bay. You're the **moon child**, fallen into the sea (the moon is dark because its child fell); nothing glows until you move. No tutorial text: the first plankton flash *is* the tutorial.
2. **Wander.** Faint migration routes lead from reef to reef. Each reef wakes up when you arrive (its colony lights up and its creatures come out). Each species you disturb for the first time is added to a **field journal** (a small bestiary; each entry is generated from that species' genome). Swim fast and creatures scatter; swim slowly and they come close.
3. **Moonrise.** The moon rises and the night brightens: your glow fades in the moonlight (moonlight vs. bioluminescence). At the last reef, a lunar event is the climax: a fireworm / spawning display. Then the camera pulls back to the planet, where your path of light is drawn across the globe and fades.

**Optional dark twist (uses the algae idea as story, not a simulation):** the home bay starts dimmed by a bloom; waking every reef brings the glow back to the bay at the end.

**Game feel, cheapest first:** a title card and fades, a procedural ambient sound (Web Audio) with chimes when something lights up, glowing hints instead of text, camera moments at each reef, a journal entry pop-in.

## Main character (decided 2026-11-10)
**The moon child** (fantasy, more familiar than a jellyfish): a simple silhouette after the board (a tiny dark figure, glowing edges, filament hair). Alternatives considered: jellyfish, firefly squid, fireworm, seal pup, manatee, dolphin, child diver. See [[moon-child-character]].

## Progress presentation (2 days): creatures
Show the newest class topic (species / character creation, modules 19–20) applied to the player.

1. **Species tab: a procedural jellyfish generator.** The jellyfish becomes a *genome*: a handful of numbers, and the generator builds the body from them (see [[#Making the creature more interesting]]). It gets sliders, a "randomize" button, a dropdown of preset species and a debug view that shows the bell profile curve, rim anchors and tentacle chains. The player swims as the chosen species.
2. **Glow wave.** A pulse of light travels down the body each time the bell contracts.
3. **Small story for the slides:** midterm atlas → "now the world gets inhabitants" → species tab → swim in the World → what's next (the plan below).
4. Commit + deploy so the live site matches.

## Week 1 (11/12–11/17): populations of creatures
- A few NPC jellyfish/species spawned in the World, placed by biome and depth.
- **Behaviour:** drift with the currents, flee when the player swims fast (speed as a choice), approach when it's slow.
- **Schedules (module 20):** vertical migration with time of night; moon phase sets how high they rise; a lunar-timed display (fireworm-style swarm after the full moon).

## Week 2 (11/18–11/23): cohesion and polish
- `moonPhase` drives glow visibility, caustic brightness, tide height and counterillumination.
- Biomes fix (depth below the tide) and biomes deciding where kelp and reefs grow.
- Voxel outcrops at the reef nodes.
- Planet → dive: click the planet to zoom into the World (LOD / streaming / fog).
- Guided tour mode, performance pass, final video + report.

## Stretch: algae bloom (only if time allows)
Idea from Mosquito Bay (Vieques): a non-glowing algae bloom can outcompete the glowing dinoflagellates and switch a bay's glow off. It's a good fit (two competing populations in the enclosed bays found by flood fill, nutrient pulses from storms/tides), but it's a new system. **Decision for now:** keep it as a *narrative* point and future work in the final; build it only if weeks 1–2 finish early. Minimal version: a `glowHealth` per bay that multiplies the excitation rule. See [[bioluminescence-explained]].

## Making the creature more interesting
The current jellyfish is one fixed body (a half-sphere bell + 10 straight tentacles). Ideas, from most to least impact for the cost:

| Idea | What it adds | Real-world basis |
|---|---|---|
| **Bell profile curve** (a lathe: a 2D outline spun around the axis) | Saucer, dome, tall bell, thimble shapes from 2–3 numbers | Moon jelly vs. box jelly vs. *Aequorea* |
| **Frilled rim** (radius × (1 + a·sin(k·angle))) | Scalloped, lobed edge | Lappets on scyphozoans |
| **Radial canals** as glowing lines inside the bell | Internal structure that reads at a distance | Canals of *Aequorea* (the original GFP jelly) |
| **Oral arms**: wide, frilly ribbons in the centre | Silhouette contrast with the thin tentacles | Moon / sea nettle jellies |
| **Glow wave** down canals and tentacles on each pulse | The creature feels alive, not just lit | Light waves on comb jellies / *Atolla* "burglar alarm" |
| **Tentacle variety**: count, length, thickness, curl | Very different species from the same code | |
| **Species presets** in a dropdown + randomize | Quick comparison, shows the "genome → body" idea | |

The point for the class: a **species is a set of parameters**, and **character creation is a function from parameters to a body**. The debug view shows that function's pieces.
