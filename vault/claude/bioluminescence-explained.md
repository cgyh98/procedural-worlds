# Bioluminescence, explained (and what the project models)

ELI5 first, then the real mechanism, then how each part maps onto the code, and what we simplify. Useful for the "why" part of the presentation. Overview: [[procedural-atlas-overview]].

## ELI5
Some living things can make their own light, the way a firefly does. In the sea it's everywhere: tiny plankton, jellyfish, squid, fish. Most of the light is **blue**, because blue travels farthest through water.

The plankton we model are **dinoflagellates**: single cells far smaller than a grain of sand. Each one is like a **tiny glow stick that snaps when you bump it**. Swish your hand through the water at night and thousands of them flash at once, so your hand leaves a sparkling trail. Stop moving, and the sparkles fade back to black. **You are the disturbance.**

## The real phenomenon

### 1. The chemistry: how a cell makes light
- A molecule called **luciferin** reacts with oxygen, helped by an enzyme called **luciferase**. The reaction releases energy as **light instead of heat** ("cold light").
- In dinoflagellates the luciferin and luciferase are packed into tiny compartments in the cell, called **scintillons**.

### 2. The trigger: why touching makes them flash
- Moving water **bends the cell** (shear stress: water sliding past water).
- That bending sends an **electrical signal** across the cell, a bit like a nerve.
- The signal lets acid flow into the scintillons. The drop in pH **unlocks the luciferin**, and the cell flashes.
- One flash lasts about **a tenth of a second**. Then the cell needs time to recover, and if you keep stirring, it **tires out** and flashes less.
- More shear (faster motion, closer to the stirring) means more cells cross their trigger threshold, so a **brighter** patch.

### 3. Why they do it: the "burglar alarm"
The leading explanation: when a small grazer (like a copepod) tries to eat dinoflagellates, the flashes light it up, so **bigger predators can see and eat the grazer**. The plankton call for help by making their attacker visible.

### 4. When and where you see it
- **At night, and best on a new moon.** Moonlight washes the faint glow out. Dinoflagellates also glow more at night by their internal clock.
- **In waves, wakes and stirred water:** breaking waves, boat wakes, swimmers, dolphins.
- **In enclosed bays.** Places like Mosquito Bay in Puerto Rico have a narrow mouth that keeps the plankton in and mangroves that feed them, so they reach huge numbers.
- **Everywhere in the deep sea.** Roughly three-quarters of the animals in the open water column can make light.

### 5. Other ocean light tricks (later modules)
- **Counterillumination:** some fish and squid glow on their bellies to match the faint light from above, erasing their shadow. Brighter moon → brighter bellies.
- **Vertical migration:** plankton rise at night and sink by day; moonlight changes how high they come.
- **Lunar-timed displays:** e.g. Bermuda fireworms glow in mating swarms a few nights after the full moon.

## How the project models it

| Real phenomenon | In the project | Where |
|---|---|---|
| A cell flashes when stirred | Each plankton/kelp has an **excitation** value, boosted when the player is near and moving | `src/systems/excitation.ts` |
| Shear is strongest near the stirring, weaker farther away | **Gaussian falloff** with distance | `disturbance()` |
| Shear is strongest in a swimmer's wake | The falloff is stretched into a **wake ellipsoid** behind the player, longer when faster | wake shape |
| Faster motion → more shear → brighter | Stimulus scales with **player speed** | `player.speed` |
| The glow fades, the cell recovers | Excitation **decays exponentially** (recovery slider) | `decayFactor()` |
| Currents and waves stir the water too | **Flow glow:** plankton in faster currents glow brighter | Currents tab |
| Blue light travels farthest in water | Electric-blue / cyan palette | cosmos-board palette |
| Glow scatters through water | **Bloom** post-processing (no real lights) | App shell |
| Enclosed bays concentrate glowing plankton | **Flood fill** finds water cut off from the open sea; those bays sparkle | Biomes & tides |
| Moonlight competes with the glow | Caustics kept dim; a global **`moonPhase`** from the orbiting moon | Caustics, Ocean planet |
| The "disturbance" can be anything that moves | The player is a glowing **jellyfish** swimmer | Disturbance tab |

## What we simplify (honestly)
- **Flash shape:** a real cell gives a quick spike (~0.1 s) followed by a recovery period. Ours rises smoothly while you're near and fades over about a second, which reads better as a *trail*.
- **No fatigue yet:** real cells flash less if stirred over and over. A small second value per plankton ("energy") could add this.
- **No threshold:** real cells only fire past a trigger level of shear; ours respond to any stirring, just more weakly far away.
- **No day/night clock yet:** in the real ocean the glow is stronger at night.
- **`moonPhase` isn't wired in yet:** it exists (the planet writes it), but it doesn't dim the glow or move the tide yet.
- **Scale:** one point stands in for many cells; real blooms hold millions of cells per litre.

## Natural next steps
1. **Moon phase → glow visibility** (full moon: brighter ambient + caustics, glow harder to see; new moon: darkest, glow strongest).
2. **Moon phase → tide** in Biomes & tides, so bays open and close with the moon.
3. **Threshold + fatigue** in the excitation rule, to make the flashes more realistic.
4. **Vertical migration and counterillumination** with species (modules 19–20).

## Related
[[excitation-and-player]] · [[vector-fields]] · [[biomes-and-flood-fill]] · [[shaders-caustics]] · [[spherical-mapping-planet]]
