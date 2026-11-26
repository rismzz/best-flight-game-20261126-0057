# best-flight-game-20261126-0057

![competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)
![rank](https://make.fun/badge/best-flight-game-20261126-0057/rismzz/best-flight-game-20261126-0057/rank.svg)
![reward](https://make.fun/badge/best-flight-game-20261126-0057/rismzz/best-flight-game-20261126-0057/reward.svg)

**Sky Courier — Ring Runner** is an original 2D flight game that runs offline in a desktop browser. You fly a mail plane in a pseudo-3D chase view over scrolling farmland — fields, a winding road, a river and a mountain ridge on the horizon — from Runway 09 into the open sky.

## How to play

- **Steer & climb:** Arrow keys / WASD, or move the mouse (touch drag works too)
- **Boost:** Space (burns fuel faster, flies faster)
- **Pause:** P · **Mute:** M · **Start / restart:** Enter or click

Fly through the **golden rings** to deliver the mail: each ring scores +100 and refills fuel. Finish **12 rings** to complete a delivery run for a +500 bonus — then the next run flies faster. Dodge **storm clouds, hot-air balloons, birds and radio towers**; each hit costs hull (3 hits and the flight is over). Threading past an obstacle earns a near-miss bonus. Fuel is the mission clock: run dry and the flight ends. Your final score earns a grade from D to S.

The HUD shows everything a courier needs: score, delivery-run progress, a heading compass, a fuel gauge, hull hearts, and lit speed (knots) and altitude (feet) instruments.

## Run it

```sh
node serve.ts        # or: python3 -m http.server in game/
# open http://localhost:8080
```

No build step, no dependencies, no network requests: all art is drawn as vectors on canvas and all sound is synthesised with WebAudio. Staged screenshots are available at `?shot=title|play|serve|end&seed=7`.

## Structure

- `game/index.html` + `game/src/` — the game (ES modules: `main.js`, `world.js`, `render.js`, `input.js`, `audio.js`, `shots.js`, `config.js`, `random.js`)
- `test/simulate.mjs` — headless deterministic simulator of the core loop (movement, ring catches, collisions, fuel, game over)
- `main.ts` — Node 22 hand-in program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — four real renders of the game in a browser (cover first)

<sub>Entered on [make.fun](https://make.fun/?ref=aa4mcy45&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
