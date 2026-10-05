# React Three Fiber vs. vanilla three.js

**Status:** accepted on 2026-10-04: React Three Fiber + drei + leva + zustand + @react-three/postprocessing. No class requirement either way.

## Context
The class has no requirement either way. The project needs sliders, dropdowns, tooltips and a debug layer for every module, many independent systems, bloom, instancing and custom shaders. The CLASS_03 prototype used vanilla three.js inside one big `useEffect`.

## The core difference
Both use the same three.js underneath. The difference is **how you describe the scene**.

- **Vanilla (imperative):** you write step-by-step commands: `new Mesh()`, `scene.add()`, change properties by hand, and remember to `dispose()` and remove things.
- **R3F (declarative):** you describe what should exist as JSX (`<mesh>`). React adds, updates and removes objects as state changes. `useFrame` is your per-frame loop.

## Comparison
| | Vanilla in React | React Three Fiber |
|---|---|---|
| Learning three.js itself | Very explicit; you see every step | The same concepts, slightly hidden |
| Modularity (one system per module) | You build your own structure: init/update/dispose for each system | Each system is a component: `<Seafloor/>`, `<Currents/>`, `<Plankton/>` |
| Sliders / dropdowns / tooltips | lil-gui: manual wiring and regenerate callbacks | leva: `useControls()` with automatic re-rendering; it supports dropdowns and `hint` tooltips |
| Toggling a debug layer | Add/remove objects by hand | `{debug && <Arrows/>}` |
| Bloom / postprocessing | EffectComposer setup by hand | `<EffectComposer><Bloom/></EffectComposer>` |
| Ready-made helpers | Write them yourself | drei: cameras, controls, Instances, text, stats… |
| Cleanup / memory leaks | Your responsibility | Automatic when a component unmounts |
| Performance | Full control | The same, *if* per-frame changes go through refs in `useFrame` instead of React state |
| Tutorials | three.js docs and examples map 1:1 | You translate examples (easy once you know the pattern) |

## The main pitfall with R3F
Never store fast-changing values (positions, excitation every frame) in React state. Changing state 60 times per second re-renders React and gets slow. Mutate refs or buffers inside `useFrame` instead. React state and zustand are for settings (sliders, moonPhase), not animation.

## What stays the same either way
All the procedural code (noise, erosion, vector fields, flood fill, sampling) is plain TypeScript working on arrays. It doesn't care which you pick. Keep it in pure modules (`src/systems/*/`) so the decision only affects the rendering layer.

## Recommendation
Use **R3F + drei + leva + zustand + @react-three/postprocessing**. The class requirements (UI for every module, toggleable debug views, many plug-in systems, bloom) are exactly where R3F saves the most boilerplate. Learning cost: about one session to get used to the JSX scene pattern and `useFrame`.
