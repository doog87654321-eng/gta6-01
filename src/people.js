// The living city: pedestrians on the sidewalks and traffic on the roads.
// Both follow the road grid and turn at intersections; pedestrians flee
// from gunfire, traffic brakes for nothing.

import { CFG } from './config.js';
import { roadCenter } from './city.js';
import { drawCarShape } from './vehicles.js';

const SHIRT = ['#c94f4f', '#4f7fc9', '#c9a44f', '#6a4fc9', '#4fc98a', '#c97fb0', '#e0e0e0', '#3a3a3a'];
const CAR_COLORS = ['#b0483e', '#3e6fb0', '#c9a13e', '#5d8a5a', '#8a5a9e', '#c9c9c9', '#3a3f47', '#b0703e'];

export class Pedestrians {
  constructor(city, rng) {
    this.city = city;
    this.rng = rng;
    this.list = [];
    for (let i = 0; i < CFG.peds.count; i++) this.list.push(this.spawn());
    this.shotAt = null; // {x, y, t} — the last gunshot, for fleeing
  }

  spawn() {
    const rng = this.rng;
    const horizontal = rng.chance(0.5);
    const road = rng.pick(this.city.roads);
    const along = rng.range(140, CFG.land - 140);
    const side = rng.chance(0.5) ? 1 : -1;
    const dir = rng.chance(0.5) ? 1 : -1;
    return {
      axis: horizontal ? 'h' : 'v',
      road, pos: along, dir,
      lane: side * 63,
      speed: rng.range(CFG.peds.walkMin, CFG.peds.walkMax),
      color: rng.pick(SHIRT),
      state: 'walk',
      fleeT: 0,
      fx: 0, fy: 0,
      bob: rng.range(0, Math.PI * 2),
    };
  }

  scare(x, y) { this.shotAt = { x, y, t: 0 }; }

  update(dt, game) {
    const city = this.city;
    for (const p of this.list) {
      if (this.shotAt) {
        const dx = this.px(p) - this.shotAt.x, dy = this.py(p) - this.shotAt.y;
        const d = Math.hypot(dx, dy);
        if (d < 320 && p.state !== 'flee') {
          p.state = 'flee';
          p.fleeT = 2.2;
          p.fx = dx / (d || 1); p.fy = dy / (d || 1);
        }
      }
      if (p.state === 'flee') {
        p.fleeT -= dt;
        p.px = (p.px ?? this.px(p)) + p.fx * CFG.peds.fleeSpeed * dt;
        p.py = (p.py ?? this.py(p)) + p.fy * CFG.peds.fleeSpeed * dt;
        if (p.fleeT <= 0) {
          p.state = 'walk';
          // Rejoin the nearest sidewalk lane.
          const nx = Math.max(60, Math.min(CFG.land - 60, p.px ?? this.px(p)));
          const ny = Math.max(60, Math.min(CFG.land - 60, p.py ?? this.py(p)));
          p.axis = Math.abs(nx - this.px(p)) > Math.abs(ny - this.py(p)) ? 'v' : 'h';
          p.road = p.axis === 'h' ? this.nearestRoad(ny) : this.nearestRoad(nx);
          p.pos = p.axis === 'h' ? nx : ny;
          p.lane = (p.axis === 'h' ? (ny > p.road ? 63 : -63) : (nx > p.road ? 63 : -63));
          p.px = undefined; p.py = undefined;
        }
        continue;
      }
      p.pos += p.dir * p.speed * dt;
      // Turn at an intersection, sometimes.
      for (const c of city.roads) {
        if (Math.abs(p.pos - c) < 5 && this.rng.chance(0.006)) {
          const oldRoad = p.road;
          p.road = c;
          p.pos = oldRoad;
          p.axis = p.axis === 'h' ? 'v' : 'h';
          p.lane = (p.axis === 'h' ? 63 : -63) * (this.rng.chance(0.5) ? 1 : -1);
          if (this.rng.chance(0.5)) p.dir *= -1;
          break;
        }
      }
      if (p.pos < 90) { p.pos = 90; p.dir = 1; }
      if (p.pos > CFG.land - 90) { p.pos = CFG.land - 90; p.dir = -1; }
    }
    if (this.shotAt) { this.shotAt.t += dt; if (this.shotAt.t > 3) this.shotAt = null; }
  }

  px(p) { return p.px ?? (p.axis === 'h' ? p.pos : p.road + p.lane); }
  py(p) { return p.py ?? (p.axis === 'h' ? p.road + p.lane : p.pos); }

  nearestRoad(v) {
    let best = this.city.roads[0], bd = 1e9;
    for (const c of this.city.roads) { const d = Math.abs(v - c); if (d < bd) { bd = d; best = c; } }
    return best;
  }

  draw(ctx, cam) {
    for (const p of this.list) {
      const x = this.px(p) - cam.x, y = this.py(p) - cam.y;
      if (x < -30 || y < -30 || x > CFG.viewW + 30 || y > CFG.viewH + 30) continue;
      const walking = p.state === 'flee' ? 1 : 0.6;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x + 2, y + 4, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c39a';
      ctx.beginPath(); ctx.arc(x, y - 1, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
      void walking;
    }
  }
}

export class Traffic {
  constructor(city, rng) {
    this.city = city;
    this.rng = rng;
    this.list = [];
    for (let i = 0; i < CFG.traffic.count; i++) this.list.push(this.spawn());
  }

  spawn() {
    const rng = this.rng;
    const horizontal = rng.chance(0.5);
    const road = rng.pick(this.city.roads);
    const along = rng.range(140, CFG.land - 140);
    const dir = rng.chance(0.5) ? 1 : -1;
    return {
      axis: horizontal ? 'h' : 'v',
      road, pos: along, dir,
      lane: dir > 0 ? 27 : -27,
      speed: rng.range(CFG.traffic.speedMin, CFG.traffic.speedMax),
      color: rng.pick(CAR_COLORS),
      model: rng.pick(['sedan', 'sedan', 'coupe', 'truck']),
      taxi: rng.chance(0.12),
    };
  }

  update(dt) {
    const city = this.city;
    // Top the traffic back up when the player steals a car.
    while (this.list.length < CFG.traffic.count) this.list.push(this.spawn());
    for (const c of this.list) {
      c.pos += c.dir * c.speed * dt;
      for (const cross of city.roads) {
        if (Math.abs(c.pos - cross) < 6 && this.rng.chance(CFG.traffic.turnChance * dt * 10)) {
          const oldRoad = c.road;
          c.road = cross;
          c.pos = oldRoad;
          c.axis = c.axis === 'h' ? 'v' : 'h';
          c.lane = c.dir > 0 ? 27 : -27;
          break;
        }
      }
      if (c.pos < 80) { c.pos = 80; c.dir = 1; c.lane = 27; }
      if (c.pos > CFG.land - 80) { c.pos = CFG.land - 80; c.dir = -1; c.lane = -27; }
    }
  }

  x(c) { return c.axis === 'h' ? c.pos : c.road + c.lane; }
  y(c) { return c.axis === 'h' ? c.road + c.lane : c.pos; }
  angle(c) {
    if (c.axis === 'h') return c.dir > 0 ? 0 : Math.PI;
    return c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  draw(ctx, cam) {
    for (const c of this.list) {
      const x = this.x(c) - cam.x, y = this.y(c) - cam.y;
      if (x < -80 || y < -80 || x > CFG.viewW + 80 || y > CFG.viewH + 80) continue;
      drawCarShape(ctx, x, y, this.angle(c), c.taxi ? '#e8c33a' : c.color, { model: c.model, taxi: c.taxi });
    }
  }
}
