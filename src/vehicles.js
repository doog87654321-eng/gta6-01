// Cars the player drives, steals and wrecks. One physics model serves the
// player's car and the police cars; traffic cars are lighter (people.js).

import { CFG } from './config.js';
import { resolveCircle } from './city.js';

// Draw a top-down car. `opts` may carry model ('sedan' | 'coupe' | 'truck'),
// taxi (yellow cab with a roof sign) or police (white body, black doors,
// flashing light bar driven by opts.flash in [-1, 1]).
export function drawCarShape(ctx, x, y, angle, color, opts) {
  opts = opts || {};
  const L = opts.model === 'truck' ? 78 : (opts.model === 'coupe' ? 56 : CFG.car.length);
  const W = opts.model === 'truck' ? 34 : CFG.car.width;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-L / 2 + 3, -W / 2 + 4, L, W);
  // Wheels.
  ctx.fillStyle = '#151515';
  const wl = L * 0.28, ww = 6;
  ctx.fillRect(-L / 2 + 6, -W / 2 - 3, wl, ww);
  ctx.fillRect(-L / 2 + 6, W / 2 - 3, wl, ww);
  ctx.fillRect(L / 2 - 6 - wl, -W / 2 - 3, wl, ww);
  ctx.fillRect(L / 2 - 6 - wl, W / 2 - 3, wl, ww);
  // Body.
  ctx.fillStyle = color;
  roundRect(ctx, -L / 2, -W / 2, L, W, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Hood and boot shading.
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(L / 2 - 14, -W / 2 + 3, 11, W - 6);
  // Windshield and rear window.
  ctx.fillStyle = '#1c2733';
  roundRect(ctx, L * 0.08, -W / 2 + 4, L * 0.16, W - 8, 3);
  ctx.fill();
  roundRect(ctx, -L * 0.3, -W / 2 + 4, L * 0.1, W - 8, 3);
  ctx.fill();
  if (opts.model === 'truck') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-L / 2 + 4, -W / 2 + 4, L * 0.42, W - 8);
  }
  if (opts.taxi) {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-8, -W / 2 + 2, 16, 5);
    ctx.fillStyle = '#f5d90a';
    ctx.fillRect(-7, -14, 14, 7);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, -8.5);
  }
  if (opts.police) {
    // Black doors on a white body.
    ctx.fillStyle = '#14181d';
    ctx.fillRect(-L * 0.12, -W / 2 + 2, L * 0.24, W - 4);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    // Light bar, flashing red / blue.
    const flash = opts.flash || 0;
    ctx.fillStyle = flash > 0 ? '#ff2e2e' : '#3a86ff';
    ctx.beginPath(); ctx.arc(-6, -W / 2 + 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash > 0 ? '#3a86ff' : '#ff2e2e';
    ctx.beginPath(); ctx.arc(6, -W / 2 + 2, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Headlights.
  ctx.fillStyle = 'rgba(255,244,180,0.95)';
  ctx.fillRect(L / 2 - 2, -W / 2 + 5, 3, 6);
  ctx.fillRect(L / 2 - 2, W / 2 - 11, 3, 6);
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

export class Car {
  constructor(x, y, angle, color, model) {
    this.x = x; this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.color = color;
    this.model = model || 'sedan';
    this.health = CFG.car.health;
    this.wrecked = false;
    this.taxi = false;
    this.smoke = 0;
  }

  get length() { return this.model === 'truck' ? 78 : (this.model === 'coupe' ? 56 : CFG.car.length); }

  // Drive with W/S (gas/brake/reverse) and A/D (steer). Returns the speed
  // change so the caller can play crash sounds on hard hits.
  drive(dt, city, others) {
    // A wrecked car stays wrecked: no throttle, no steering, no drift.
    if (this.wrecked) { this.speed = 0; return this.speed; }
    const k = CFG.car;
    let throttle = 0, steer = 0;
    if (this._gas) throttle += 1;
    if (this._brake) throttle -= 1;
    if (this._left) steer -= 1;
    if (this._right) steer += 1;
    if (throttle > 0) this.speed += k.accel * dt;
    else if (throttle < 0) {
      if (this.speed > 30) this.speed -= k.brake * dt;
      else this.speed -= k.accel * 0.55 * dt;
    } else {
      this.speed -= this.speed * 1.6 * dt;
      if (Math.abs(this.speed) < 4) this.speed = 0;
    }
    this.speed = Math.max(-k.reverseMax, Math.min(k.maxSpeed, this.speed));
    const grip = Math.min(1, Math.abs(this.speed) / 140);
    this.angle += steer * k.turn * grip * dt * (this.speed >= 0 ? 1 : -1);
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    this.x = nx; this.y = ny;
    const hitWall = resolveCircle(this._city || city, this, 20);
    if (hitWall && Math.abs(this.speed) > 180) {
      this.health -= Math.abs(this.speed) * 0.03;
      this.speed *= 0.45;
    }
    // Bump into other cars.
    for (const o of others || []) {
      if (o === this || o.wrecked) continue;
      const dx = this.x - o.x, dy = this.y - o.y;
      const d = Math.hypot(dx, dy);
      const min = 44;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d, uy = dy / d;
        this.x += ux * push; this.y += uy * push;
        if (o.x !== undefined && o.speed !== undefined) { o.x -= ux * push; o.y -= uy * push; }
        if (Math.abs(this.speed) > 200) { this.health -= 4; this.speed *= 0.8; }
      }
    }
    if (this.health <= 0 && !this.wrecked) { this.wrecked = true; this.speed = 0; }
    if (this.wrecked) this.smoke = Math.min(1, this.smoke + dt);
    return this.speed;
  }

  setInput(gas, brake, left, right) {
    this._gas = gas; this._brake = brake; this._left = left; this._right = right;
  }

  draw(ctx, cam, flash) {
    const x = this.x - cam.x, y = this.y - cam.y;
    if (x < -90 || y < -90 || x > CFG.viewW + 90 || y > CFG.viewH + 90) return;
    if (this.wrecked) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.angle + 0.2);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#222';
      roundRect(ctx, -this.length / 2, -CFG.car.width / 2, this.length, CFG.car.width, 9);
      ctx.fill();
      ctx.restore();
      if (this.smoke > 0) {
        ctx.fillStyle = `rgba(60,60,60,${0.35 * this.smoke})`;
        ctx.beginPath();
        ctx.arc(x + Math.sin(performance.now() / 300) * 6, y - 14 - this.smoke * 10, 10 + this.smoke * 14, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    drawCarShape(ctx, x, y, this.angle, this.color, { model: this.model, taxi: this.taxi, police: this.police, flash });
  }
}
