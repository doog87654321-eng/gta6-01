// Cars: the player's ride, traffic that follows the roads, parked cars to
// steal, and police interceptors. Driving is arcade: a speed along the car's
// heading, steering that bites harder the faster you go, and collisions that
// bounce, scrape and smoke.

import { CAR, CRIME_HEAT } from './config.js';
import { collideCircle, nearestRoadPoint, randomRoadPoint } from './city.js';
import { angleDelta, clamp } from './random.js';

let nextCarId = 1;

export function makeCar(modelName, x, y, angle, kind = 'traffic') {
  const model = CAR.models[modelName];
  return {
    id: nextCarId++,
    model: modelName,
    name: model.name,
    x,
    y,
    angle,
    speed: 0,
    color: kind === 'police' ? CAR.models.police.color : model.color,
    kind,
    driver: kind === 'traffic',
    health: model.health,
    maxHealth: model.health,
    siren: false,
    sirenPhase: 0,
    ai: { axis: 'v', dir: 1, targetSpeed: model.top * 0.55, wait: 0, stuck: 0 },
    wreck: false,
    smoke: 0,
    brakeLight: false,
  };
}

const TRAFFIC_MODELS = ['sedan', 'sedan', 'taxi', 'coupe', 'truck', 'van', 'muscle', 'sports'];

/** Fill the city with moving traffic and parked cars. */
export function spawnTraffic(G, moving, parked) {
  for (let i = 0; i < moving; i++) {
    const p = randomRoadPoint(G.city, G.rng);
    const model = G.rng.pick(TRAFFIC_MODELS);
    const angle = p.vertical ? (G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : G.rng.chance(0.5) ? 0 : Math.PI;
    const car = makeCar(model, p.x, p.y, angle, 'traffic');
    car.ai.axis = p.vertical ? 'v' : 'h';
    car.ai.dir = angle === 0 || angle === Math.PI / 2 ? 1 : -1;
    car.speed = car.ai.targetSpeed * G.rng.range(0.7, 1);
    G.cars.push(car);
  }
  for (let i = 0; i < parked; i++) {
    const p = randomRoadPoint(G.city, G.rng);
    const model = G.rng.pick(TRAFFIC_MODELS);
    const angle = p.vertical ? (G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : G.rng.chance(0.5) ? 0 : Math.PI;
    // Parked along the road edge, out of the driving lane.
    const off = 34;
    const x = p.vertical ? p.x + (G.rng.chance(0.5) ? off : -off) : p.x;
    const y = p.vertical ? p.y : p.y + (G.rng.chance(0.5) ? off : -off);
    const car = makeCar(model, x, y, angle, 'parked');
    car.driver = false;
    G.cars.push(car);
  }
  // Two cars parked by Bea's garage, so the first job never waits on traffic.
  for (const y of [2050, 2160]) {
    const car = makeCar(G.rng.pick(['sedan', 'coupe', 'muscle']), 734, y, Math.PI / 2, 'parked');
    car.driver = false;
    G.cars.push(car);
  }
}

/** The nearest car to a point, within maxDist, that passes the filter. */
export function nearestCar(G, x, y, maxDist, filter) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.wreck) continue;
    if (filter && !filter(car)) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

/** Steer a car toward a heading, limited by its grip. */
function steerToward(car, want, dt) {
  const model = CAR.models[car.model];
  const d = angleDelta(car.angle, want);
  const maxTurn = model.grip * dt * clamp(Math.abs(car.speed) / 120, 0.25, 1);
  car.angle += clamp(d, -maxTurn, maxTurn);
}

function carRadius() {
  return 17;
}

/** Move a car forward and resolve it against buildings and other cars. */
function moveCar(G, car, dt) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  let nx = car.x + fx * car.speed * dt;
  let ny = car.y + fy * car.speed * dt;
  // Front and back feel the buildings; a hard hit bounces and scrapes.
  const front = collideCircle(G.city, nx + fx * 16, ny + fy * 16, 14);
  const back = collideCircle(G.city, nx - fx * 16, ny - fy * 16, 14);
  if (front.hit || back.hit) {
    if (Math.abs(car.speed) > 180 && car === G.player.car) {
      damageCar(G, car, Math.abs(car.speed) * 0.06);
      G.audio.crash();
      G.particles.push({ x: nx, y: ny, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 14, color: '#c9c2b4', kind: 'smoke' });
    }
    // A hard crash bounces once; a gentle press just stops. (Multiplying a
    // small speed by -0.25 every frame cancels each frame's acceleration and
    // pins the car at ~0 against the wall forever.)
    car.speed = Math.abs(car.speed) > 120 ? car.speed * -0.25 : 0;
    nx = car.x;
    ny = car.y;
  }
  car.x = nx;
  car.y = ny;
}

