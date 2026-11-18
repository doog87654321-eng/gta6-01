// Cars: top-down physics (accelerate, steer, brake, drift a little) and
// the top-down drawing. One car type serves the player, traffic and the
// police; only the colour and the driver differ.

import { CFG } from './config.js';
import { resolveBuildings, clampWorld } from './city.js';

const CAR_COLORS = ['#c23b2e', '#3f7d4e', '#c8a13a', '#5b7fa6', '#8a5fa6', '#c8c8c8', '#3a3a3a', '#d97b2e'];

export function randomCarColor(rng) {
  return rng.pick(CAR_COLORS);
}

export function makeCar(x, y, angle, color, kind) {
  return {
    x, y, angle, speed: 0,
    color: color || '#c23b2e',
    kind: kind || 'civilian', // civilian | taxi | cop | player
    len: CFG.CAR_LEN,
    wid: CFG.CAR_WID,
    stalled: 0,   // seconds left stalled (shot to a stop)
    dead: false,
    hp: 100,
  };
}

// Player-driven car: throttle/steer from the input axis.
export function driveCar(car, input, dt, buildings) {
  if (car.stalled > 0) {
    car.stalled -= dt;
    car.speed *= Math.max(0, 1 - 3 * dt);
  } else {
    const throttle = -input.y; // W is -y: forward
    if (throttle > 0) car.speed += CFG.CAR_ACCEL * dt;
    else if (throttle < 0) {
      car.speed -= (car.speed > 10 ? CFG.CAR_BRAKE : CFG.CAR_REVERSE) * dt;
    } else {
      car.speed -= Math.sign(car.speed) * CFG.CAR_FRICTION * dt;
      if (Math.abs(car.speed) < 8) car.speed = 0;
    }
    car.speed = Math.max(-CFG.CAR_REVERSE, Math.min(CFG.CAR_MAX, car.speed));
    // Steering only bites while the car is actually rolling, and it gets
    // calmer at top speed so the car doesn't spin at the touch of a key.
    const steer = input.x;
    const grip = Math.min(1, Math.abs(car.speed) / 160);
    const turnRate = 2.4 * (Math.abs(car.speed) > 300 ? 300 / Math.abs(car.speed) : 1);
    if (Math.abs(car.speed) > 5) {
      car.angle += steer * turnRate * grip * dt * Math.sign(car.speed);
    }
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Scrub a little speed on a wall hit, but never glue the car to it:
  // the driver can still steer or reverse out.
  if (resolveBuildings(buildings, car, 24)) car.speed *= 0.85;
  clampWorld(car, 24);
}

// AI-driven car: follow a heading at a target speed, used by traffic and
// the police chase (the caller steers toward a target point).
export function steerCar(car, targetAngle, targetSpeed, dt, buildings) {
  if (car.stalled > 0) {
    car.stalled -= dt;
    car.speed *= Math.max(0, 1 - 3 * dt);
  } else {
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    if (car.speed < targetSpeed) car.speed += CFG.CAR_ACCEL * 0.7 * dt;
    else car.speed -= CFG.CAR_FRICTION * dt;
    car.speed = Math.max(0, Math.min(CFG.CAR_MAX, car.speed));
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (resolveBuildings(buildings, car, 24)) car.speed *= 0.85;
  clampWorld(car, 24);
}

export function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const l = car.len;
  const w = car.wid;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-l / 2 + 3, -w / 2 + 3, l, w);
  // body
  ctx.fillStyle = car.color;
  roundRect(ctx, -l / 2, -w / 2, l, w, 6);
  ctx.fill();
  // roof + windshield
  ctx.fillStyle = 'rgba(20,24,28,0.85)';
  ctx.fillRect(-l * 0.18, -w / 2 + 4, l * 0.28, w - 8);
  ctx.fillStyle = 'rgba(180,220,240,0.5)';
  ctx.fillRect(l * 0.22, -w / 2 + 4, l * 0.1, w - 8);
  // headlights / taillights
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(l / 2 - 2, -w / 2 + 2, 2, 4);
  ctx.fillRect(l / 2 - 2, w / 2 - 6, 2, 4);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-l / 2, -w / 2 + 2, 2, 4);
  ctx.fillRect(-l / 2, w / 2 - 6, 2, 4);
  if (car.kind === 'cop') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-l * 0.05, -w / 2 + 2, l * 0.12, w - 4);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 2.5);
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 2.5);
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
