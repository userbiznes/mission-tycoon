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
- **Character portraits:** the game loads `public/characters/<id>.png` when present (falls back to the built-in drawings). The "AI-generated" label under each portrait was removed on 2026-11-15 at the user's request; the Crew sheet's footnote still says the portraits are AI-generated. Prompts are in `docs/character-prompts.md`.

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

## Dock and Parts Market rebuilt (Sat Nov 14, by request)

- **Parts Market is now one timber market hall** (`src/art/models/partsMarket.ts`): a chunky hipped red roof with a front gable, a hanging "Parts Market" sign under the agency crest that sways on its chains, one long striped canvas awning with real thickness, a scalloped edge and a sag, a front counter, lanterns and strings of bulbs. Two small stalls flank it, turned in towards the yard. The sand patch and the umbrella are gone.
- **The goods are drawn far bigger than life so they read at game zoom**: folded solar arrays, dish antennas, camera lenses, battery cells, crates stencilled with icons, and a satellite turning on a display stand. The shared pieces live in `src/art/models/cargo.ts`.
- **The dock** (`src/art/models/dock.ts`): boards of different lengths and tones laid slightly uneven with ragged ends, chunky rope-wrapped pilings, sagging rope rails, lantern posts, a life ring, a ladder, floats and buoys, and cargo in tidy stacks. Soft foam rings spread from every piling, buoy and the boat's hull.
- **The pier now runs west**, into the open bay, so the pier head, the crane and the moored boat all show in the home view (it used to run off the bottom of the screen). The home camera sits a little lower and wider to take the whole harbour in.
- **The cargo boat lives at the pier head.** When a part is ordered it sails off, comes back down the west shore as the order falls due, and the yellow crane swings a crate from its deck onto the pallet. The tour's delivery stop frames the harbour and waits for the lift before Rocco speaks.
- The two cloud rows nearest the camera were moved out to sea: they used to drift across the dock and hide it.

## The lost spaceport: locked regions redesigned (Sat Nov 14, by request)

The fences, the padlock signs and the uniform forest are gone. The island now tells a story: decades ago an old agency ran the whole of it, the money ran out, and the jungle took it back. The player reclaims it one region at a time.

- **Three regions behind natural borders** (`src/scene/relief.ts`): a creek that wanders from the north shore to the south, a rocky ridge, and a change in the trees. No straight lines.
  1. **Old Tracking Station** (level 3), north forest, on a hill. From the base: the rim of a giant rusty dish above the canopy, wrapped in vines. Restored: a second, bigger dish, so the home link gets twice the passes and far more data per pass. "Why?" tip: dishes stand on high ground for a clear view of the horizon.
  2. **Science Annex ruins** (level 5), central forest. A collapsed glass dome with a tree growing through it, and a buckled radio mast. Restored: the Fire Map and Cloud Map recipes open and the Engineering Lab can be built.
  3. **Heavy Launch Complex** (level 7), far east tip. A tipped-over launch tower and a cracked flame trench. Restored: the Medium rocket and the Moon Ice Mapper contract. "Why?" tip: big rockets fly east over open sea.
