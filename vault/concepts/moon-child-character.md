# Moon child: procedural character (species, module 19)

The story's main character: a small being fallen from the moon into the dark sea. It replaced the jellyfish as the default player body (the jellyfish stays as a choice in **Player body** and will become a species of the world). Code: `src/modules/disturbance/MoonChild.tsx`.

## Why a silhouette
From the [[design-reference-cosmos-board]]: a tiny dark figure against the light (the diver beside the whale), and edges that glow (leaves lit only at their rims). Mammals and humans don't glow; in real bioluminescent bays they're seen as **outlines of light** drawn by the plankton they disturb. So the hero is dark, and the water reveals them: "you are the disturbance", literally.

## How it's built (four simple ideas)
1. **Skeleton = a tree of joints.** Waist → chest → head; shoulders → elbows → hands; hips → knees → feet. Each joint is a group; rotating it swings everything below it (like real bones). Bones are capsules hanging from their joint.
2. **Procedural animation = sine waves, no keyframes.** One *stroke phase* advances faster when swimming. Two poses are computed from it:
   - **idle:** floating, arms drifting out, knees drawn up (like a sleeper in water);
   - **swim:** breaststroke arms (reach over the head, sweep to the sides) and a flutter kick (legs half a cycle apart).

   They're blended by speed: `angle = idle + (swim − idle) × s`, with `s` = smoothed speed in 0…1. Slowing down melts back into floating. The body is also **pitched** so the head leads the motion: `θ = atan2(−forward speed, vertical speed)`, blended toward upright when still.
3. **Rim (fresnel) shader.** A custom GLSL material: colour = dark body + rim colour × (1 − |n·v|)^p, where n is the surface direction and v the direction to the camera. Facing you → dark; turning away (the outline) → bright. Values above 1 bloom, so the outline glows like moonlight.
4. **Hair = follow-the-leader chains,** the same rule as the jellyfish tentacles: root glued to the head; every other point drifts (streams back when swimming, floats up and spreads into a halo when still, sways) and is pulled back to a fixed distance from the point before it. Roots are spread over the crown and back of the head with the **golden angle**, so they never line up.

Plus the **heart:** a small piece of moonlight in the chest, drawn through the body (depth test off), beating slowly. Hair, rim and heart brighten a little while swimming.

## The genome (sliders)
height · head (bigger = younger proportions) · limbs · hair strands · hair length · hair float · rim. **The class idea: a species is a set of parameters; character creation is a function from parameters to a body.**

## Debug view
Amber skeleton (joint to joint, drawn on top) and the hair chain points, plus the wake shells.

## Cost
~13 capsules (one shared material) + 28 hair strands × 14 points of simple maths per frame. About the same as the jellyfish.

## Update (2026-11-10, art direction)
Rebuilt after [[hero-art-direction]]: the capsules became **lathes** (a torso with waist and chest, tapered limbs, pointed feet), the fresnel-only silhouette became a **painterly toon shader** (soft-stepped ramp, blue shadows, peach lit side, cyan rim, caustics), and the 1-pixel hair strands became a few **ribbon locks** (the same chains, with a camera-facing strip built around them). A minimal face (closed-eye arcs, small nose) and a slower, dreamier pose (arms reaching up in turns).

## Update (2026-11-10): skinned body + ink
The separate lathe pieces became **one procedural skinned mesh** (bodyRig.ts): rings along a bone skeleton, smooth radius profiles, skin weights blending two bones around each joint. Plus an **inverted-hull ink outline** and **brush-stroke** noise in the shader. See [[hero-art-direction]] (also explains the Kuwahara filter and why it is expensive).

## Next
- The heart could follow the moon (brightest at new moon; story: the moon is dark because its child fell).
- NPC species from the same parts (jellyfish, fireworm, lanternfish).

Related: [[excitation-and-player]], [[final-presentation-plan]], [[shaders-caustics]]
