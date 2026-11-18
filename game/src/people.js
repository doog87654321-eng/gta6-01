// Pedestrians and traffic. Peds walk the sidewalks and scatter when shots
// are fired nearby; traffic cars drive the road grid, turning at
// intersections, and stall for a few seconds when shot to a stop.

import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { isRoad, nearestRoadPoint, pointInBuilding, resolveBuildings, clampWorld } from './city.js';
import { makeCar, steerCar, randomCarColor } from './vehicles.js';

export function spawnPeds(city, seed, n) {
  const rng = makeRng(seed);
  const peds = [];
  let guard = 0;
  while (peds.length < n && guard++ < 600) {
    const x = rng.range(100, CFG.LAND - 100);
    const y = rng.range(100, CFG.LAND - 100);
    if (isRoad(x, y)) continue;
    if (pointInBuilding(city.buildings, x, y, 18)) continue;
    peds.push({
      x, y,
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(38, 68),
      color: rng.pick(CFG.COL.ped),
      hp: CFG.PED_HP,
      flee: 0,
      dead: false,
      wanderT: rng.range(1, 4),
    });
  }
  return peds;
}

export function updatePeds(peds, dt, city, danger) {
  for (const p of peds) {
    if (p.dead) continue;
    if (danger && Math.hypot(p.x - danger.x, p.y - danger.y) < 260) {
      p.flee = 2.5;
    }
    p.wanderT -= dt;
    if (p.wanderT <= 0) {
      p.wanderT = 2 + Math.random() * 3;
      p.angle += (Math.random() - 0.5) * 2.2;
    }
    const sp = p.flee > 0 ? p.speed * 2.6 : p.speed;
    if (p.flee > 0) {
      p.flee -= dt;
      if (danger) p.angle = Math.atan2(p.y - danger.y, p.x - danger.x);
    }
    p.x += Math.cos(p.angle) * sp * dt;
    p.y += Math.sin(p.angle) * sp * dt;
    resolveBuildings(city.buildings, p, 10);
    clampWorld(p, 12);
  }
}

export function spawnTraffic(city, seed, n) {
  const rng = makeRng(seed);
  const cars = [];
  let guard = 0;
  while (cars.length < n && guard++ < 800) {
    const x = rng.range(60, CFG.LAND - 60);
    const y = rng.range(60, CFG.LAND - 60);
    if (!isRoad(x, y)) continue;
    const p = nearestRoadPoint(x, y);
    const alongX = Math.abs(p.x - x) < Math.abs(p.y - y);
    const dir = rng.chance(0.5) ? 1 : -1;
    const car = makeCar(p.x, p.y, alongX ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2), randomCarColor(rng), 'civilian');
    car.speed = rng.range(110, 175);
    car.axis = alongX ? 'x' : 'y';
    car.dir = dir;
    car.cruise = car.speed;
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, city) {
  for (const c of cars) {
    if (c.dead) continue;
    // At an intersection, sometimes turn onto the crossing road.
    const ix = Math.round(c.x / CFG.PITCH) * CFG.PITCH;
    const iy = Math.round(c.y / CFG.PITCH) * CFG.PITCH;
    const nearX = Math.abs(c.x - ix) < 14;
    const nearY = Math.abs(c.y - iy) < 14;
    if (nearX && nearY && Math.random() < 0.35) {
      if (c.axis === 'x' && Math.random() < 0.5) {
        c.axis = 'y';
        c.dir = Math.random() < 0.5 ? 1 : -1;
      } else if (c.axis === 'y' && Math.random() < 0.5) {
        c.axis = 'x';
        c.dir = Math.random() < 0.5 ? 1 : -1;
      }
    }
    const target = c.axis === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    steerCar(c, target, c.cruise, dt, city.buildings);
    // Keep the car on its road: pull gently back to the centreline.
    if (c.axis === 'x') c.y += (iy - c.y) * Math.min(1, 2.2 * dt);
    else c.x += (ix - c.x) * Math.min(1, 2.2 * dt);
  }
  // Simple bumper-to-bumper spacing: push overlapping cars apart.
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < 40) {
        const push = (40 - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

export function drawPed(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(2, 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(Math.cos(p.angle) * 3, Math.sin(p.angle) * 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
