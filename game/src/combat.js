// Combat: bullets, the player's pistol, muzzle flashes and the damage that
// follows. A bullet is a fast point with a short life; it stops at the first
// thing it meets — a wall, a car, a cop, a rival, or the player.

import { PLAYER } from './config.js';
import { clamp } from './random.js';
import { damageCar } from './vehicles.js';

const BULLET_SPEED = 900;

/** A shot from (x, y) along `angle`, fired by 'player', 'cop' or 'gang'. */
export function fireBullet(G, x, y, angle, from, damage = PLAYER.pistolDamage) {
  G.bullets.push({
    x: x + Math.cos(angle) * 18,
    y: y + Math.sin(angle) * 18,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    life: PLAYER.pistolRange / BULLET_SPEED,
    from,
    damage,
  });
  G.gunfireX = x;
  G.gunfireY = y;
  G.gunfireTimer = 0.4;
  G.particles.push({
    x: x + Math.cos(angle) * 22,
    y: y + Math.sin(angle) * 22,
    vx: 0,
    vy: 0,
    life: 0.07,
    max: 0.07,
    size: 12,
    color: '#ffd23f',
    kind: 'flash',
  });
}

function hitBuilding(G, x, y) {
  for (const b of G.city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && hitBuilding(G, b.x, b.y)) {
      dead = true;
      G.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.2, max: 0.2, size: 5, color: '#d8d2c4', kind: 'spark' });
    }
    if (!dead && b.from !== 'player') {
      // Enemy fire can hit the player, on foot or through the windshield.
      const d = Math.hypot(G.player.x - b.x, G.player.y - b.y);
      const radius = G.player.onFoot ? 14 : 20;
      if (d < radius) {
        dead = true;
        hurtPlayer(G, b.damage, b.from);
      }
    }
    if (!dead && b.from === 'player') {
      // Player fire can hit gang members, cops and cars.
      for (const ped of G.peds) {
        if (ped.state === 'down') continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 13) {
          dead = true;
          if (ped.gang) {
            ped.hp -= b.damage;
            if (ped.hp <= 0) {
              ped.state = 'down';
              ped.downTimer = 999;
              G.player.wantedHeat = Math.min(100, G.player.wantedHeat + 10);
              G.player.lastCrime = G.time;
            }
          } else {
            ped.state = 'down';
            ped.downTimer = 8;
            G.player.wantedHeat = Math.min(100, G.player.wantedHeat + 25);
            G.player.lastCrime = G.time;
            G.message = 'You shot a civilian! The police are coming.';
            G.messageTimer = 3;
          }
          break;
        }
      }
      if (!dead) {
        for (const cop of G.cops) {
          if (Math.hypot(cop.x - b.x, cop.y - b.y) < 13) {
            dead = true;
            cop.hp -= b.damage;
            if (cop.hp <= 0) {
              cop.down = true;
              cop.downTimer = 999;
              G.player.wantedHeat = Math.min(100, G.player.wantedHeat + 35);
              G.player.lastCrime = G.time;
              G.message = 'You took down an officer! The whole force is after you.';
              G.messageTimer = 3;
            }
            break;
          }
        }
      }
      if (!dead) {
        for (const car of G.cars) {
          if (car.wreck) continue;
          if (Math.hypot(car.x - b.x, car.y - b.y) < 22) {
            dead = true;
            damageCar(G, car, b.damage * 0.5);
            if (car.kind === 'police') {
              G.player.wantedHeat = Math.min(100, G.player.wantedHeat + 8);
              G.player.lastCrime = G.time;
            }
            break;
          }
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

/** Hurt the player; at zero health the player is wasted. */
export function hurtPlayer(G, amount, from) {
  if (G.player.invuln > 0 || G.player.dead) return;
  G.player.health -= amount;
  G.player.lastHurt = G.time;
  G.shake = Math.max(G.shake, 5);
  if (G.player.health <= 0) {
    G.player.health = 0;
    G.player.dead = true;
  }
}

/** The player's own shot, from the pistol, toward the mouse. */
export function playerShoot(G, targetX, targetY) {
  const p = G.player;
  if (!p.onFoot || p.dead) return;
  if (p.reloadTimer > 0 || p.fireTimer > 0) return;
  if (p.ammo <= 0) {
    p.reloadTimer = PLAYER.reloadSeconds;
    G.audio.denied();
    return;
  }
  p.ammo -= 1;
  p.fireTimer = PLAYER.fireInterval;
  const angle = Math.atan2(targetY - p.y, targetX - p.x);
  p.angle = angle;
  fireBullet(G, p.x, p.y, angle, 'player');
  G.audio.gunshot();
  G.player.wantedHeat = Math.min(100, G.player.wantedHeat + 2);
  G.player.lastCrime = G.time;
  if (p.ammo === 0) p.reloadTimer = PLAYER.reloadSeconds;
}

/** Update the player's reload and fire timers. */
export function updatePlayerCombat(G, dt) {
  const p = G.player;
  if (p.fireTimer > 0) p.fireTimer -= dt;
  if (p.reloadTimer > 0) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) p.ammo = PLAYER.magSize;
  }
  if (p.invuln > 0) p.invuln -= dt;
  // Health creeps back when the player has been safe for a while.
  if (G.time - p.lastHurt > PLAYER.regenDelay && p.health > 0 && p.health < PLAYER.health) {
    p.health = clamp(p.health + PLAYER.regenRate * dt, 0, PLAYER.health);
  }
}
