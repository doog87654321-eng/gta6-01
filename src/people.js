// Pedestrians: Coral Bay locals walking the sidewalks, running from gunfire
// and speeding cars, and the rival crew that shows up armed in one mission.
// A ped is a small walker with a mood: walk, flee, or down.

import { PED } from './config.js';
import { collideCircle, randomSidewalkPoint } from './city.js';
import { clamp } from './random.js';
import { fireBullet } from './combat.js';

const SHIRT_COLORS = ['#d94f3d', '#3d7bd9', '#e8a13c', '#7a5fd0', '#3fae6a', '#e0788a', '#4fb3a9', '#c9c2b4'];

export function makePed(G, x, y, opts = {}) {
  return {
    x,
    y,
    angle: G.rng.range(0, Math.PI * 2),
    speed: 0,
    color: opts.color || G.rng.pick(SHIRT_COLORS),
    state: opts.state || 'walk',
    targetX: x,
    targetY: y,
    wait: G.rng.range(0, 2),
    downTimer: 0,
    hp: opts.hp || 0,
    gang: !!opts.gang,
    shootTimer: G.rng.range(0.5, 1.5),
    fleeX: x,
    fleeY: y,
  };
}

export function spawnPeds(G, count) {
  for (let i = 0; i < count; i++) {
    const p = randomSidewalkPoint(G.city, G.rng);
    const ped = makePed(G, p.x, p.y);
    const next = randomSidewalkPoint(G.city, G.rng);
    ped.targetX = next.x;
    ped.targetY = next.y;
    G.peds.push(ped);
  }
}

/** Make every ped near a point run from it. */
export function scarePeds(G, x, y, radius) {
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.state = 'flee';
      const away = Math.atan2(ped.y - y, ped.x - x);
      ped.fleeX = ped.x + Math.cos(away) * 320;
      ped.fleeY = ped.y + Math.sin(away) * 320;
    }
  }
}

function walkToward(ped, tx, ty, speed, dt) {
  const dx = tx - ped.x;
  const dy = ty - ped.y;
  const d = Math.hypot(dx, dy);
  if (d < 8) return true;
  ped.angle = Math.atan2(dy, dx);
  ped.x += (dx / d) * speed * dt;
  ped.y += (dy / d) * speed * dt;
  ped.speed = speed;
  return false;
}

export function updatePeds(G, dt) {
  for (const ped of G.peds) {
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      ped.speed = 0;
      if (ped.downTimer <= 0) {
        ped.state = 'flee';
        ped.fleeX = ped.x + G.rng.range(-300, 300);
        ped.fleeY = ped.y + G.rng.range(-300, 300);
      }
      continue;
    }
    if (ped.gang) {
      // Rival crew: close in on the player and shoot.
      const d = Math.hypot(G.player.x - ped.x, G.player.y - ped.y);
      if (d > 260) {
        walkToward(ped, G.player.x, G.player.y, PED.runSpeed * 0.9, dt);
      } else {
        ped.angle = Math.atan2(G.player.y - ped.y, G.player.x - ped.x);
        ped.shootTimer -= dt;
        if (ped.shootTimer <= 0 && d < 420) {
          ped.shootTimer = G.rng.range(0.7, 1.4);
          fireBullet(G, ped.x, ped.y, ped.angle + G.rng.range(-0.12, 0.12), 'gang', 12);
          G.audio.gunshot();
        }
      }
      const fixed = collideCircle(G.city, ped.x, ped.y, PED.radius);
      ped.x = fixed.x;
      ped.y = fixed.y;
      continue;
    }
    if (ped.state === 'flee') {
      const arrived = walkToward(ped, ped.fleeX, ped.fleeY, PED.runSpeed, dt);
      const fixed = collideCircle(G.city, ped.x, ped.y, PED.radius);
      ped.x = fixed.x;
      ped.y = fixed.y;
      if (arrived || Math.hypot(ped.x - ped.fleeX, ped.y - ped.fleeY) < 20) {
        ped.state = 'walk';
        ped.wait = G.rng.range(0, 1.5);
      }
      continue;
    }
    // Walking: pause at corners, then pick a new sidewalk point.
    if (ped.wait > 0) {
      ped.wait -= dt;
      ped.speed = 0;
      continue;
    }
    const arrived = walkToward(ped, ped.targetX, ped.targetY, PED.walkSpeed, dt);
    const fixed = collideCircle(G.city, ped.x, ped.y, PED.radius);
    ped.x = fixed.x;
    ped.y = fixed.y;
    if (arrived) {
      if (G.rng.chance(0.35)) ped.wait = G.rng.range(1, 4);
      const next = randomSidewalkPoint(G.city, G.rng);
      ped.targetX = next.x;
      ped.targetY = next.y;
    }
  }

  // The player's car can run a ped down: they go down, the law notices.
  if (G.player.car && Math.abs(G.player.car.speed) > 60) {
    const car = G.player.car;
    for (const ped of G.peds) {
      if (ped.state === 'down' || ped.gang) continue;
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 24) {
        ped.state = 'down';
        ped.downTimer = 6;
        G.player.wantedHeat = Math.min(100, G.player.wantedHeat + 15);
        G.player.lastCrime = G.time;
        scarePeds(G, car.x, car.y, 220);
        G.message = 'You hit a pedestrian! Witnesses called it in.';
        G.messageTimer = 3;
        G.audio.crash();
      }
    }
  }

  // Gunfire nearby sends the crowd running.
  if (G.gunfireTimer > 0) {
    scarePeds(G, G.gunfireX, G.gunfireY, 300);
    G.gunfireTimer -= dt;
  }
}
