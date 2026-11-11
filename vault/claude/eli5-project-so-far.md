# ELI5: the procedural atlas, tab by tab

Simple explanations of every piece of the world, in tab order. Speaker notes for the presentation; details are in the concept notes linked under each one. The one-page overview is [[procedural-atlas-overview]].

## 🌍 Ocean planet (module 6: spherical mapping) — the atlas cover
**ELI5:** A computer can't draw a perfect ball, only lots of flat triangles glued together, like a soccer ball. *How* you glue them matters:
- **UV sphere:** like the lines on a globe. Easy, but all the lines squeeze together at the poles, so the triangles there get tiny ("pinching").
- **Cube sphere:** puff up a cube like a balloon. No poles, but the corners get crowded.
- **Icosphere:** puff up a 20-sided die. The most even triangles.
- **Fibonacci sphere:** place dots in a sunflower spiral so each gets the same space.

Debug paints each triangle by size, so you can *see* the pinching (UV: the tiniest triangle is 7.7× smaller than the biggest; Fibonacci: only 1.6×).

**Maps on a ball:** a flat world map is "how far around" (longitude) × "how far up" (latitude). Wrapping it onto the ball works, but the top and bottom rows get squished into tiny circles at the poles, and the left and right edges meet in a **seam**. That's why noise sampled *on the ball itself* looks better. The view switch **curls the flat map up into the planet** and back, like a sheet of paper wrapping around a ball that keeps shrinking.

**The moon** goes around the planet. How much of it looks lit (its **phase**) depends on where it is compared with the sun: opposite the sun = full moon, between us and the sun = new moon. That number becomes the world's `moonPhase`.

→ [[spherical-mapping-planet]]

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

## 🧊 Voxel reef (modules 7–8: voxels)
**ELI5:** A pixel is a little square; a **voxel** is a little cube, like LEGO or Minecraft. Instead of "how tall is the ground here?", we ask every cube in a big box: **"rock or water?"** A heightmap can only make hills; voxels can make **caves and arches** (rock above water above rock). 3D noise decides rock vs. water.

**Smart drawing:** a cube face that touches another rock cube is buried and nobody can see it, so we skip it. That skips **about 90% of all faces**. The build button fills the box layer by layer; the slice slider cuts it open to look inside the caves, where little lights live.

→ [[voxels]]

## 🏔️ Erosion (module 10)
**ELI5:** Pour water down a sandcastle: it rushes down, scrapes sand where it's fast, and drops it where it slows down. Do that tens of thousands of times and you get channels and smooth fans of sand. Underwater the same thing happens with **turbidity currents**: underwater avalanches of muddy water that carve **submarine canyons**. Each tiny "flow" runs downhill, picks up sediment when fast and steep, and drops it when it slows. You can watch it happen live; debug paints **amber where it dug** and **cyan where it piled up**.

Fun fact: the old CLASS_03 version had a sign mistake, so drops *slowed down* going downhill. Fixed.

→ [[erosion]]

## 🏝️ Biomes & tides (module 11: biomes, flood fill)
**ELI5:** **Biomes:** give every spot on the map a label using simple rules: "deep and flat → abyssal plain", "shallow and gentle → reef", "too steep → cliff", "deep near a hot spot → vent field". Or just by depth: sunlit, twilight, midnight, abyss, trench.

**Flood fill** is the paint-bucket tool: start somewhere and keep spreading to neighbours that match until you can't anymore. We pour the "open ocean" in from the edges of the map. Any water it **can't reach** is cut off from the sea: an **enclosed bay**. Real glowing bays (like Mosquito Bay in Puerto Rico) are exactly that, so our bays sparkle. Move the **tide** and bays open or close. Allowing diagonal moves (8 neighbours) lets water sneak through more gaps.

→ [[biomes-and-flood-fill]]

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

## 🎨 Caustics (shaders)
**ELI5:** The graphics card is a huge team of tiny painters, one per pixel, all painting at the same time. A **shader** is the instruction card every painter gets: "work out the colour of *your* pixel". When moonlight passes through wavy water it makes a dancing web of bright lines on the seafloor (**caustics**). Our card says: "find your nearest and second-nearest invisible dot; if you're about equally far from both, you're on a border, so glow." That's Worley noise on the GPU, with the dots drifting so the web dances. Debug shows the invisible cells behind the web.

→ [[shaders-caustics]]

## ✨ Disturbance (the core idea: "You are the disturbance")
**ELI5:** You're a glowing **jellyfish**. Every plankton (and kelp) has a **"how stirred up am I?"** number. When you swim close, the number goes up; when you leave, it slowly sinks back to zero. **Brightness = that number**, so you leave a trail of light that fades to black, like real glowing plankton.

The stirred water is shaped like a **wake**: a long egg stretched out *behind* you, longer the faster you swim (the old version was a plain ball, because it only looked at distance). The jellyfish's bell pulses and leans where you go; each tentacle is a chain of dots that just follows the dot in front of it, so the tentacles trail behind naturally.

→ [[excitation-and-player]]

## 🌊 World
**ELI5:** The dive view: all the pieces in one ocean. Seafloor with moonlit caustics, kelp, reefs and migration routes, currents full of plankton, and you, the jellyfish, lighting it up.

## ☁️ Backend (module 4: Firebase)
**ELI5:** The app lives on Google's computers, so anyone can open it at **bioluminescent-ocean.web.app**. "Deploying" = uploading the newest version. Later, Firebase can also save things like your favourite world seeds.

→ [[firebase-hosting-setup]]

---
