// The Coral Bay Police Department: a wanted level from the player's heat,
// units that answer it, pursuit driving that rams, foot cops that chase,
// and the bust that ends a run — or a mission.

import { CRIME_HEAT, POLICE } from './config.js';
import { collideCircle, nearestRoadPoint, randomRoadPoint } from './city.js';
import { angleDelta, clamp } from './random.js';
import { hurtPlayer } from './combat.js';
import { makeCar } from './vehicles.js';

export function wantedStars(heat) {
  const t = POLICE.starHeat;
  if (heat >= t[5]) return 5;
  if (heat >= t[4]) return 4;
  if (heat >= t[3]) return 3;
  if (heat >= t[2]) return 2;
  if (heat >= t[1]) return 1;
  return 0;
}

export function addHeat(G, amount, reason) {
  G.player.wantedHeat = clamp(G.player.wantedHeat + amount, 0, 100);
  G.player.lastCrime = G.time;
  void reason;
}

function spawnCopCar(G) {
  // On a road, off-screen but close enough to join the chase fast.
  for (let tries = 0; tries < 8; tries++) {
    const p = randomRoadPoint(G.city, G.rng);
    const d = Math.hypot(p.x - G.player.x, p.y - G.player.y);
    if (d > POLICE.spawnDistance * 0.7 && d < POLICE.spawnDistance * 1.6) {
      const angle = p.vertical ? Math.PI / 2 : 0;
      const car = makeCar('police', p.x, p.y, angle, 'police');
      car.siren = true;
      car.ai.targetSpeed = 520;
      car.speed = 300;
      G.cars.push(car);
      G.policeCars.push(car);
      return;
    }
  }
}

function spawnFootCop(G) {
  const p = randomRoadPoint(G.city, G.rng);
  const road = nearestRoadPoint(G.city, p.x, p.y);
  const d = Math.hypot(road.x - G.player.x, road.y - G.player.y);
  if (d < 300 || d > 900) return;
  G.cops.push({
    x: road.x,
    y: road.y,
    angle: 0,
    speed: 0,
    hp: 60,
    down: false,
    downTimer: 0,
    bustTimer: 0,
  });
}

function updateCopCar(G, car, dt) {
  const p = G.player;
  const targetX = p.car ? p.car.x : p.x;
  const targetY = p.car ? p.car.y : p.y;
  const d = Math.hypot(targetX - car.x, targetY - car.y);
  const wantAngle = Math.atan2(targetY - car.y, targetX - car.x);
  const turn = clamp(angleDelta(car.angle, wantAngle), -2.6 * dt, 2.6 * dt);
  car.angle += turn;
  const stars = wantedStars(p.wantedHeat);
  const top = 480 + stars * 28;
  const wantSpeed = d > 700 ? top : top * 0.92;
  car.speed += clamp(wantSpeed - car.speed, -420 * dt, 320 * dt);
  car.sirenPhase += dt * 6;
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  const nx = car.x + fx * car.speed * dt;
  const ny = car.y + fy * car.speed * dt;
  const fixed = collideCircle(G.city, nx, ny, 16);
  if (fixed.hit) car.speed *= 0.4;
  car.x = fixed.x;
  car.y = fixed.y;
  // Ram the player's car, or run the player down on foot.
  if (p.car) {
    const cd = Math.hypot(p.car.x - car.x, p.car.y - car.y);
    if (cd < 44 && Math.abs(car.speed) > 120) {
      p.car.speed *= 0.82;
      p.car.health -= 3;
      car.speed *= 0.7;
      G.shake = Math.max(G.shake, 4);
      G.audio.crash();
    }
  } else if (d < 30 && Math.abs(car.speed) > 100) {
    hurtPlayer(G, 18, 'cop-car');
    car.speed *= 0.3;
  }
}

function updateFootCop(G, cop, dt) {
  if (cop.down) {
    cop.downTimer -= dt;
    if (cop.downTimer <= 0) {
      cop.down = false;
      cop.hp = 60;
    }
    return;
  }
  const p = G.player;
  const d = Math.hypot(p.x - cop.x, p.y - cop.y);
  const speed = d > 200 ? 210 : 175;
  const angle = Math.atan2(p.y - cop.y, p.x - cop.x);
  cop.angle = angle;
  cop.x += Math.cos(angle) * speed * dt;
  cop.y += Math.sin(angle) * speed * dt;
  const fixed = collideCircle(G.city, cop.x, cop.y, 12);
  cop.x = fixed.x;
  cop.y = fixed.y;
  // Arrest: close to the player, on foot or in a stopped car, for long enough.
  const playerSlow = !p.car || Math.abs(p.car.speed) < 45;
  if (d < 30 && playerSlow) {
    cop.bustTimer += dt;
    if (cop.bustTimer >= POLICE.bustSeconds) {
      G.player.busted = true;
    }
  } else {
    cop.bustTimer = Math.max(0, cop.bustTimer - dt * 2);
  }
}

export function updatePolice(G, dt) {
  const p = G.player;
  const stars = wantedStars(p.wantedHeat);
  G.wanted = stars;

  // Heat cools when the player has been quiet and unseen for a while.
  const nearestCop = Math.min(
    ...G.policeCars.map((c) => Math.hypot(c.x - p.x, c.y - p.y)),
    ...G.cops.map((c) => Math.hypot(c.x - p.x, c.y - p.y)),
    9999,
  );
  if (stars > 0 && G.time - p.lastCrime > POLICE.coolSeconds && nearestCop > 520) {
    p.wantedHeat = Math.max(0, p.wantedHeat - POLICE.heatDecay * dt);
  }

  // Keep the responding force at the level's strength.
  G.spawnTimer -= dt;
  if (stars > 0 && G.spawnTimer <= 0) {
    G.spawnTimer = 0.9;
    if (G.policeCars.length < POLICE.maxCars[stars]) spawnCopCar(G);
    else if (G.cops.filter((c) => !c.down).length < POLICE.maxFoot[stars]) spawnFootCop(G);
  }

  for (const car of G.policeCars) updateCopCar(G, car, dt);
  for (const cop of G.cops) updateFootCop(G, cop, dt);

  // Too far away: the unit gives up and leaves.
  G.policeCars = G.policeCars.filter((car) => {
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (stars === 0 || d > POLICE.despawnDistance) {
      car.siren = false;
      car.kind = 'traffic';
      car.driver = true;
      return false;
    }
    return true;
  });
  G.cops = G.cops.filter((cop) => {
    const d = Math.hypot(cop.x - p.x, cop.y - p.y);
    return stars > 0 && (d < POLICE.despawnDistance || cop.down);
  });

  // Sirens wail while any unit is near.
  G.sirenNear = nearestCop < 700 && stars > 0;
  G.audio.siren(G.sirenNear);
}

export { CRIME_HEAT };
