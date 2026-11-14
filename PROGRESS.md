# Mission Tycoon: progress log

**Live link:** https://userbiznes.github.io/mission-tycoon/
**Repo:** https://github.com/userbiznes/mission-tycoon

Updated after each milestone: what works, what's next.

---

## M0: Style lock ✅ (Sat Nov 14)

**What works**
- Vite + TypeScript + React + react-three-fiber scaffold; `npm run dev / build / test / shots`.
- GitHub Actions workflow builds, tests and deploys to GitHub Pages on every push to `main` (relative `base`, so the path never matters).
- Portrait-first shell: full-screen on phones, centred phone-shaped frame on desktop.
- Fixed-angle diorama camera (FOV 30°, ~44° tilt): one-finger pan with momentum, pinch / wheel zoom (clamped), `rig.flyTo()` for smooth focus, cinematic override and shake hooks ready for the launch.
- World: grassy coastal headland with a sandy beach, grassy bank, a bay, animated stylised water (depth colours, rolling foam bands, drifting glints), gradient sky dome, drifting puffy clouds.
- Lighting: warm sun with soft shadows that follow the camera, sky/ground hemisphere bounce, N8AO ambient occlusion, bloom on emissive lights only, tone mapping.
- Art pipeline: one palette file (`src/art/palette.ts`), a procedural modelling kit of rounded primitives (`src/art/kit.ts`) that merges each model into 1–3 draw calls, and a model registry (`src/art/registry.ts`) so any model can be swapped for a GLB later.
- Hero model at full polish: the old Launch Pad (rusty service tower with ladder, crane and blinking beacon, cracked apron with weeds, launch table with hazard blocks, flame trench, oxidiser sphere, fuel tank, patched hut, floodlight masts, wind sock, steam puffs) and the stubby rocket (three kinds: rideshare, small, medium).
- Instanced props: round trees, pines, palms, bushes, rocks, grass tufts, flower patches; sandy path network to every plot.
- "Low quality" mode (`?low=1`) turns off post-processing and halves the shadow map.

**Decisions**
- Tone mapping: compared ACES, AgX and Khronos Neutral on the hero shot. Neutral keeps the palette warm and saturated; AgX and ACES washed the greens out. Using Neutral.
- The base sits on a long, narrow headland so the whole spaceport, both beaches and the sea fit a portrait screen at the default zoom.
- Clouds drift only over the sea rows so they never hide a building.

**Next: M1** — the other four starting buildings (old versions), construction plots, tap → bottom sheet, HUD.
