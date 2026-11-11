# Hero art direction

Written 2026-11-10. Reference: `vault/assets/hero_art_direction_ref.png` (illustrations by other artists, e.g. Loish; **local only, never committed**).

## The brief (short)
A stylized, painterly illustration rendered in 3D: "a digital painting that moves". Dreamy, weightless, graceful, elongated poses (arms reaching up, pointed toes), simplified anatomy, minimal face (closed eyes, small nose), a few big flowing hair locks.

- **Palette:** near-monochrome blue. Ultramarine/cobalt shadows (`#1a2a9c`, `#2236b8`), periwinkle midtones (`#6f7fd6`, `#9aa6e8`), cyan to pale aqua near the light (`#5ec8e8`, `#bfeef7`). One warm accent: peach `#f2a48a`, only on the lit side of the skin. No pure black (darkest = deep navy). Constants: `src/style/palette.ts`.
- **Shading:** soft-stepped toon ramp, cool blue shadows (hue shift, not darkening), warm lit side, pale cyan fresnel rim, Worley caustics on up-facing surfaces, no specular.
- **Atmosphere:** turquoise near the surface → cobalt below, gradient fog, god rays, soft caustic shadow under the hero, bubbles, paper grain overlay, optional Kuwahara blur.
- **Motion:** slow, buoyant, eased; limbs on different phases; hair trails with lag.

## Built (hero)
`heroShader.ts` + `MoonChild.tsx`: lathe torso and tapered lathe limbs, pointed feet, hair cap + ribbon locks (follow-the-leader centre lines, camera-facing strips), closed-eye arcs, slow idle (arms take turns reaching up, one knee drawn up, bob, roll) blended into a slow swim. Sliders under **Hero look**: ramp steps, ramp softness, rim, warm accent, caustic scale/speed/amount, and a shader debug view (lighting ramp / caustic mask / rim mask). Camera moved closer (4.5 back, 1.8 up).

## The tension with the world
The world so far follows the cosmos board: **near-black water, light only where disturbed.** The new brief is **blue everywhere, no black, light from the surface.** Taken literally it would erase the core concept (the glow needs darkness to be seen).

**Proposal: the moon decides.** The painterly blue palette *is* the world, at a brightness set by `moonPhase`:
- **Full moon:** the brief's look. Turquoise surface glow, god rays, caustics, periwinkle water. The bioluminescence is washed out (real science: moonlight hides it).
- **New moon:** the same palette pushed down to deep ultramarine/navy (never black). God rays fade, and the glow trails pop.

So the art direction and "you are the disturbance" stop competing: they're the two ends of the moon cycle, and the story already goes from new moon (act 1) to moonrise (act 3).

## World changes, by cost
| Change | Cost | Notes |
|---|---|---|
| Palette swap (fog, background, seafloor ramp, plankton colours) to the blue family | Very low | Mostly constants |
| Vertical gradient background + gradient fog | Low | A big sphere with a gradient shader; fog colour by depth |
| Paper grain overlay | Very low | One post-processing effect (`Noise`) |
| Bubbles stirred by the hero | Low | Instanced sprites with an outline + highlight texture |
| God rays | Low–medium | Additive cone/plane meshes with a soft noise shader (cheaper than true volumetrics) |
| Soft caustic shadow under the hero | Low | A blurred blob decal with the caustic web |
| Toon shading on the seafloor/voxels | Medium | Reuse the hero shader's ramp |
| Kuwahara painterly blur | Medium–high (GPU) | Behind a debug toggle only |

