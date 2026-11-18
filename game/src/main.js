// Boot and the frame loop. `?shot=walk|drive|chase|mission|title&seed=N`
// stages a real scene for a screenshot and sets window.__shotReady once
// it is painted; without it the game opens on the title screen.

import { CFG } from './config.js';
import { hashSeed } from './rng.js';
import { Game } from './world.js';
import { attachInput, mouse, wasPressed, endFrame } from './input.js';
import { drawWorld, drawHUD, drawTitle, drawPause, drawEnd } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = params.has('seed') ? Number(params.get('seed')) : hashSeed('coral-bay');

const game = new Game(canvas, { shot: shotName, seed });
window.__game = game;
attachInput(canvas);

// Alt-tabbing mid-chase should not get Ray killed: pause on blur.
window.addEventListener('blur', () => {
  if (game.state === 'playing') game.togglePause();
});

if (shotName) {
  stageShot(game, shotName);
  game.sfx.setMuted(true);
}

let last = performance.now();
let frames = 0;
let readySent = false;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  // Clicks on the menu screens. The click that starts the game must not
  // also fire a shot, so it is consumed here.
  if (mouse.clicked) {
    if (game.state === 'title') { game.start(); mouse.clicked = false; }
    else if (game.state === 'busted' || game.state === 'dead') { game.respawn(); mouse.clicked = false; }
  }
  if (wasPressed('Escape') && (game.state === 'playing' || game.state === 'paused')) {
    game.togglePause();
  }

  game.update(dt);
  drawWorld(ctx, game);
  if (game.state === 'playing' || game.state === 'paused') drawHUD(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  if (game.state === 'paused') drawPause(ctx);
  if (game.state === 'busted') drawEnd(ctx, 'busted', game.cash);
  if (game.state === 'dead') drawEnd(ctx, 'dead', game.cash);

  endFrame();
  frames++;
  if (shotName && !readySent && frames >= 4) {
    readySent = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
void CFG;
