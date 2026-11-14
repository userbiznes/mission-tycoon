# Mission Tycoon

A cozy 3D space-agency builder where every number on screen is a real mission-design trade-off.
Built for the 2026 NASA Space Apps Challenge, challenge **"Space Mission Design Game."**

**Play:** https://userbiznes.github.io/mission-tycoon/ (portrait phone or desktop)

> Work in progress this weekend. See [PROGRESS.md](PROGRESS.md) for what works right now.
> The full README (how to play, how each challenge objective maps to a screen, the real-world basis
> for each rule, NASA resources, credits) lands with the final milestone.

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # rules-engine unit tests
npm run build   # production build in dist/
```

## Use of AI

This game's code, procedural 3D models and text were written with **Claude Code** (Anthropic), directed by the team.
There are no AI-generated images or video in the game. No NASA logos or branding are used.

## Credits

- Font: [Fredoka](https://fonts.google.com/specimen/Fredoka), SIL Open Font License 1.1.
- 3D: [three.js](https://threejs.org), [react-three-fiber](https://github.com/pmndrs/react-three-fiber), [postprocessing](https://github.com/pmndrs/postprocessing), [N8AO](https://github.com/N8python/n8ao) (all MIT).
- Every model is built procedurally in code; no asset packs.
