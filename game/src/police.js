// The wanted level and the Coral Bay PD. Stars rise with crimes and fade
// after 20 quiet seconds. Cop cars spawn at the city edge and chase; when
// the player is on foot, foot cops run them down and arrest them if they
// hold on for 1.5 seconds.

import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { makeCar, steerCar, drawCar } from './vehicles.js';
import { nearestRoadPoint, clampWorld } from './city.js';

export class Police {
  constructor(city) {
    this.city = city;
    this.stars = 0;
    this.quietT = 0;      // seconds since the last crime / cop contact
    this.copCars = [];
    this.footCops = [];
    this.arrestT = 0;     // seconds a foot cop has held the player
    this.spawnT = 0;
    this.rng = makeRng(4242);
  }

  addHeat(n) {
    const before = this.stars;
    this.stars = Math.max(0, Math.min(5, this.stars + n));
    this.quietT = 0;
    if (this.stars > before) this.spawnT = 0; // spawn reinforcements now
  }

  wantedCars() {
    if (this.stars === 0) return 0;
    if (this.stars <= 2) return 1;
    if (this.stars === 3) return 2;
    if (this.stars === 4) return 3;
    return 4;
  }

  wantedCops() {
    if (this.stars === 0) return 0;
    if (this.stars === 1) return 1;
    if (this.stars === 2) return 2;
    return 3;
  }

  spawnCopCar(player) {
    const r = this.rng;
    // Spawn on a road at the city edge, away from the player.
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 12; tries++) {
      const edge = r.int(0, 3);
      if (edge === 0) { x = r.int(0, 8) * CFG.PITCH; y = 40; }
      else if (edge === 1) { x = r.int(0, 8) * CFG.PITCH; y = CFG.LAND - 40; }
      else if (edge === 2) { x = 40; y = r.int(0, 8) * CFG.PITCH; }
      else { x = CFG.LAND - 40; y = r.int(0, 8) * CFG.PITCH; }
      if (Math.hypot(x - player.x, y - player.y) > 500) break;
    }
    const car = makeCar(x, y, 0, CFG.COL.copCar, 'cop');
    car.speed = 200;
    this.copCars.push(car);
  }

  spawnFootCop(player) {
    const r = this.rng;
    const a = r.range(0, Math.PI * 2);
    const d = r.range(320, 480);
    const cop = {
      x: player.x + Math.cos(a) * d,
      y: player.y + Math.sin(a) * d,
      angle: 0,
      speed: 0,
      hp: CFG.COP_HP,
      dead: false,
      shootT: r.range(0.5, 1.5),
    };
    clampWorld(cop, 16);
    this.footCops.push(cop);
  }

  update(dt, player, game) {
    const city = this.city;
    // Wanted decay: quiet and out of sight for 20 seconds loses a star.
    const nearestCop = this.nearestCopDist(player);
    if (this.stars > 0) {
      if (nearestCop > 420) this.quietT += dt;
      else this.quietT = 0;
      if (this.quietT >= CFG.WANTED_DECAY_S) {
        this.stars -= 1;
        this.quietT = 0;
        if (this.stars === 0) {
          this.copCars = [];
          this.footCops = [];
        }
      }
    }

    // Keep the right number of units on the street.
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 2.5;
      while (this.copCars.length < this.wantedCars()) this.spawnCopCar(player);
      while (this.footCops.filter((c) => !c.dead).length < this.wantedCops() && !player.inCar) {
        this.spawnFootCop(player);
      }
    }
    this.copCars = this.copCars.filter((c) => !c.dead);
    this.footCops = this.footCops.filter((c) => !c.dead);

    // Cop cars chase and ram.
    for (const car of this.copCars) {
      const target = Math.atan2(player.y - car.y, player.x - car.x);
      const cruise = 300 + this.stars * 45;
      steerCar(car, target, cruise, dt, city.buildings);
      const d = Math.hypot(player.x - car.x, player.y - car.y);
      if (d < 46) {
        // Ram: shove the player and damage them.
        const push = 260 * dt;
        const nx = (player.x - car.x) / (d || 1);
        const ny = (player.y - car.y) / (d || 1);
        if (player.inCar && player.car) {
          player.car.x += nx * push;
          player.car.y += ny * push;
          player.car.speed *= 0.86;
          player.x = player.car.x;
          player.y = player.car.y;
        } else {
          player.x += nx * push;
          player.y += ny * push;
        }
        player.hp -= CFG.COP_RAM_DMG * dt * 2;
        this.quietT = 0;
      }
    }

    // Foot cops: run at the player, shoot when close, arrest on contact.
    let held = false;
    for (const cop of this.footCops) {
      if (cop.dead) continue;
      const d = Math.hypot(player.x - cop.x, player.y - cop.y);
      cop.angle = Math.atan2(player.y - cop.y, player.x - cop.x);
      if (d > 240) {
        cop.speed = 165;
      } else if (d > 34) {
        cop.speed = 120;
      } else {
        cop.speed = 0;
        held = true;
      }
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      // Shoot at the player from range.
      cop.shootT -= dt;
      if (d < 300 && d > 60 && cop.shootT <= 0) {
        cop.shootT = 1.4 + Math.random() * 0.8;
        if (Math.random() < 0.45) {
          player.hp -= 6;
          game.effects.push({ kind: 'shot', x: cop.x, y: cop.y, tx: player.x, ty: player.y, t: 0.08 });
        }
      }
    }
    if (held && !player.inCar) {
      this.arrestT += dt;
      if (this.arrestT >= CFG.ARREST_S) {
        this.arrestT = 0;
        game.busted();
      }
    } else {
      this.arrestT = 0;
    }
  }

  nearestCopDist(player) {
    let best = Infinity;
    for (const c of this.copCars) best = Math.min(best, Math.hypot(player.x - c.x, player.y - c.y));
    for (const c of this.footCops) {
      if (!c.dead) best = Math.min(best, Math.hypot(player.x - c.x, player.y - c.y));
    }
    return best;
  }

  draw(ctx) {
    for (const car of this.copCars) drawCar(ctx, car);
    for (const cop of this.footCops) {
      if (cop.dead) continue;
      ctx.save();
      ctx.translate(cop.x, cop.y);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(2, 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CFG.COL.cop;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfe6ee';
      ctx.beginPath();
      ctx.arc(Math.cos(cop.angle) * 3, Math.sin(cop.angle) * 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
