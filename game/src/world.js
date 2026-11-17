// The world: one state object holding the city, the player, every car, ped,
// cop, bullet and particle, and the mission and taxi running now. stepWorld
// advances all of it one fixed step; the renderer only paints it.

import { CAR, PLAYER, STASH_COUNT, STASH_VALUE } from './config.js';
import { buildCity, collideCircle, randomSidewalkPoint } from './city.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { spawnPeds, updatePeds } from './people.js';
import { drivePlayerCar, spawnTraffic, updateTraffic } from './vehicles.js';
import { updateBullets, updatePlayerCombat } from './combat.js';
import { updatePolice } from './police.js';
import { updateMission, updateTaxi } from './missions.js';
import { loadSave } from './save.js';

export function createWorld(seed) {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const save = loadSave();
  const audio = createAudio();
  if (save.muted) audio.setMuted(true);
  const G = {
    seed,
    rng,
    time: 0,
    clock: 16.2,
    city,
    save,
    audio,
    player: {
      x: city.spawn.x,
      y: city.spawn.y,
      angle: -Math.PI / 2,
      speed: 0,
      onFoot: true,
      health: PLAYER.health,
      cash: save.cash || 0,
      ammo: PLAYER.magSize,
      fireTimer: 0,
      reloadTimer: 0,
      invuln: 0,
      lastHurt: -99,
      lastCrime: -99,
      wantedHeat: 0,
      car: null,
      dead: false,
      busted: false,
      exitSide: 1,
    },
    cars: [],
    peds: [],
    cops: [],
    policeCars: [],
    bullets: [],
    particles: [],
    stashes: [],
    mission: null,
    taxi: { phase: 'none', x: 0, y: 0, timer: 0, fare: 0, cooldown: 20 },
    wanted: 0,
    spawnTimer: 0,
    sirenNear: false,
    camera: { x: city.spawn.x, y: city.spawn.y, zoom: 1 },
    view: { w: 1280, h: 720 },
    shake: 0,
    message: 'Welcome to Coral Bay. Press Enter to start the first mission.',
    messageTimer: 6,
    gunfireX: 0,
    gunfireY: 0,
    gunfireTimer: 0,
    aimX: 0,
    aimY: 0,
    stats: { carsStolen: 0 },
    missionComplete: null,
    missionFailed: null,
  };
  spawnTraffic(G, 20, 14);
  spawnPeds(G, 26);
  for (let i = 0; i < STASH_COUNT; i++) {
    const p = randomSidewalkPoint(city, rng);
    G.stashes.push({ x: p.x, y: p.y, taken: save.stashes.includes(i), index: i });
  }
  return G;
}

/** A fresh world from the same seed (restart after wasted or busted). */
export function resetWorld(G) {
  const fresh = createWorld(G.seed);
  // Keep the save, the audio and the camera's screen size.
  fresh.save = G.save;
  fresh.audio = G.audio;
  fresh.view = G.view;
  fresh.camera.zoom = G.camera.zoom;
  Object.keys(G).forEach((k) => delete G[k]);
  Object.assign(G, fresh);
}

function updateParticles(G, dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
    p.vy *= 1 - 2.2 * dt;
    p.life -= dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
}

function updatePlayerOnFoot(G, input, dt) {
  const p = G.player;
  const vec = input ? input.walkVector() : null;
  if (vec) {
    const speed = input.shiftHeld() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    p.speed = speed;
    p.angle = Math.atan2(vec.y, vec.x);
    const nx = p.x + vec.x * speed * dt;
    const ny = p.y + vec.y * speed * dt;
    const fixed = collideCircle(G.city, nx, ny, PLAYER.radius);
    p.x = fixed.x;
    p.y = fixed.y;
  } else {
    p.speed = 0;
  }
  // Aim at the mouse; the shot itself fires from main.js on click.
  if (input && input.mouse.down) {
    p.angle = Math.atan2(G.aimY - p.y, G.aimX - p.x);
  }
}

export function stepWorld(G, input, dt) {
  G.time += dt;
  G.clock = 16.2 + (G.time / 300) % 8;
  if (G.messageTimer > 0) G.messageTimer -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);

  if (!G.player.dead && !G.player.busted) {
    const p = G.player;
    if (p.onFoot) {
      updatePlayerOnFoot(G, input, dt);
    } else if (p.car) {
      drivePlayerCar(G, input, dt);
      if (p.car) {
        p.x = p.car.x;
        p.y = p.car.y;
        p.angle = p.car.angle;
      }
    }
    updateTraffic(G, dt);
    updatePeds(G, dt);
    updatePolice(G, dt);
    updateBullets(G, dt);
    updatePlayerCombat(G, dt);
    updateMission(G, dt);
    updateTaxi(G, dt);

    // Cash stashes: walk over one to pocket it.
    for (const stash of G.stashes) {
      if (stash.taken) continue;
      if (Math.hypot(p.x - stash.x, p.y - stash.y) < 30) {
        stash.taken = true;
        p.cash += STASH_VALUE;
        G.save.cash = p.cash;
        if (!G.save.stashes.includes(stash.index)) G.save.stashes.push(stash.index);
        G.audio.cash();
        G.message = `Found a stash — $${STASH_VALUE}!`;
        G.messageTimer = 2.5;
      }
    }
  }
  updateParticles(G, dt);

  // Camera follows the player, looking ahead along the car's motion.
  const p = G.player;
  let lookX = p.x;
  let lookY = p.y;
  if (p.car) {
    lookX += Math.cos(p.car.angle) * p.car.speed * 0.35;
    lookY += Math.sin(p.car.angle) * p.car.speed * 0.35;
  }
  const wantZoom = p.car ? 0.82 : 1;
  G.camera.zoom += (wantZoom - G.camera.zoom) * Math.min(1, dt * 2);
  G.camera.x += (lookX - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (lookY - G.camera.y) * Math.min(1, dt * 5);

  // Engine hum follows the car's speed.
  const speed01 = p.car ? Math.abs(p.car.speed) / CAR.models[p.car.model].top : 0;
  G.audio.engine(speed01, !!p.car);
}
