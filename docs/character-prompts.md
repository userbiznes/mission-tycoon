# Character prompts

Characters for Mission Tycoon. Save each as a **transparent-background PNG** under
`public/characters/` with the file name shown. The game loads them automatically and labels each
one "AI-generated".

- **Chief Rocco** appears large on the left of every dialogue, so generate him **from the waist up
  in a tall frame (about 3:4, e.g. 1024×1365)**, body turned slightly towards the right of the
  picture, one hand on his hip and the other hand open and raised as if presenting something to
  his left (the speech bubble sits there). A whole standing figure works too (the one in the game
  now is head to boots). A second picture, `rocco-face.png`, is his **close-up, head and
  shoulders**: it fills the small round face on the hint bar.
- **Crew members** are shown small on their cards: **square (1024×1024), head and shoulders**.

The prompts describe the look directly instead of naming another game or studio. That keeps the
characters original (the brief's own rule) and stops generators from producing lookalikes of
existing characters. Every character is an adult.

## Style block (paste in front of every prompt)

> Stylized 3D cartoon character portrait for a cozy mobile builder game. Chunky, toy-like
> proportions: big rounded head, small shoulders, simplified hands not shown. Soft clay-like
> materials, smooth rounded shapes with no sharp edges, large friendly eyes with a single white
> highlight, small simple nose, warm smile. Thick, clean silhouette. Warm sunny-afternoon lighting
> from the upper left, soft ambient occlusion, gentle rim light, saturated cheerful colours (cream
> whites, sky blue, warm orange and red accents, teal). Head-and-shoulders bust, three-quarter
> view, looking at the viewer. Plain transparent background, no text, no logos, no watermark.
> Adult character.

For Rocco, swap "Head-and-shoulders bust" for: "Waist-up figure with both arms visible, chunky
hands with four simple fingers".

Negative prompt (if your tool supports it):

> realistic, photo, gritty, dark, scary, child, teenager, text, logo, watermark, extra limbs,
> agency insignia, mission patch, flag, brand names

## Chief Rocco (`rocco.png`)

> [style block] A retired flight director in his sixties: stocky, kind but gruff. Thick grey
> walrus mustache, bushy grey eyebrows, grey hair at the temples. Navy blue baseball cap with an
> orange band and a plain round yellow badge, a black headset with a boom microphone, navy bomber
> jacket with orange trim over a cream shirt. Stout barrel chest, one hand on his hip, the other
> hand open and raised to the side as if presenting something. One eyebrow raised, small proud
> smile, as if about to give advice.

Optional second expression, saved as `rocco-worried.png` if you want it later:

> Same character, same outfit, wincing with raised eyebrows and a hand-on-forehead feeling,
> worried but fond.

## Crew

**Imani Okafor (`imani.png`)**: former weather forecaster, perfectionist scientist.

> [style block] A woman in her thirties with deep brown skin and short natural curls, round
> teal glasses, a crisp white lab coat over a mustard turtleneck, a pencil tucked behind one ear.
> Focused, precise expression with a small satisfied smile, holding nothing.

**Luis Ortega (`luis.png`)**: rookie engineer who built his first satellite in a garage.

> [style block] A man in his mid-twenties with light brown skin, messy dark hair and a
> hopeful grin. Blue engineer overalls with a smudge of grease, safety goggles pushed up on his
> forehead, a small screwdriver in his chest pocket.

**Mei Tanaka (`mei.png`)**: veteran spacecraft engineer.

> [style block] A woman in her fifties of East Asian descent, silver-streaked black hair in a
> neat bun, calm confident expression. Cream workshop jacket with rolled sleeves and teal trim,
> a yellow hard hat, a tiny caliper on a lanyard.

**Sven Lindqvist (`sven.png`)**: thrifty range officer.

> [style block] A tall man in his forties with fair skin, a short blond beard and a wry
> half-smile. Orange high-visibility vest over a navy sweater, a clipboard under one arm, a
> pencil behind his ear, ear defenders around his neck.

**Priya Nair (`priya.png`)**: veteran ground-station operator.

> [style block] A woman in her forties with brown skin and a long dark braid, warm steady
> smile. Thick teal winter parka with a fur-trimmed hood down, a black headset around her neck,
> rosy cheeks as if just in from the cold.

**Tomás Rivera (`tomas.png`)**: rookie ground operator and ham-radio champion.

> [style block] A man in his early twenties with tan skin, curly dark hair and an excited,
> wide-eyed smile. Red hoodie under a cream vest covered in small plain round pins, large
> over-ear headphones, a handheld radio antenna peeking over one shoulder.

**Aroha Ngata (`aroha.png`)**: veteran remote-sensing scientist.

> [style block] A woman in her fifties with medium brown skin and wavy dark hair with a grey
> streak, wise amused expression. Deep green cardigan over a white shirt, a greenstone-coloured
> pendant, reading glasses on a cord, a rolled map under her arm.

**Dmitri Volkov (`dmitri.png`)**: perfectionist launch director.

> [style block] A man in his fifties with pale skin, a square jaw, neat dark hair greying at
> the sides and a serious but kind expression. Dark navy flight-control vest over a white
> shirt, sleeves rolled, a stopwatch on a cord around his neck.

**Fatima Zahra (`fatima.png`)**: thrifty all-rounder.

> [style block] A woman in her thirties with olive skin, a cheerful confident smile and a
> coral headscarf. Teal work jacket with many pockets, a small calculator in one pocket and a
> wrench in another.

**Callum Reid (`callum.png`)**: rookie scientist fresh from university.

> [style block] A man in his early twenties with freckled fair skin, floppy red hair and an
> eager, slightly nervous grin. An oversized white lab coat, a striped scarf, a notebook
> clutched to his chest.

## Tips

- Generate Rocco first, then reuse his image as a style reference for the rest so the set matches.
- Keep every face inside the middle 70% of the frame; the game crops nothing but shows them small.
- If a result has a background, remove it before saving (the game expects transparency).
