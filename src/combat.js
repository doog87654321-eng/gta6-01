// Combat: hitscan shooting with tracers and muzzle flash. The player
// shoots with the mouse; foot cops shoot back (police.js). Pedestrians,
// traffic cars, police cars and foot cops can all be hit.

import { CFG } from './config.js';

export class Combat {
  constructor() {
    this.tracers = []; // {x1,y1,x2,y2,t,color}
    this.muzzle = null; // {x,y,t}
  }

  addTracer(x1, y1, x2, y2, color) {
    this.tracers.push({ x1, y1, x2, y2, t: 0.09, color: color || '#ffd76a' });
  }

  // Fire one hitscan round from (x, y) along angle. Returns the hit point.
  shoot(game, x, y, angle) {
    const range = CFG.player.shotRange;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let bestT = range, hit = null, hitKind = null;
    const test = (cx, cy, r, kind, ref) => {
      const ox = cx - x, oy = cy - y;
      const t = ox * dx + oy * dy;
      if (t < 0 || t > bestT) return;
      const px = x + dx * t, py = y + dy * t;
      const d = Math.hypot(cx - px, cy - py);
      if (d < r) { bestT = t; hit = ref; hitKind = kind; }
    };
    for (const p of game.peds.list) test(game.peds.px(p), game.peds.py(p), 12, 'ped', p);
    for (const cop of game.police.cops) test(cop.x, cop.y, 12, 'cop', cop);
    for (const c of game.traffic.list) test(game.traffic.x(c), game.traffic.y(c), 26, 'traffic', c);
    for (const c of game.police.cars) test(c.x, c.y, 26, 'police', c);
    if (game.player.car && game.player.car !== null) {
      // The player's own car never blocks a shot.
    }
    const hx = x + dx * bestT, hy = y + dy * bestT;
    this.addTracer(x, y, hx, hy);
    this.muzzle = { x, y, t: 0.05 };
    game.peds.scare(hx, hy);
    if (hit) {
      if (hitKind === 'ped') {
        game.peds.list = game.peds.list.filter((p) => p !== hit);
        game.peds.list.push(game.peds.spawn());
        game.police.addCrime(CFG.wanted.kill, game);
      } else if (hitKind === 'cop') {
        hit.health -= CFG.player.shotDamage;
        game.police.addCrime(CFG.wanted.shoot, game);
        if (hit.health <= 0) game.police.addCrime(CFG.wanted.kill, game);
      } else if (hitKind === 'traffic') {
        hit.hp = (hit.hp ?? 68) - CFG.player.shotDamage;
        if (hit.hp <= 0) hit.speed = 0;
        game.police.addCrime(CFG.wanted.shoot, game);
      } else if (hitKind === 'police') {
        hit.health -= CFG.player.shotDamage;
        if (hit.health <= 0) hit.wrecked = true;
        game.police.addCrime(CFG.wanted.shoot, game);
      }
      game.particles.push({ x: hx, y: hy, t: 0.25, color: '#ff5a4a', n: 8 });
    } else {
      game.particles.push({ x: hx, y: hy, t: 0.15, color: '#c9c9c9', n: 4 });
    }
    return { x: hx, y: hy };
  }

  update(dt) {
    for (const t of this.tracers) t.t -= dt;
    this.tracers = this.tracers.filter((t) => t.t > 0);
    if (this.muzzle) { this.muzzle.t -= dt; if (this.muzzle.t <= 0) this.muzzle = null; }
  }

  draw(ctx, cam) {
    for (const t of this.tracers) {
      ctx.strokeStyle = t.color;
      ctx.globalAlpha = Math.max(0, t.t / 0.09);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x1 - cam.x, t.y1 - cam.y);
      ctx.lineTo(t.x2 - cam.x, t.y2 - cam.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (this.muzzle) {
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(this.muzzle.x - cam.x, this.muzzle.y - cam.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