- **How locked land looks:** a denser, darker wall of jungle giants, fallen logs and mossy boulders along the borders; woods that differ by region (pines on the hill country, broadleaf in the middle, flat-topped scrub in the east) with clearings, ferns and dead trees; muted colours, soft drifting mist and birds over the canopy; and each ruin's silhouette above the trees. One chunky expedition signpost per region (its padlock badge shows on hover, see Nov 15).
- **Unlock flow** (`src/state/regions.ts`, `src/ui/RegionUi.tsx`): tap the signpost for a card with a live picture of the ruin, the level and the reward → at the level the badge bounces with a "!" and Rocco calls it out → **Clear the way** (coins, 2 crew, a timer that respects Fast mode): trees topple with a squash and a puff and leave log piles, a little bulldozer works the brush, a footbridge goes over the creek, the mist rolls back and the colours brighten → **ruins revealed** with a Restore button (coins plus cable spools, steel beams and a control panel from the market's new Materials stall) → scaffolding, crew, timer → the building pops in clean with confetti, a haptic buzz and Rocco's memory of the place, and the feature unlocks → the land joins the base and can be built on.
- **Technical:** each region's state is saved (`locked → available → clearing → ruins → restoring → active`). The forest is instanced (about 570 plants in 8 meshes, roughly 137k triangles); clearing fells them tree by tree, working out from the signpost. Ruin and restored versions come from one factory per landmark (`level: 0` is the ruin). The muted look is one shader patch shared by the terrain and the model materials, driven by a small baked region map.
- **Balance changes that come with it:** the Medium rocket and the Moon contract moved from level 4 to level 7 behind the Heavy Launch Complex; Fire Map, Cloud Map and the Engineering Lab now wait for the Science Annex; levels 7 and 8 were added. The old East Meadow / Far Point zone purchases are gone. The save version was bumped, so existing saves start over.
- **Not done:** Splashdown Cove (the level 9 stretch). Paths were not added (roads were removed earlier by request); footbridges over the creek connect the reclaimed land instead. "Send 2 crew" is shown, not charged: the two workers do not come out of the hired crew.

## Level badges on hover, Rocco's artwork (Sun Nov 15, by request)

- **The "Level 3 / 5 / 7" badges over the locked regions show only on hover.** They are tooltips now: out of sight until the mouse rests on a region's ruin, then the badge fades in over it (`hoverRegion` in `src/state/ui.ts`, set from `src/scene/Regions.tsx`). The signposts that point the way show nothing on hover (a later request the same day). A click or a tap still opens the region card, which states the level. On a touch screen there is no hover, so the card is where the level is read. The "Explore", "Restore" and timer badges are unchanged.
- **Chief Rocco has his generated artwork.** `public/characters/rocco.png` (the whole figure) stands in every dialogue; `public/characters/rocco-face.png` (the close-up) fills the round face on the hint bar. Both were trimmed and scaled from the supplied pictures with `shots/rocco/_process.mjs`. The drawn Rocco remains as the fallback if a file is missing.

## UI redesign: one kit, a theme per place (Sun Nov 15, by request)

Every menu, sheet, modal, popup, toast and in-world label was rebuilt. Only the interface changed: the rules engine, the saves and the mission flow are as they were (57 of 57 tests still pass).

- **Audit first.** Every screen was captured before any change (`shots/ui/before/`, phone and 1366×768). What it found: two tab styles and three outline weights; text down to 8 px and tap targets down to 20 px on a phone; one line icon standing in for every part and building; building sheets with three always-empty tabs; a cramped 3×2 grid of bars in the builder; dead grey buttons with no reason given; no hover, focus, Esc, reduced motion or stable ids; a toast for level-up.
- **A design system, built once** (`src/styles/tokens.css`, `kit.css`, `src/ui/kit.tsx`). The HUD is the reference. Tokens for ink, paper, wood, brass, the action colours and one type scale with a 14 px floor (`--fs-*`) and a 48 px tap size (`--tap`). Parts: the window frame (paper, stitched border, wooden plaque with a brass rivet, round close badge), buttons with a real edge, gloss, hover and pressed states, folder tabs, item cards, price tags, the coin counter, bars with a shine, timer rings, level locks, counter badges, speech-bubble tooltips, paper toasts, empty and error states, toggles, fields, pinned notes and rubber stamps.
- **Thumbnails are the real models** (`src/ui/thumbs.tsx`): one small offscreen renderer draws every building, part, rocket, ruin and material from its 3D model under the island's light and tone curve, one per frame, and keeps the picture. A shimmer shows while one is being drawn.
- **Each place has its own material, inside the system** (`src/styles/menus.css`, `flow.css`): Mission Control is a corkboard with pinned notes, client seals and a clipboard; the Parts Market is shelves under a striped awning with a boat on the delivery tracker; the Integration Bay is a workbench on blueprint paper with the six bars along the top, the turntable, a row of slots and the part tray; the Comms Center is a radio console with needle dials and a station map; the Launch Pad is a control board with split-flap labels and capacity gauges; the Science Lab is a notebook with a conveyor; operations is a monitor with gauges down the edge; the debrief is a report folder where stars, reasons, money and a rubber stamp arrive in turn; level-up is a ribbon with confetti and unlock cards; lost regions are a weathered expedition map; onboarding is a registration form on a clipboard with the logo on a flag; settings is a spiral notebook.
- **Landscape layouts:** building menus are a panel on one side with the island in view; the big tools are a wide panel in the middle; the build menu is a shelf along the bottom. The interface scales off one unit from an 844×390 phone to 1920×1080 and wider, and respects the notch on every side.
- **Behaviour:** menus spring open from the building or button that opened them; lists stagger in; numbers tick; coins fly to whichever counter is on top; a price shakes red when the bank is short (the button stays tappable and a toast says how much is missing); Esc closes the top layer; a new **Reduce motion** setting (and the system preference) turns the motion off.
- **States:** empty, loading, locked with the level shown, cannot afford, in progress with a timer, ready, and error (a friendly fallback card if a menu ever fails to draw).
- **Ids for the tutorial:** every interactive element carries a stable `data-ui` id such as `market.buy.camWide`, `builder.bar.power`, `prep.launch`.
- **New labels in the world:** timer bubbles over a building while it is upgraded, the lab is working or a delivery is at sea, and a bobbing bubble when an order can be filled; they share one badge style with the region signposts.
- **Checked by machine on every screen** (`shots/ui/_drive.mjs`): no text under 14 px and no tap target under 48 px at phone size, and no console errors. Screens were captured at 844×390, 1366×768 and 1920×1080 and reviewed side by side over several rounds.
- **Clearing trees and stones** uses the same small badge as the level indicators (hammer, "Clear", the price in the roundel) instead of a larger popup; tap it to clear, tap anywhere else or press Esc to leave the thing alone.
- **Removed:** the Crew and Tasks tabs on building sheets (they were always empty), and the five old stylesheets.

## The tutorial, rebuilt: Chief Rocco's First Flight (Sun Nov 15, by request)

The old tour (a full-screen bubble, "Tap" hints, no sense of progress) is gone. A first-time player is now walked from an empty base to a paid mission and told what to do next, on a desktop or laptop with mouse, trackpad and keyboard.

- **How Rocco appears.** Full-size Rocco over a dimmed screen only twice, for the welcome and the graduation, with a bubble exactly as big as his words. Everywhere else he talks from **Rocco's dock**, a wooden strip along the bottom of the window that is his alone: his head in a round frame, a speech bubble with the one instruction beside it, and on the right the step, its chapter, seven progress marks and the Skip link. While the dock is up the whole game surface, the 3D view and every menu, ends where the strip begins (`.phone[data-docked]`, `--dock-h`), so nothing he says can cover a menu, a button or the thing he is talking about; the camera glides to its new centre instead of jumping. His tips after the tutorial use the same dock. (An earlier floating bubble that picked a free corner still covered parts of the interface; the user called it terrible, hence the dock.) The pointing hand comes from whichever of eight sides covers least and never rests on what is being read. Text arrives a whole word at a time at about 60 characters a second; a click or Space shows it all; nothing is ever cut mid-word because every word keeps its place from the start. "Click [Buy now]" draws the button as a tiny copy of the real one.
- **Two kinds of steps.** Talk steps have Next (Enter or Space too). Do steps have no Next: the bubble ends with one instruction and the step finishes when the player does it. Esc pauses with Resume and Skip; a small "Skip tutorial" link asks first.
- **Showing where to click.** Everything is dimmed about 55% except the target. The dimming is drawn as an SVG mask so the light fades out softly around the target instead of ending at a hard edge. Only what takes a click glows gold (a thin gold line and a halo hugging the button); things Rocco merely talks about are lit and never outlined, and a dialog that already has the screen to itself (the flight decision, the Why? note, the test-run result) gets no dimming and nothing drawn over it (the user found the earlier outlines around dialogs and lit boxes terrible). Buildings keep their gold frame and name; a chunky pointing hand glides to it and clicks. For buildings the camera glides to frame them, their bounds are projected to the screen for the ring, a name label floats over them and the cursor becomes a pointer. During a do step only the target takes clicks; a miss flashes the ring and, the first time, Rocco says "Over here, {name}!". After 8 idle seconds the hand clicks again; after 20 Rocco rephrases. If a panel is closed or the player wanders off, he says one line and puts things back.
- **The First Flight checklist** under the coins (collapsible): Take a job, Buy parts, Build the satellite, Plan the launch, Launch, Fly the mission, Get paid. The chapter in hand is highlighted with "Step 3 of 7" and finished ones are stamped; the coach's bubble carries the same step line while a menu covers the HUD.
- **The script** (`src/tutorial/steps.ts`, 58 steps in 9 chapters) reads every label and number from the game's data. The storeroom starts with the satellite body, a basic computer, a UHF radio, magnetorquers, two body solar cells and a small battery; the player buys the Wide camera and orders the Deployable panels (the boat takes 10 seconds). **One adaptation:** a 3U body has six slots, so the computer, radio and magnetorquers start fitted and the body solar cells stay in the storeroom, which leaves room for the camera, the panels and the battery; Rocco's line compares body cells (8 W) with the panels (25 W). The flight is scripted: Autopilot flies it and "Rain at the station" is the first thing to go wrong. A level-up earned during the flight waits for the graduation; if there is none, a first-flight XP bonus takes the agency to level 2 so the banner plays.
- **After the tutorial:** a **Next Goal** tracker under the coins shows one goal with its count and a "Show me" button that glides the camera there, opens the right menu and points the hand at the right button (`src/tutorial/goals.ts`). Rocco's tips use the compact coach, never block the game and leave by themselves after about 8 seconds.
- **How it is built:** a `TutorialDirector` state machine (`src/tutorial/director.ts`) driven by the data file; anchors are the `data-ui` ids from the UI redesign, plus buildings and places projected from 3D (`src/tutorial/anchors.ts`, `src/scene/TutorialProbe.tsx`); an event bus (`src/tutorial/bus.ts`) carries `contract.accepted`, `part.bought:<id>`, `part.ordered:<id>`, `delivery.arrived`, `part.fitted:<id>`, `why.opened`, `testrun.done`, `orbit.selected`, `rocket.selected`, `launch.started`, `orbit.reached`, `event.resolved`, `debrief.collected` and more. Progress is saved after every step; a reload resumes at the start of the current step with its camera and panels restored (a flight in the air cannot be restored, so those steps resume at the launch button with the parts and coins put back). Settings has Replay and Skip. Reduce motion is respected.
- **Checked by machine** (`shots/tut/_run.mjs`): from a fresh save at 1366×768 and 1920×1080, three ways: following it exactly, clicking wrong things on purpose (and pressing Esc) before every do step, and reloading the page in the middle of ten steps. Every step must complete, nothing in the interface and no target may lie under the dock, the dock must start exactly where the interface and the 3D view end, no text may be cut off and no bubble may run over 27 words. The exact pass was also run in a short laptop window (1366×650) and at 844×390. A player's first flight is estimated at about six minutes. A second script (`shots/tut/_extras.mjs`) checks Skip (the link, the pause menu, Settings), Replay, Esc, the keyboard, "Show me", Rocco's tips, Reduce motion and ordinary play after a skip.

## The flight, photographed (Sun Nov 15, by request)

- **A page that walks one mission from contract to orbit**, with the real spaceflight behind each stage: https://claude.ai/artifact/FAKPMzg1MHPmPWdnDzfK4N (source `shots/launch/page/`, rebuilt by `node shots/launch/_page.mjs`). The pictures come from `node shots/launch/_flight.mjs --contract firstLight|fireWatch`, which flies a real mission by hand (tutorial and autopilot off) and holds each moment still while it is photographed.
- **Fixed while taking them: the sky never went dark in space.** The sky dome's `uSpace` value was written to an object the renderer had already copied, so orbit was reached under a daytime sky with stars on it. `src/scene/Sky.tsx` now sets the value on the material itself: the sky fades from blue at 12 km to black at 100 km, as it was meant to.

## The mission, redesigned from the launch board to the report (Sun Nov 15, by request)

Presentation, flow and feel only: the rules engine and every number are untouched (the 57 rule tests still pass). The work went in the brief's priority order, and the tutorial's end-to-end test was re-run after each step.

- **One flow.** A slim strip along the top of every mission screen shows Board, Countdown, Ascent, Orbit, Operations, Report; the current stage is lit and finished ones get a check (`src/ui/MissionStrip.tsx`). One line of text at a time comes from the Flight Director at the top centre: an instruction while the player is timing a click, a fact in calm moments, fading after about four seconds.
- **The ascent is one shot** (`src/scene/Launch.tsx`, `src/scene/spaceStage.ts`). The camera climbs beside the rocket while the island shrinks below, goes through a layer of clouds at about 10 km (the island is swapped for the planet inside the white-out), then flies along the planet's edge with a thin line of atmosphere; stars come out above 60 km. After the final burn the dotted path closes into a circle round the planet and the camera pulls back until the whole globe is in view, and operations fades in on the same globe.
- **Readouts.** Left, an altitude ladder from the pad to the target orbit with the cloud layer, staging, the 100 km line and the orbit marked. Right, a speedometer that fills toward a notch at the orbit's speed and turns green there. Bottom left, a switch: Autopilot (safe, keeps 92% of orbit life) or Fly it myself (up to 100%).
- **The three timing moments are in the action; their scoring is exactly as before.** Ignition: hold the button (or Space) while a ring round it fills with thrust, let go in the green. Staging: a fuel gauge pinned beside the rocket drains; click DROP in the green at the bottom; the stage tumbles away trailing puffs and the upper engine lights with a flash. Final burn: the path ahead is drawn as a dotted arc with a ring at its highest point; click BURN there. Each gets a stamp, and in orbit a flight card sums up the three grades and what they are worth in orbit life.
- **Operations** (`src/ui/Ops.tsx`, `src/ui/OpsGlobe.tsx`). The globe is the star, with day and night, the satellite's trail and its track over the ground. Once a day it crosses the glowing target facing the player: the camera flashes and photo tiles pop into a storage tank drawn beside the satellite. Over a dish a beam connects, as wide as the radio is fast, and the tiles stream down it. When storage is full the next tiles spill away as "Lost" and the storage meter flashes red. The tiles are the rules engine's own numbers for each day. Beside the globe: three meters (science with the target marked, battery, storage) and the pipeline as a small flow with the slowest link glowing; numbers are in tooltips. Below: the mission's days with a tick per pass, event icons, a playhead, and 1×, 4× and Skip to end. Reaching the science target sets off a banner, confetti and a chime.
- **Events happen on the globe.** Time slows to a crawl, the camera comes round to where it is happening (a rain cloud over the dish, a wave of particles from the Sun's side, smoke over the target, debris on the ring), and a compact panel over the gauges asks for a decision: one sentence, two buttons named after what they do, their costs as chips, the real-world basis in one small line. The choice plays out: the satellite rests, a rented dish lights up, the storm sweeps past.
- **The launch board** is three guided steps with a live picture (`src/ui/LaunchPrep.tsx`, `src/ui/BoardPreview.tsx`): the orbit as a ring at its height and tilt with its track and the target; the rocket beside a scale on which the satellite sinks as it gets heavier; the dishes with a cone for the sky each can see. The four seats are badges with GO / NO-GO lamps along the bottom, with the bill and the launch button, which always says what it will do. Launching over a NO-GO asks first, lists the reasons and offers Fix it (the builder opens with that bar pointed out) or Launch anyway.
- **The report** keeps its folder and adds numbers that count up, a Fix this button on each reason (the builder opens at the bar and the part most likely to fix it) and a three-second replay of the key moment beside the first reason.
- **Sound:** countdown beeps, an engine that swells with thrust, a clunk at staging, wind that is gone by 100 km, a chime at orbit. Reduce motion turns off the camera shake and keeps lines and stamps on screen instead of fading them.
- **Checked:** four whole missions flown and recorded (First Light by hand and on autopilot, Fire Watch in polar orbit, one launched over a NO-GO), a frame taken every 400 ms and reviewed (`shots/launch/_film.mjs`); the tutorial's end-to-end test after every step (`shots/tut/_run.mjs`).
- **Screenshots of every stage:** https://claude.ai/artifact/VkLAkq9Uo1dRxoyoQdrcj1 (source `shots/launch/redesign/`, rebuilt by `node shots/launch/_redesign_page.mjs`). Videos of the four recorded missions are in `shots/launch/film/<name>/`.
- **Known limits:** the hand-over from the launch to operations is a half-second dissolve between two matching globes, not literally one camera; the replay in the report is a small drawn loop chosen by the first reason, not a recording; at phone size these screens are cramped (the game is laid out for desktop and laptop windows).

**Decisions and cuts**
- Tone mapping: Khronos Neutral (see M0).
- The mission globe is procedural (no Blue Marble texture), so the game ships with no external imagery at all.
- The launch grant is paid at launch, not when a contract is taken, so it cannot be farmed.
- **Cut (per the brief's cut order):** the Engineering Lab's research and test campaigns (the building can be built but has no function yet), crew posted to buildings, pass-and-play team mode, sandbox and versus.
- Two background helpers (art and rules) were stopped early by a usage limit; their finished work was merged and the rest was completed in the main thread.

**Next: M8** — final polish pass, a phone test on a real device, and submission.
