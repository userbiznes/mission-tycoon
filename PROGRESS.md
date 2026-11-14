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

---

## M1–M4: Base, onboarding, market, rules engine, first full mission ✅ (Sat Nov 14)

**What works**
- **Base:** all eight buildings (five old starters, three to build on plots), paths, props, tap → wobble → fly-to → drawer with Status / Crew / Upgrade / Tasks tabs. HUD with agency logo, level, XP bar and coins; rewards fly to the counters.
- **Onboarding:** title over a live beauty shot, name and agency, logo builder (4 shapes × 6 icons × 10 + 10 colours, Skip = random). The logo is on the HQ sign, the flag, the truck, the satellite and every rocket.
- **Parts Market:** seven stalls; Buy now (+30%, instant) vs Order (cheaper, a truck drives in with it); inventory.
- **Rules engine (`src/sim`, 56 unit tests):** the six bars with sunlight and shadow power checks, slot limits, pointing requirements, budget and reserve, lifetime, part locks, GO / NO-GO per seat, day-by-day mission simulation, event cards with previews, stars, ranked debrief reasons, payout, XP, closest real NASA mission, in-orbit production, lab rules.
- **Builder:** 3D turntable, tap or drag parts on (they pop into place), six live bars with one-line reasons, "Why?" for every bar, free test run that predicts the stars.
- **Launch prep:** orbit, rocket, ground stations, mass gauge, GO / NO-GO poll; you can launch over a NO-GO.
- **Launch cinematic:** countdown, hold-to-fire, liftoff with flame, smoke, shake and a chase camera, stage separation, burn at the top, sky fading to space, real altitude and speed readouts. Autopilot always available. A sloppy flight costs orbital life.
- **Operations:** stylized procedural globe with orbit ring, satellite, ground stations and contact beam; time-lapse; data pipeline strip with the slowest link in red; Reigns-style swipe decision cards.
- **Debrief:** 0–3 stars, top three reasons with fixes, payout breakdown, XP, closest real NASA mission, "Fix and relaunch" / "Back to base".

## M5–M7: Tour, economy loop, depth ✅ / partly (Sat Nov 14)

- **Tour:** Chief Rocco's eight-stop scripted tour with a camera move and one real action per stop; contextual tips shown once each (shadow, bottleneck, overweight, test run, construction, lab, orders, storage).
- **Economy loop:** satellites stay in orbit for their lifetime and send raw data every in-game day; the Comms Center stores it (overflow is lost); the Science Lab runs recipes on NASA's data levels; products sell or fill small orders at Mission Control; construction on plots; upgrades.
- **Depth:** crew hiring and the four mission seats (their skills change science, mass, launch window and downlink), five event cards, three fully specified campaign missions (First Light, Fire Watch, Storm Chaser) plus Moon and Mars as stretch data, agency levels that unlock parts, rockets, orbits and stations.

## Landscape redesign (Sat Nov 14, by request)

The game was first built portrait (per the original brief) and then turned to **landscape**: the island now runs left to right with the pad at the right end, sheets are side drawers, and the builder, launch prep, launch, operations and debrief are column layouts. A phone held upright is asked to turn sideways.

## Free placement and the overgrown island (Sat Nov 14, by request)

- **Bigger island** (about 45 × 85 units) with a pond, a cove, a headland, a wooded rim and a wooden pier where deliveries come ashore.
- **Free placement on a build grid:** no fixed plots. New buildings come from the **Build** menu and go anywhere they fit; press and hold any building (or use **Move** in its drawer) to pick it up. Green footprint = fits, red = blocked.
- **Abandoned start:** only the five old buildings needed for the first mission stand, surrounded by overgrowth (thickets, boulders, stumps, dead trees, rusty scrap). Tap a piece to clear it for a few coins and win back the land.
- **Roads grow on their own:** a dirt track is routed from the pier to every front door and re-routes whenever something moves; the delivery truck follows it.
- **Decision cards** are now two plain buttons (the swipe gesture was removed).
- **Character portraits:** the game loads `public/characters/<id>.png` when present (falls back to the built-in drawings) and labels them "AI-generated". Prompts are in `docs/character-prompts.md`.

## Layout rework from reference study (Sat Nov 14, by request)

Studied the eight official store screenshots of a leading farm-builder for genre conventions (not copied: all art here is original). What changed:

- **Symmetric three-quarter camera** (45°) and **mixed building facing**; a Rotate button in placement turns a building's door down-left or down-right.
- **No roads.** The auto-routed dirt tracks are gone; buildings stand on a clean, brighter lawn.
- **The Parts Market stands on a dock**: a plank deck on posts over the shallows with rope posts, crates and a jetty. Orders arrive by **cargo boat** (the truck is retired). The market is a fixed landmark and cannot be moved.
- **The island opens from west to east.** Only the Old Spaceport zone is open at the start; East Meadow (level 2, 600 coins) and Far Point (level 3, 1,500 coins) sit behind fences with a padlock sign and wild woods until opened.
- **Shop tray**: the Build button is bottom-left and opens a tray of blueprints along the bottom.
- The starting buildings are grouped near the dock so the whole spaceport and the dock fit the opening view.

## Buildings, quay and dialogue redesign (Sat Nov 14, by request)

- **Every building redesigned** as one bold shape in its own colour with a signature feature: blue control tower (Mission Control), teal barrel hangar with a satellite at the door (Integration Bay), one enormous white dish (Comms Center), orange dockside depot with a gear-and-wrench sign (Parts Market), white observatory dome on a violet drum (Science Lab), slate workshop with a saw-tooth roof and a turning gear (Engineering Lab), green-roofed log cabin with a washing line (Crew Quarters). All in `src/art/models/buildings.ts`.
- **The quay rebuilt** along the shore: plank deck with visible gaps, heavy rope posts, a pier, a yellow cargo crane, stacked crates and barrels; the market faces the water and the delivery boat ties up under the crane.
- **Dialogues** now show the character large on the left over a dimmed scene with a big speech bubble on the right; while the player is asked to act, a small prompt bar and an arrow take over. Rocco's portrait slot (`public/characters/rocco.png`) is now a waist-up figure.

**Decisions and cuts**
- Tone mapping: Khronos Neutral (see M0).
- The mission globe is procedural (no Blue Marble texture), so the game ships with no external imagery at all.
- The launch grant is paid at launch, not when a contract is taken, so it cannot be farmed.
- **Cut (per the brief's cut order):** the Engineering Lab's research and test campaigns (the building can be built but has no function yet), crew posted to buildings, pass-and-play team mode, sandbox and versus.
- Two background helpers (art and rules) were stopped early by a usage limit; their finished work was merged and the rest was completed in the main thread.

**Next: M8** — final polish pass, a phone test on a real device, and submission.
