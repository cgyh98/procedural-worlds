# ELI5: the project so far (and what's next)

Simple explanations of every piece of the world, in the order of the tabs. Useful as speaker notes for the presentation. Details are in the concept notes linked under each one.

## 🧱 Scene shell (modules 2–3: React + three.js)
**ELI5:** Think of a theatre. **three.js** is the stage, the lights and the camera: it draws 3D things on the screen. **React** is the stage manager: it decides which props are on stage right now. Every tab is a different set of props swapped onto the same stage. The **sliders panel** is the lighting desk, and every slider has a little label (tooltip) explaining what it does.

**Extras:** the **fog** makes far things fade into the dark, like looking through deep water. **Bloom** makes bright things bleed a soft halo of light, which is how *everything* glows in this world (no real lamps, just "very bright pixels get blurred").

## 🗺️ Seafloor map (modules 5 + 9: noise, heightmaps, 2D maps)
**ELI5:** Take a sheet of graph paper and write a number in every square: how high the ground is there. That's a **heightmap**. Color the squares by their number and it's a **map**; push each square up by its number and it's **terrain**. The *view* switch animates between the two: same numbers, two pictures.

**Where do the numbers come from?** From **noise**: "random, but smooth", like rolling hills instead of TV static. Three kinds to compare:
- **Perlin:** smooth hills.
- **Simplex:** the same idea on triangles; a bit cheaper and more natural.
- **Worley:** scatter dots and measure "how far to the nearest dot", which makes cells and pits like vent fields.

**fBm:** stack several layers of noise, big hills plus medium bumps plus tiny pebbles, the way real landscapes have detail at every size. **Ridged** flips the noise so soft hills become sharp crests: mid-ocean ridges.

→ [[heightmaps-and-noise]]

## 🌊 Currents (modules 12–14: vector fields)
**ELI5:** Imagine every spot in the water has a tiny arrow saying "the water goes *this* way, *this* fast". All those arrows together are a **vector field**. Drop a speck of plankton in, and each moment it takes a little step in the direction of the arrow under it. That's **advection**. Thousands of specks doing this make the invisible current visible.

Three kinds of arrows:
- **Uniform:** all arrows the same, a steady stream.
- **Vortex:** arrows going round and round, a whirlpool.
- **Curl noise:** swirly arrows made from noise. It has a special property: water never piles up in one spot or leaves holes, just like real water.

The plankton live in a box that **wraps around**: swim out one side, come back in the other, so the ocean feels endless. Plankton in faster water glow brighter. **Debug** draws the arrows themselves.

→ [[vector-fields]]

## 🌿 Kelp distribution (modules 15–16: populations, distribution over maps)
**ELI5:** You have to plant kelp. Three ways:
- **Random:** close your eyes and throw seeds. You get clumps and empty patches.
- **Jittered grid:** draw a grid and drop one seed somewhere in each square. More even, but neighbours can still end up touching.
- **Poisson disk:** "No two plants closer than r." It looks natural, like plants politely sharing space. We measured it: random had two plants 0.019 apart; Poisson's closest pair was exactly r.

Then the **map decides** where kelp may live: only in the **shallows** (kelp needs light) and only where the ground isn't **too steep** to hold on. Each kelp is a thin glowing strand that sways, and it lights up when you swim past.

→ [[distributions]]

## 🕸️ Reef paths (modules 21–22: networks, nodes and paths)
**ELI5:** The reefs are **towns** (nodes). First decide which towns get a road (edges):
- **Minimum spanning tree:** connect every town with the least road possible, no loops.
- **Gabriel graph:** connect two towns if nobody else stands in the circle between them, which gives natural loops.
- **k nearest:** each town connects to its k closest neighbours.

Then build each road over the hills. Every step costs effort, and **climbing costs extra**, so roads curve around ridges and follow valleys, like animals saving energy.
- **Dijkstra:** explore outward in every direction until you hit the goal. It always finds the best road, but searches a lot.
- **A\*:** the same, but with a compass pointing at the goal, so it searches mostly in the right direction. Same best road, less searching. **Debug** shows every square each method searched.

Glowing sparks travel the roads: creatures migrating between reefs.

→ [[paths-and-networks]]

## ✨ Disturbance (the core idea: "You are the disturbance")
**ELI5:** You're a little glowing creature. Every plankton (and kelp) has a **"how stirred up am I?"** number. When you swim close, the number goes up (more if you're fast and very close); when you leave, it slowly sinks back to zero. **Brightness = that number.** So you leave a trail of light behind you that fades to black, exactly like real glowing plankton that flash when the water moves.

Swimming has **inertia and drag**: you speed up when you push and the water slows you down. The camera follows behind you, smoothly.

→ [[excitation-and-player]]

## 🌍 World
**ELI5:** All the finished pieces in one ocean: seafloor, kelp, reefs and migration routes, currents full of plankton, and you swimming through it, lighting it up.

## ☁️ Backend (module 4: Firebase)
**ELI5:** The app lives on Google's computers, so anyone can open it at **bioluminescent-ocean.web.app**. "Deploying" = uploading the newest version. Later, Firebase can also save things like your favourite world seeds.

→ [[firebase-hosting-setup]]

---

# Added since (2026-10-05)
Shaders and voxels below are now built: see [[shaders-caustics]] and [[voxels]].

# Next (at the time of writing)

## 🎨 Shaders: moonlight caustics on the seafloor
**ELI5:** The graphics card is a huge team of tiny painters, one per pixel, all painting at the same time. A **shader** is the instruction card every painter gets: "work out the color of *your* pixel". When moonlight passes through rippling water it makes a dancing web of bright lines on the seafloor (**caustics**, the blue web from the board). Our card says: "find your nearest and second-nearest invisible dot; if you're about equally far from both, you're on a border, so glow." That's **Worley noise** again, now on the GPU, with the dots drifting so the web dances. Sliders for size, speed, brightness, sharpness; debug shows the raw cells.

## 🧊 Voxels: a reef with caves and arches
**ELI5:** A pixel is a little square; a **voxel** is a little cube, like LEGO or Minecraft. Instead of "how tall is the ground here?", we ask every cube in a big box: "rock or water?" A heightmap can only make hills; voxels can make **caves and arches** (rock above water above rock). 3D noise decides rock vs. water, and we only draw the cube faces you can actually see (faces touching other rock are hidden), which saves most of the work. Debug shows the grid and how many faces were skipped.
