// Boot: create the game, run the frame loop, and honour ?shot= staging
// for screenshots.

import { Game } from './world.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = 1280;
canvas.height = 720;

const game = new Game(canvas);
window.__game = game;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
let frames = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
  frame.last = now;
  if (shot && frames < 3) {
    // Freeze the staged scene for a few frames so it paints cleanly.
    game.render();
    frames += 1;
    if (frames === 3) window.__shotReady = true;
  } else {
    game.update(dt);
    game.render();
    if (shot && !window.__shotReady) window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

if (shot) {
  applyShot(game, shot);
}
requestAnimationFrame(frame);
