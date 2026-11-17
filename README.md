# Coral Bay: Hot Streets

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/doog87654321-eng/gta6-01/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/doog87654321-eng/gta6-01/reward.svg)](https://make.fun/c/gta6-01)

An original open-world crime game for the make.fun GTA 6 bounty — built with
hand-written JavaScript and Canvas 2D, no libraries, no network requests.

You are Ray Delgado, a getaway driver in **Coral Bay**, a sun-soaked coastal
city that is entirely made up: its streets, people, cars and story are all
original. Steal cars, outrun the Coral Bay PD, pull six story missions for
Bea — the fixer who runs the garage — from your first stolen car to the big
bank job, plus taxi fares and hidden cash stashes on the side.

## Play

Serve `game/` with any static HTTP server and open `game/index.html` in
desktop Chrome:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

- **WASD / arrows** — walk and drive, **Shift** to run
- **Mouse** — aim, **click** to shoot
- **E** — enter / steal a car, get out again
- **R** — reload, **Esc** — pause, **M** — mute

Systems: a living city with traffic and pedestrians, a 5-star wanted level
with police cars and foot cops that chase, ram and arrest, six story
missions with a wanted-level escape, combat, a HUD with minimap, a start
screen, and saves in localStorage (progress and cash carry over).

## Shots

`?shot=walk|drive|chase|mission|title&seed=7` stages a real scene of the
game for a screenshot and sets `window.__shotReady` when it is painted.

## Entry

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json` with the
vendored `vendor/makefun-game.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
