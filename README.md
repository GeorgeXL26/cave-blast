# 🐷 Piggy Cave Blast

A fast, funny, chaotic 2D top-down arcade survival shooter. You are a tiny
pink piggy trapped in a cave, armed with a pistol, fighting off endless
waves of bats, spiders, slimes, rock monsters, snakes, ghosts and the
occasional giant cave beast mini-boss.

Built with plain HTML5 Canvas + vanilla JavaScript (ES modules) — no build
step, no external assets, no dependencies. All art is drawn with Canvas
primitives and all sound is synthesized live with the Web Audio API.

## Controls

- **WASD** — move
- **Mouse** — aim
- **Click / hold left mouse button** — shoot

## Running locally

Because the game uses ES modules, it needs to be served over `http://`
rather than opened directly as a `file://` URL. Any static file server
works, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or with Node:

```bash
npx serve .
```

## Project structure

```
index.html          HTML shell: canvas + menu/HUD overlays
style.css            All UI styling (menus, HUD, banners)
src/
  main.js             Game loop, state machine, collisions, HUD wiring
  constants.js         Tunable gameplay constants
  utils.js              Math / random helpers
  input.js               Keyboard + mouse handling
  audio.js                 Procedural sound effects + music (Web Audio API)
  cave.js                    Procedural cave boundary, floor & decorations
  player.js                   The piggy: movement, weapon, drawing
  weapons.js                   Weapon definitions + projectiles
  enemies.js                    Enemy types, AI, drawing
  waves.js                       Wave/spawn director, mini-boss cadence
  bonuses.js                      Bonus drops, pickup, effects
  particles.js                     Cartoon particle bursts/sparkles
```

## Deploying to GitHub Pages

This is a static site, so GitHub Pages works out of the box:

```bash
git push -u origin main
gh repo edit --enable-pages   # or enable Pages in repo Settings → Pages
```

Set the Pages source to the `main` branch, root directory.