function pushCarsApart(G) {
  const cars = G.cars;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      if (a.wreck || b.wreck) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = carRadius() * 2 - 2;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        const exchange = (a.speed - b.speed) * 0.3;
        a.speed -= exchange;
        b.speed += exchange;
        if (Math.abs(exchange) > 60) {
          if (a === G.player.car || b === G.player.car) G.audio.crash();
          damageCar(G, a, 4);
          damageCar(G, b, 4);
        }
      }
    }
  }
}

/** Traffic follows its road, turns at intersections, and brakes for the car ahead. */
export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.kind !== 'traffic' || car.wreck) continue;
    const model = CAR.models[car.model];
    // Car ahead in my lane: ease off.
    let blocked = false;
    for (const other of G.cars) {
      if (other === car || other.wreck) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (ahead > 0 && ahead < 78 && side < 24) {
        blocked = true;
        break;
      }
    }
    const want = blocked ? 0 : car.ai.targetSpeed;
    car.speed += clamp(want - car.speed, -260 * dt, 170 * dt);
    // At an intersection, sometimes turn onto the crossing road.
    const onAvenue = G.city.intersections.some((p) => Math.abs(p.x - car.x) < 26 && Math.abs(p.y - car.y) < 26);
    if (onAvenue && G.rng.chance(0.012)) {
      if (car.ai.axis === 'v') {
        car.ai.axis = 'h';
        car.ai.dir = G.rng.chance(0.5) ? 1 : -1;
      } else {
        car.ai.axis = 'v';
        car.ai.dir = G.rng.chance(0.5) ? 1 : -1;
      }
    }
    const wantAngle = car.ai.axis === 'v' ? (car.ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : car.ai.dir > 0 ? 0 : Math.PI;
    steerToward(car, wantAngle, dt);
    // Stay in the right-hand lane: nudge toward the lane offset.
    const lane = 20;
    if (car.ai.axis === 'v') {
      const road = nearestRoadPoint(G.city, car.x, car.y);
      if (road && road.vertical) car.x += clamp(road.x + lane * car.ai.dir - car.x, -30 * dt, 30 * dt);
    } else {
      const road = nearestRoadPoint(G.city, car.x, car.y);
      if (road && !road.vertical) car.y += clamp(road.y + lane * car.ai.dir - car.y, -30 * dt, 30 * dt);
    }
    moveCar(G, car, dt);
    if (Math.abs(car.speed) < 2 && blocked) car.ai.wait += dt;
    else car.ai.wait = 0;
    // A bounce against a wall or the world's edge cancels every frame's
    // acceleration, so a car pressed into an obstacle sits at ~0 forever.
    // Notice the stall and turn it around instead.
    if (Math.abs(car.speed) < 12) car.ai.stuck += dt;
    else car.ai.stuck = 0;
    if (car.ai.stuck > 0.6) {
      car.ai.stuck = 0;
      car.ai.dir *= -1;
      car.speed = 60;
    }
  }
  pushCarsApart(G);
}

