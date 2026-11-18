// Hitscan shooting: the player aims with the mouse and clicks. The shot
// travels to the first thing it meets — a pedestrian, a foot cop, a car —
// and leaves a tracer and a muzzle flash behind. Cars shot to a stop stall
// for a few seconds, then pull away again.

import { CFG } from './config.js';

export class Combat {
  constructor() {
    this.tracers = [];   // {x, y, tx, ty, t}
    this.reloadT = 0;
    this.muzzleT = 0;
  }

  get reloading() {
    return this.reloadT > 0;
  }

  startReload() {
    this.reloadT = CFG.RELOAD_S;
  }

  update(dt) {
    if (this.reloadT > 0) this.reloadT -= dt;
    if (this.muzzleT > 0) this.muzzleT -= dt;
    for (const t of this.tracers) t.t -= dt;
    this.tracers = this.tracers.filter((t) => t.t > 0);
  }

  // Fire one shot from (x, y) along angle. Returns 'hit' | 'miss' | 'empty'.
  shoot(game, x, y, angle) {
    const player = game.player;
    if (this.reloadT > 0) return 'empty';
    if (player.ammo <= 0) {
      this.startReload();
      game.sfx.reload();
      return 'empty';
    }
    player.ammo -= 1;
    this.muzzleT = 0.06;
    game.sfx.shot();
    const tx = x + Math.cos(angle) * CFG.SHOT_RANGE;
    const ty = y + Math.sin(angle) * CFG.SHOT_RANGE;
    let bestD = CFG.SHOT_RANGE;
    let hit = null;

    const consider = (ox, oy, r, obj, kind) => {
      // distance from the shot line to the object's centre
      const dx = ox - x;
      const dy = oy - y;
      const along = dx * Math.cos(angle) + dy * Math.sin(angle);
      if (along < 0 || along > bestD) return;
      const perp = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
      if (perp <= r + 6) {
        bestD = along;
        hit = { obj, kind, hx: x + Math.cos(angle) * along, hy: y + Math.sin(angle) * along };
      }
    };

    for (const p of game.peds) if (!p.dead) consider(p.x, p.y, 10, p, 'ped');
    for (const c of game.police.footCops) if (!c.dead) consider(c.x, c.y, 11, c, 'cop');
    for (const c of game.traffic) {
      if (c.dead) continue;
      consider(c.x, c.y, 26, c, 'car');
    }
    for (const c of game.police.copCars) {
      if (c.dead) continue;
      consider(c.x, c.y, 26, c, 'copcar');
    }

    const endX = hit ? hit.hx : tx;
    const endY = hit ? hit.hy : ty;
    this.tracers.push({ x, y, tx: endX, ty: endY, t: 0.09 });

    if (!hit) return 'miss';
    if (hit.kind === 'ped') {
      hit.obj.hp -= CFG.SHOT_DMG;
      if (hit.obj.hp <= 0) {
        hit.obj.dead = true;
        game.police.addHeat(1);
      }
      game.danger = { x: hit.hx, y: hit.hy };
    } else if (hit.kind === 'cop') {
      hit.obj.hp -= CFG.SHOT_DMG;
      if (hit.obj.hp <= 0) {
        hit.obj.dead = true;
        game.police.addHeat(1);
      }
    } else if (hit.kind === 'car' || hit.kind === 'copcar') {
      hit.obj.hp -= CFG.SHOT_DMG;
      // Cars don't die, they stall: shot to a stop for 3 seconds.
      if (hit.obj.hp <= 0) {
        hit.obj.hp = 100;
        hit.obj.stalled = 3;
        hit.obj.speed = 0;
        if (hit.kind === 'copcar') game.police.addHeat(1);
      }
    }
    return 'hit';
  }

  draw(ctx) {
    for (const t of this.tracers) {
      ctx.strokeStyle = `rgba(255, 240, 160, ${Math.max(0, t.t / 0.09)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.tx, t.ty);
      ctx.stroke();
    }
  }
}
