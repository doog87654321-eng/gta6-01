# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/doog87654321-eng/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/doog87654321-eng/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Coral Bay: Hot Streets — an original open-world crime game built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC. Hand-written JavaScript and Canvas 2D, no libraries, no build step, no network requests: the whole game is static files under `game/`.

You are Ray Delgado, a getaway driver in Coral Bay, a made-up coastal city whose streets, people, cars and story are all invented — nothing is taken from any commercial game. Steal cars, outrun the Coral Bay PD, and pull six jobs for Bea, the fixer who runs the garage, from your first stolen car to the big bank score, with taxi fares and hidden cash stashes on the side.

## Run it

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

| Keys | What they do |
| --- | --- |
| WASD / arrows | Walk and drive; Shift to run |
| Mouse, click | Aim and shoot |
| E | Get in / steal a car, get out again |
| H | Honk the horn while driving |
| R | Reload |
| Esc | Pause (the game also pauses itself if the window loses focus) |
| M | Mute |

## What is in the city

- **A living city**: an 8×8 block grid with a park, a beach and the sea, 34 traffic cars that follow the roads and 30 pedestrians who walk the sidewalks and scatter when shots are fired.
- **A 5-star wanted level**: police cars chase and ram, foot cops shoot and arrest. Heat fades if you stay quiet and out of sight for a while.
- **Six story missions**: steal a first car, run a taxi fare, drop a package at the docks, survive three stars for a minute, collect three cash stashes, and rob the Coral Bank at five stars.
- **Combat**: hitscan shooting with tracers and muzzle flash; cars shot to a stop stall for a few seconds, then pull away again.
- **HUD and minimap**: cash, health, ammo, wanted stars, the current objective, a speedometer while driving, and a minimap showing roads, police, traffic and the mission marker.
- **Saves**: cash, mission progress, stashes and the best wanted level are kept in localStorage, so the story carries over between sessions.

## Screenshots

The game stages its own screenshot scenes — nothing is drawn just for the camera. Add `?shot=walk|drive|chase|mission|title&seed=7` to the page URL and the game puts itself into that real scene; `window.__shotReady` is set once it has been painted.

## Handing it in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `/output/dossier.json` with the vendored `vendor/makefun-game.ts` library. It refuses to build a hand-in the scorer would refuse — a missing `game/index.html`, or fewer than three or more than four screenshots — and prints a short summary of what it handed in:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — the page shell, nothing but a canvas
- `game/src/config.js` — every tuning number and the palette, in one place
- `game/src/rng.js` — the seeded random source the world is built from
- `game/src/city.js` — the road grid, buildings, park, beach and stashes
- `game/src/world.js` — the game state machine and the update loop
- `game/src/render.js` — the city, the HUD, the minimap and the menus
- `game/src/vehicles.js` — the car physics and the top-down car drawing
- `game/src/people.js` — pedestrians and traffic
- `game/src/police.js` — the wanted level, chases, rams and arrests
- `game/src/combat.js` — hitscan shooting, tracers, muzzle flash
- `game/src/missions.js` — Bea's six jobs, taxi fares and cash stashes
- `game/src/audio.js` — all sound is synthesised with WebAudio
- `game/src/input.js` — keyboard and mouse state
- `game/src/save.js` — versioned localStorage saves
- `game/src/shots.js` — the staged screenshot scenes
- `main.ts` — the hand-in program

---

<sub>Entered on [make.fun](https://make.fun/?ref=doog87654321-eng&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