/** The player's car: throttle, brake, reverse and steering that follows speed. */
export function drivePlayerCar(G, input, dt) {
  const car = G.player.car;
  if (!car || car.wreck) return;
  const model = CAR.models[car.model];
  const move = input.move();
  if (move.drive > 0) {
    car.speed += model.accel * dt;
  } else if (move.drive < 0) {
    if (car.speed > 30) car.speed -= model.accel * 1.4 * dt;
    else car.speed -= model.accel * 0.55 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt);
  }
  car.speed = clamp(car.speed, -model.top * 0.45, model.top);
  const steerPower = model.grip * clamp(Math.abs(car.speed) / 140, 0.2, 1) * Math.sign(car.speed || 1);
  car.angle += move.steer * steerPower * dt;
  car.brakeLight = move.drive < 0 && car.speed > 30;
  moveCar(G, car, dt);
  car.smoke = car.health < car.maxHealth * 0.4 ? 1 : 0;
  if (car.smoke && G.rng.chance(0.3)) {
    G.particles.push({
      x: car.x - Math.cos(car.angle) * 18,
      y: car.y - Math.sin(car.angle) * 18,
      vx: G.rng.range(-12, 12),
      vy: G.rng.range(-30, -8),
      life: 0.8,
      max: 0.8,
      size: 10,
      color: '#555550',
      kind: 'smoke',
    });
  }
}

export function damageCar(G, car, amount) {
  if (car.wreck) return;
  car.health -= amount;
  if (car.health <= 0) {
    car.health = 0;
    car.wreck = true;
    car.speed = 0;
    explodeCar(G, car);
  }
}

export function explodeCar(G, car) {
  for (let i = 0; i < 26; i++) {
    const a = G.rng.range(0, Math.PI * 2);
    const sp = G.rng.range(60, 320);
    G.particles.push({
      x: car.x,
      y: car.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: G.rng.range(0.3, 0.9),
      max: 0.9,
      size: G.rng.range(4, 12),
      color: G.rng.pick(['#ff9a3c', '#e5534b', '#ffd23f', '#777']),
      kind: 'spark',
    });
  }
  G.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 1.2, max: 1.2, size: 46, color: '#333', kind: 'smoke' });
  G.audio.crash();
  G.shake = Math.max(G.shake, 10);
  if (car === G.player.car) {
    G.player.car = null;
    G.player.onFoot = true;
  }
  // Anyone standing too close gets hurt.
  const d = Math.hypot(G.player.x - car.x, G.player.y - car.y);
  if (d < 120 && G.player.onFoot) {
    G.player.health -= 30;
    G.player.lastHurt = G.time;
  }
}

/** Get in the nearest car: yank its driver out, or just open a parked one. */
export function enterCar(G, car) {
  if (!car || car.wreck) return false;
  if (car.kind === 'police') return false;
  if (car.driver) {
    car.driver = false;
    // The driver bails and runs.
    const ped = {
      x: car.x + 30,
      y: car.y + 30,
      angle: G.rng.range(0, Math.PI * 2),
      speed: 0,
      color: G.rng.pick(['#d94f3d', '#3d7bd9', '#e8a13c', '#7a5fd0']),
      state: 'flee',
      fleeX: car.x + 300,
      fleeY: car.y + 300,
      targetX: car.x + 300,
      targetY: car.y + 300,
      wait: 0,
    };
    G.peds.push(ped);
    G.player.wantedHeat = Math.min(100, G.player.wantedHeat + CRIME_HEAT.stealCar);
    G.message = `Stole the ${car.name}! The law noticed.`;
    G.messageTimer = 3;
  } else if (car.kind === 'traffic' || car.kind === 'parked') {
    G.player.wantedHeat = Math.min(100, G.player.wantedHeat + CRIME_HEAT.stealCar * 0.5);
  }
  car.kind = 'player';
  G.player.car = car;
  G.player.onFoot = false;
  G.player.x = car.x;
  G.player.y = car.y;
  G.stats.carsStolen += 1;
  return true;
}

/** Step out beside the car. */
export function exitCar(G) {
  const car = G.player.car;
  if (!car) return;
  car.kind = 'parked';
  car.speed = 0;
  const side = G.player.exitSide || 1;
  const px = car.x - Math.sin(car.angle) * 30 * side;
  const py = car.y + Math.cos(car.angle) * 30 * side;
  const fixed = collideCircle(G.city, px, py, 14);
  G.player.x = fixed.x;
  G.player.y = fixed.y;
  G.player.angle = car.angle;
  G.player.car = null;
  G.player.onFoot = true;
}
