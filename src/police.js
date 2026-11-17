// The Coral Bay PD: a wanted level, police cars that chase and ram, and
// foot cops that shoot and arrest. Wanted stars rise with crimes and fade
// when the player stays quiet and out of sight.

import { CFG } from './config.js';
import { Car } from './vehicles.js';
import { randomRoadPoint } from './city.js';

const COP_COLORS = ['#e8e8e8'];

export class Police {
  constructor(city, rng) {
    this.city = city;
    this.rng = rng;
    this.stars = 0;
    this.lastCrimeT = -999;
    this.decayT = 0;
    this.cars = []; // Car instances, police: true
    this.cops = []; // foot cops {x, y, health, shootT, ramT}
    this.time = 0;
  }

  addCrime(n, game) {
    this.stars = Math.min(CFG.wanted.maxStars, this.stars + n);
    this.lastCrimeT = game.time;
    game.bestWanted = Math.max(game.bestWanted, this.stars);
  }

  nearestCopDist(game) {
    let best = 1e9;
    const px = game.player.x, py = game.player.y;
    for (const c of this.cars) best = Math.min(best, Math.hypot(c.x - px, c.y - py));
    for (const c of this.cops) best = Math.min(best, Math.hypot(c.x - px, c.y - py));
    return best;
  }

  update(dt, game) {
    this.time += dt;
    const player = game.player;
    // Wanted decays when quiet and unseen.
    if (this.stars > 0 && this.time - this.lastCrimeT > CFG.police.decayQuiet && this.nearestCopDist(game) > 420) {
      this.decayT += dt;
      if (this.decayT > CFG.police.decayStep) { this.stars--; this.decayT = 0; }
    } else {
      this.decayT = 0;
    }

    // Keep the right number of police cars on the street.
    const want = CFG.police.carsByStars[this.stars];
    while (this.cars.length < want) {
      const p = randomRoadPoint(this.city, this.rng);
      // Spawn a few blocks away, never on top of the player.
      if (Math.hypot(p.x - player.x, p.y - player.y) < 500) continue;
      const car = new Car(p.x, p.y, 0, '#e8e8e8', 'sedan');
      car.police = true;
      car._city = this.city;
      this.cars.push(car);
    }
    // Despawn cars that lost the player far away.
    this.cars = this.cars.filter((c) => {
      if (Math.hypot(c.x - player.x, c.y - player.y) > 1200 && this.stars === 0) return false;
      return true;
    });

    // Police cars chase: steer toward the player and ram.
    for (const c of this.cars) {
      const tx = player.car ? player.car.x : player.x;
      const ty = player.car ? player.car.y : player.y;
      const wantAngle = Math.atan2(ty - c.y, tx - c.x);
      let diff = wantAngle - c.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const dist = Math.hypot(tx - c.x, ty - c.y);
      c.setInput(dist > 90, false, diff < -0.08, diff > 0.08);
      // Slow down when close so the ram is a bump, not a teleport.
      const before = c.speed;
      c.drive(dt, this.city, this.cars.concat(player.car ? [player.car] : []));
      void before;
      if (player.car && !player.car.wrecked) {
        const d = Math.hypot(c.x - player.car.x, c.y - player.car.y);
        if (d < 46 && Math.abs(c.speed) > 120) {
          player.car.health -= CFG.police.ramDamage * dt * 8;
          c.speed *= 0.6;
          if (game.sfx) game.sfx.thud();
        }
      }
      // A police car that gets close to a player on foot drops a foot cop.
      if (!player.car && dist < 150 && this.cops.length < 2 + this.stars && this.rng.chance(dt * 0.5)) {
        this.cops.push({ x: c.x + 30, y: c.y + 30, health: 100, shootT: 0.6, flash: 0 });
      }
    }

    // Foot cops chase on foot, shoot when the heat is on, arrest on touch.
    // Once the player is in a car the foot cops lose them.
    if (player.car) { this.cops.length = 0; return; }
    for (const cop of this.cops) {
      const dx = player.x - cop.x, dy = player.y - cop.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = CFG.police.footSpeed * dt;
      cop.x += (dx / d) * step;
      cop.y += (dy / d) * step;
      cop.shootT -= dt;
      if (this.stars >= 2 && d < CFG.police.copShotRange && cop.shootT <= 0 && !player.car) {
        cop.shootT = CFG.police.copShotInterval;
        if (this.rng.chance(0.65)) {
          player.health -= CFG.police.copShotDamage;
          game.combat.addTracer(cop.x, cop.y, player.x, player.y, '#ff6a5e');
          if (game.sfx) game.sfx.shot();
        }
      }
      if (d < CFG.police.arrestRadius && !player.car) {
        game.busted();
      }
    }
    this.cops = this.cops.filter((c) => c.health > 0);
    if (this.stars === 0) this.cops.length = 0;
  }

  draw(ctx, cam) {
    const flash = Math.sin(this.time * 9) > 0 ? 1 : -1;
    for (const c of this.cars) c.draw(ctx, cam, flash);
    for (const cop of this.cops) {
      const x = cop.x - cam.x, y = cop.y - cam.y;
      if (x < -30 || y < -30 || x > CFG.viewW + 30 || y > CFG.viewH + 30) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x + 2, y + 4, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d2f4a';
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c39a';
      ctx.beginPath(); ctx.arc(x, y - 1, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8b13a';
      ctx.fillRect(x - 5, y - 9, 10, 3);
      void COP_COLORS;
    }
  }
}