## Built (world, 2026-11-10): the moon decides
Decision: the painterly blue palette is the world's palette, and `moonPhase` sets its brightness (new moon = deep navy, glow pops; full moon = the brief's turquoise look, glow washed out). Code in `src/modules/atmosphere/`:
- `moonLight.ts`: moon phase → surface colour, deep colour, exposure.
- `Atmosphere.tsx`: **Moon & atmosphere** sliders (moon phase, god rays, bubbles); a gradient dome that follows the camera (colour by view direction: up = surface, down = deep); fog takes the horizon colour every frame; colours are restored when you leave the dive tabs.
- `GodRays.tsx`: 9 open cones, additive, soft-edged by a facing term, fading along their length and with distance, flickering; wrap around the player like the plankton; strength ∝ moon².
- `Bubbles.tsx`: a pool of 240 recycled bubbles; spawn rate grows with swim speed; rise speed grows with size; wobble; canvas-painted outline + white highlight + warm reflection.
- Shell: **grain** slider (Noise effect, overlay blend).
- Hero: `uExposure` (0.35 at new moon → 1 at full moon) dims the painted body but not the rim.

Bug found on the way: `pow(x, 2.5)` in the god-ray shader returned NaN on this GPU for some pixels; bloom spread the NaN over the whole frame (black screen). Fixed with a clamp, `x²·√x` and a NaN guard. Lesson: **one NaN pixel + bloom = a black screen.**

Not done yet: soft caustic shadow under the hero (needs the seafloor), toon shading on the seafloor/voxels, Kuwahara filter, plankton glow dimmed by the moon.

## Painted seafloor test (2026-11-10)
**Seafloor look** dropdown (Seafloor map tab, and the World through it): Original vs. Painted (test). `seafloor/paintedTerrainMaterial.ts`: value = 0.65 × lighting + 0.35 × height + brush noise, posterized into 3 soft steps, coloured navy → ultramarine → cobalt → periwinkle → pale aqua, a touch of peach on flat lit ridge tops, faint caustics, × moon exposure, scene fog. Normals corrected for the vertical stretch with the inverse-transpose of the model matrix. Reads well at full moon (periwinkle, pale ridges) and at new moon (navy). The World's Caustics layer still adds its web on top (turn it down for a cleaner painted look).

## Why the hero still looks low-definition, and what it would take
**Why:** (1) it's ~20 separate pieces meeting at the joints, so elbows and knees show seams like a mannequin; (2) no real anatomy: hips, shoulders, hands and feet are tubes and tips; (3) the pose is sine waves, not gesture: illustrators draw a line of action, S-curves, foreshortening; (4) the shading is computed per piece, with no line work, brush texture or hand-chosen planes; (5) hair is flat ribbons, not clumped volumes; (6) the camera sees it small and from behind.

**Ways to close the gap:**
| Option | What | Cost | Stays procedural? |
|---|---|---|---|
| A. Procedural skinned body | One continuous mesh generated from the skeleton (lathe rings along the bones + skin weights → `SkinnedMesh`), so joints bend smoothly; better volumes (hips, chest, shoulders), mitten hands, feet | 1–2 days | Yes |
| B. Ink outline + brush texture | Inverted-hull outline in navy (like the line work in the refs) + painted noise in the shader | ½ day | Yes |
| C. Painterly post filter (Kuwahara) | Turns the whole frame into flat brushy patches; hides low detail everywhere | ½ day (GPU-heavy, toggle) | Yes |
| D. Modeled base mesh (Blender / CC0 base) | A stylized sculpted body + rig as GLTF; the genome becomes shape keys (morph targets); our procedural animation drives its bones; our shaders paint it | 2–4 days + Blender skills | Partly ("procedural variation over a base", how game character creators work) |
| E. SDF spirit body | The body as blobs melting into each other, raymarched in a shader; seamless and soft | 2–3 days, GPU-heavy | Yes |

Recommendation: **A + B (+ C as a toggle)** keeps it fully procedural (good for module 19) and gets most of the way; **D** if the goal is to match the illustrations closely and Blender is an option.

## Built: A + B (2026-11-10)
- **A, procedural skinned body** (`disturbance/bodyRig.ts`): a three.js `Skeleton` (hips, chest, head; shoulder/elbow/wrist; hip/knee/ankle) in a rest pose; one tube of rings per chain (torso + neck + head, each arm, each leg) whose radius follows a Catmull-Rom profile (waist, chest, neck flowing into the head via a smooth max, flat palms, calves, pointed toes; elliptical rings); skin weights blend between the two bones around each joint (linear blend skinning), so elbows, knees, waist and neck bend smoothly. Rendered as a `SkinnedMesh`; the toon shader got three.js's skinning chunks. The spine arches and the head looks up at the light as an arm reaches: a simple line of action.
- **B, ink + brush**: the same skinned mesh drawn again as an **inverted hull** (inflated along the normals, back faces only, dark ink blue, constant screen width, gently varying thickness); **brush strokes** = stretched value noise in the bind pose (so it sticks to the skin) nudging the light before posterizing, which makes step edges ragged. Sliders: **ink outline**, **brush strokes**; shader debug gained **Brush strokes**.

## C explained: the Kuwahara filter (not built)
A post-processing filter that makes the whole frame look like an oil painting. For each pixel it looks at **four small squares around it** (up-left, up-right, down-left, down-right), measures in each the **average colour** and **how much the colours vary**, and outputs the average of the **calmest** square. Inside flat areas this smooths everything into patches; at an edge, the calmest square is the one entirely on one side, so **edges stay sharp** instead of blurring. Patches + sharp edges = brush strokes.

**Why it's expensive:** it runs for *every pixel, every frame*, and each pixel reads many neighbours. With a radius of 5, each square is 6×6 = 36 pixels, so ~144 texture reads per pixel (×2 to measure variance). At 1920×1080 that's ~2 million pixels × ~150 reads ≈ 300 million reads per frame, ~18 billion per second at 60 fps. Bloom, by comparison, does a handful of reads per pixel on downsized images. The nicer **anisotropic** version (strokes that follow the image's edges) adds a structure-tensor pass and 8 sectors with weights: several times more.

**How to make it affordable:** run it at half resolution (4× cheaper); use a small radius; or the **box-filter trick**: blur the image and the image² once with a cheap separable box blur (2 passes), then each quadrant's mean and variance are just 4 offset reads of those blurred images: ~8 reads per pixel instead of ~150.

**The catch for this project:** Kuwahara erases tiny bright details: plankton points, bubbles and thin glow trails sit in "noisy" squares and get averaged away. The glow is the core concept, so it would need to run only on the background/terrain layer, or at a very small radius, or behind a toggle for "painting mode" screenshots.

## Update (2026-11-11): a darker night
The resting world was too bright: the disturbance didn't stand out. New shared value `night.light` (`src/systems/night.ts`), set each frame by the atmosphere:

`light = 1 − darkness × (1 − moon)`   (darkness slider, default 0.85 → 0.15 at new moon, 1 at full moon)

Everything lit or glowing **on its own** is multiplied by it: the seafloor's lights, the caustic web, calm plankton (rest + flow glow), resting kelp, and the water colour (dome + fog, kept ≥ 30% so it's never pure black). The glow from **excitation is not**, so on a dark night calm water is black and only your trail lights up. As reefs wake and the moon rises, the world slowly becomes visible: the story's light arc, for free. Lab tabs without the atmosphere keep `light = 1` (unchanged).

### Play mode: pitch black + the child's light (2026-11-11)
- Play forces `darkness = 1` (`night.minDarkness`) and lets the water drop to 4% (`night.waterFloor`); fog 0.08. At new moon the resting light is 0: only her light and the glow she stirs up are visible.
- **RevealLight** (`src/modules/atmosphere/RevealLight.tsx`): ONE point light travelling with the child. Reach = 4 + 5 × swim, intensity ∝ (1 − night.light) × (0.5 + 0.5 × swim): faster = you see further; it fades out as the moon rises. Slider *child light*. This is **line of sight / fog (module 25)** in its simplest form: you only see what's near you and lit.
- Resting light now follows **moon²**: the first reefs barely brighten the sea; the light really arrives near full moon.
