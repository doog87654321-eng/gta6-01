// Everything the player sees: the city from above, the HUD, the minimap
// and the title / pause / busted screens. All drawing is Canvas 2D.

import { CFG } from './config.js';
import { drawCarShape, roundRect } from './vehicles.js';

function inView(cam, x, y, m) {
  return x > cam.x - m && x < cam.x + CFG.viewW + m && y > cam.y - m && y < cam.y + CFG.viewH + m;
}

export function drawWorld(ctx, game) {
  const { city, cam } = game;
  const vw = CFG.viewW, vh = CFG.viewH;
  const t = game.time;

  // Base: the land is sidewalk grey; the sea is deep blue.
  ctx.fillStyle = CFG.palette.sidewalk;
  ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = CFG.palette.waterDeep;
  const seaX = CFG.land + CFG.beach - cam.x;
  const seaY = CFG.land + CFG.beach - cam.y;
  if (seaX < vw) ctx.fillRect(Math.max(0, seaX), 0, vw, vh);
  if (seaY < vh) ctx.fillRect(0, Math.max(0, seaY), vw, vh);
  // Sand strips along the south and east.
  ctx.fillStyle = CFG.palette.sand;
  if (cam.y + vh > CFG.land) ctx.fillRect(0, CFG.land - cam.y, Math.min(vw, CFG.land - cam.x + CFG.beach), Math.min(vh, CFG.land + CFG.beach - cam.y));
  if (cam.x + vw > CFG.land) ctx.fillRect(CFG.land - cam.x, 0, Math.min(vw, CFG.land + CFG.beach - cam.x), Math.min(vh, CFG.land - cam.y + CFG.beach));
  // Animated wave lines on the water.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const wy = CFG.land + CFG.beach + 30 + i * 46 + Math.sin(t * 0.7 + i) * 6 - cam.y;
    if (wy > -10 && wy < vh + 10) {
      ctx.beginPath();
      for (let x = -20; x <= vw + 20; x += 24) ctx.lineTo(x, wy + Math.sin(x * 0.02 + t + i) * 4);
      ctx.stroke();
    }
  }

  // Blocks: grass for the park, warm plaza for the rest.
  for (let by = 0; by < CFG.blocks; by++) {
    for (let bx = 0; bx < CFG.blocks; bx++) {
      const x0 = bx * CFG.pitch + CFG.road - cam.x;
      const y0 = by * CFG.pitch + CFG.road - cam.y;
      if (x0 < -CFG.block || y0 < -CFG.block || x0 > vw || y0 > vh) continue;
      const isPark = city.park && bx === 1 && by === 6;
      ctx.fillStyle = isPark ? CFG.palette.grass : CFG.palette.plaza;
      ctx.fillRect(x0, y0, CFG.block, CFG.block);
      if (isPark) {
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 + 8, y0 + 8, CFG.block - 16, CFG.block - 16);
      }
    }
  }

  // Roads.
  ctx.fillStyle = CFG.palette.road;
  for (const c of city.roads) {
    const y = c - CFG.road / 2 - cam.y;
    if (y > -CFG.road && y < vh) ctx.fillRect(0, y, vw, CFG.road);
    const x = c - CFG.road / 2 - cam.x;
    if (x > -CFG.road && x < vw) ctx.fillRect(x, 0, CFG.road, vh);
  }
  // Centre dashes.
  ctx.strokeStyle = CFG.palette.lane;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (const c of city.roads) {
    const y = c - cam.y;
    if (y > -10 && y < vh + 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(vw, y); ctx.stroke(); }
    const x = c - cam.x;
    if (x > -10 && x < vw + 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, vh); ctx.stroke(); }
  }
  ctx.setLineDash([]);

  // Buildings.
  for (const b of city.buildings) {
    const x = b.x - cam.x, y = b.y - cam.y;
    if (!inView(cam, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 5, y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h);
    ctx.strokeStyle = CFG.palette.buildingEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, b.w, b.h);
    // Roof details: vents and a skylight.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + b.w * 0.15, y + b.h * 0.2, 26, 18);
    ctx.fillRect(x + b.w * 0.65, y + b.h * 0.55, 22, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x + b.w * 0.4, y + b.h * 0.35, 34, 24);
    if (b.kind === 'garage') {
      ctx.fillStyle = '#2c2f36';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 18 + i * (b.w - 36) / 3, y + b.h - 26, (b.w - 36) / 3 - 10, 22);
      ctx.fillStyle = '#f5d90a';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("BEA'S GARAGE", x + b.w / 2, y + b.h / 2 - 4);
    }
    if (b.kind === 'bank') {
      ctx.fillStyle = '#f5d90a';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CORAL BANK', x + b.w / 2, y + b.h / 2 - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 20 + i * (b.w - 40) / 3, y + 12, 8, b.h - 24);
    }
  }

  // Trees.
  for (const tr of city.trees) {
    const x = tr.x - cam.x, y = tr.y - cam.y;
    if (x < -30 || y < -30 || x > vw + 30 || y > vh + 30) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x + 3, y + 4, tr.r, tr.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    if (tr.palm) {
      ctx.strokeStyle = '#7a5a34';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 14); ctx.stroke();
      ctx.fillStyle = CFG.palette.palm;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.ellipse(x + 4 + Math.cos(a) * 11, y - 14 + Math.sin(a) * 8, 11, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = CFG.palette.parkTree;
      ctx.beginPath(); ctx.arc(x, y, tr.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(x - 3, y - 3, tr.r * 0.55, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Mission marker: a light beam and a pulsing diamond.
  const marker = game.missions.marker();
  if (marker) {
    const x = marker.x - cam.x, y = marker.y - cam.y;
    if (x > -60 && y > -60 && x < vw + 60 && y < vh + 60) {
      const pulse = 1 + Math.sin(t * 5) * 0.15;
      const grad = ctx.createLinearGradient(x, y - 260, x, y);
      grad.addColorStop(0, 'rgba(245,217,10,0)');
      grad.addColorStop(1, 'rgba(245,217,10,0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - 14, y - 260, 28, 260);
      ctx.save();
      ctx.translate(x, y - 30);
      ctx.rotate(Math.PI / 4);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#f5d90a';
      ctx.fillRect(-11, -11, 22, 22);
      ctx.strokeStyle = '#7a6500';
      ctx.lineWidth = 2;
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.restore();
    }
  }

  // Cash stashes glow.
  for (const s of city.stashSpots) {
    if (s.taken) continue;
    const x = s.x - cam.x, y = s.y - cam.y;
    if (x < -20 || y < -20 || x > vw + 20 || y > vh + 20) continue;
    const glow = 0.5 + Math.sin(t * 4) * 0.3;
    ctx.fillStyle = `rgba(80,220,120,${glow})`;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d5c26';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', x, y + 5);
  }

  // The waiting fare and the package.
  if (game.missions.fare) {
    const x = game.missions.fare.x - cam.x, y = game.missions.fare.y - cam.y;
    ctx.fillStyle = '#f5d90a';
    ctx.beginPath(); ctx.arc(x, y - 22, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, y - 17);
  }
  if (game.missions.package) {
    const x = game.missions.package.x - cam.x, y = game.missions.package.y - cam.y;
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(x - 10, y - 8, 20, 16);
    ctx.strokeStyle = '#f5d90a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 10, y - 8, 20, 16);
  }

  // Parked cars.
  for (const c of game.parked) c.draw(ctx, cam);
  // Traffic.
  game.traffic.draw(ctx, cam);
  // Pedestrians.
  game.peds.draw(ctx, cam);
  // Police.
  game.police.draw(ctx, cam);
  // Combat tracers and muzzle flash.
  game.combat.draw(ctx, cam);
  // The player.
  drawPlayer(ctx, game);
  // Particles.
  for (const pt of game.particles) {
    const x = pt.x - cam.x, y = pt.y - cam.y;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.t / 0.5);
    for (let i = 0; i < pt.n; i++) {
      const a = (i / pt.n) * Math.PI * 2 + pt.t * 9;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * (1 - pt.t) * 22, y + Math.sin(a) * (1 - pt.t) * 22, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  const cam = game.cam;
  if (p.car) { p.car.draw(ctx, cam); return; }
  const x = p.x - cam.x, y = p.y - cam.y;
  if (x < -40 || y < -40 || x > CFG.viewW + 40 || y > CFG.viewH + 40) return;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x + 2, y + 5, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Ray Delgado: teal jacket, dark jeans.
  ctx.fillStyle = '#1f8a70';
  ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0d4a3a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath(); ctx.arc(x, y - 1, 6, 0, Math.PI * 2); ctx.fill();
  // Gun barrel toward the aim.
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(p.aimAngle) * 10, y + Math.sin(p.aimAngle) * 10);
  ctx.lineTo(x + Math.cos(p.aimAngle) * 24, y + Math.sin(p.aimAngle) * 24);
  ctx.stroke();
  // Facing tick.
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(p.angle) * 13, y + Math.sin(p.angle) * 13);
  ctx.lineTo(x + Math.cos(p.angle) * 18, y + Math.sin(p.angle) * 18);
  ctx.stroke();
}

export function drawHUD(ctx, game) {
  const p = game.player;
  const vw = CFG.viewW;
  ctx.textAlign = 'left';
  // Cash and health, top left.
  ctx.fillStyle = 'rgba(10,14,20,0.55)';
  roundRect(ctx, 14, 12, 210, 74, 8); ctx.fill();
  ctx.fillStyle = '#7de38b';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('$' + game.cash.toLocaleString('en-US'), 26, 42);
  ctx.fillStyle = '#222';
  ctx.fillRect(26, 52, 186, 10);
  ctx.fillStyle = p.health > 35 ? '#4fc94f' : '#e84a4a';
  ctx.fillRect(26, 52, 186 * Math.max(0, p.health / 100), 10);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText('HEALTH', 26, 78);
  // Ammo, under the cash.
  ctx.fillStyle = 'rgba(10,14,20,0.55)';
  roundRect(ctx, 14, 94, 210, 30, 8); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(p.reloading ? 'RELOADING…' : `AMMO  ${p.ammo} / ${CFG.player.mag}`, 26, 115);

  // Wanted stars, top right.
  const stars = game.police.stars;
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? '#ffd21f' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', vw - 24 - i * 32, 44);
  }
  ctx.textAlign = 'left';

  // Objective, top centre.
  const obj = game.missions.objectiveText();
  ctx.font = 'bold 15px sans-serif';
  const w = ctx.measureText(obj).width + 28;
  ctx.fillStyle = 'rgba(10,14,20,0.6)';
  roundRect(ctx, vw / 2 - w / 2, 12, w, 32, 8); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.fillText(obj, vw / 2, 34);
  ctx.textAlign = 'left';
  if (!game.missions.done) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#9fb4c8';
    ctx.textAlign = 'center';
    ctx.fillText(`MISSION ${game.missions.index + 1} OF 6 — ${game.missions.def.title}`, vw / 2, 66);
    ctx.textAlign = 'left';
  }

  // Bank grab progress.
  if (game.missions.index === 5 && game.missions.step === 1 && game.missions.grabT > 0) {
    const bw = 240;
    ctx.fillStyle = 'rgba(10,14,20,0.7)';
    roundRect(ctx, vw / 2 - bw / 2, 90, bw, 20, 6); ctx.fill();
    ctx.fillStyle = '#f5d90a';
    ctx.fillRect(vw / 2 - bw / 2 + 3, 93, (bw - 6) * Math.min(1, game.missions.grabT / 3), 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GRABBING THE CASH…', vw / 2, 84);
    ctx.textAlign = 'left';
  }

  // Banner.
  if (game.banner) {
    ctx.globalAlpha = Math.min(1, game.banner.t);
    ctx.font = 'bold 19px sans-serif';
    const bw2 = ctx.measureText(game.banner.text).width + 36;
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    roundRect(ctx, vw / 2 - bw2 / 2, 130, bw2, 36, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(game.banner.text, vw / 2, 154);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Speed, bottom centre-right, when driving.
  if (p.car) {
    const mph = Math.round(Math.abs(p.car.speed) * 0.12);
    ctx.fillStyle = 'rgba(10,14,20,0.55)';
    roundRect(ctx, vw - 300, CFG.viewH - 52, 92, 36, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${mph} mph`, vw - 216, CFG.viewH - 26);
    ctx.textAlign = 'left';
    if (p.car.health < 100) {
      ctx.fillStyle = '#222';
      ctx.fillRect(vw - 300, CFG.viewH - 62, 92, 6);
      ctx.fillStyle = p.car.health > 35 ? '#4fc94f' : '#e84a4a';
      ctx.fillRect(vw - 300, CFG.viewH - 62, 92 * Math.max(0, p.car.health / 100), 6);
    }
  }

  // "E" prompt when a car is near on foot.
  if (!p.car && game.state === 'playing') {
    const found = game.nearestCar(75);
    if (found) {
      ctx.font = 'bold 15px sans-serif';
      const label = found.kind === 'traffic' ? 'E — STEAL CAR' : 'E — GET IN';
      const lw = ctx.measureText(label).width + 24;
      ctx.fillStyle = 'rgba(10,14,20,0.65)';
      roundRect(ctx, vw / 2 - lw / 2, CFG.viewH - 110, lw, 30, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(label, vw / 2, CFG.viewH - 90);
      ctx.textAlign = 'left';
    }
  }

  // Controls hint, bottom left.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD move / drive · Mouse aim · Click shoot · E enter car · R reload · Esc pause · M mute', 16, CFG.viewH - 14);

  drawMinimap(ctx, game);
}

export function drawMinimap(ctx, game) {
  const size = 190;
  const x0 = CFG.viewW - size - 14;
  const y0 = CFG.viewH - size - 14;
  const s = size / CFG.world;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  roundRect(ctx, x0 - 4, y0 - 4, size + 8, size + 8, 8); ctx.fill();
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  ctx.fillStyle = CFG.palette.waterDeep;
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#3a3f47';
  ctx.fillRect(x0, y0, CFG.land * s, CFG.land * s);
  ctx.fillStyle = '#6f747c';
  for (const b of game.city.buildings) ctx.fillRect(x0 + b.x * s, y0 + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s));
  ctx.fillStyle = '#e3cd96';
  ctx.fillRect(x0 + CFG.land * s, y0, CFG.beach * s, CFG.land * s);
  ctx.fillRect(x0, y0 + CFG.land * s, CFG.land * s, CFG.beach * s);
  // Traffic dots.
  ctx.fillStyle = 'rgba(220,220,220,0.8)';
  for (const c of game.traffic.list) ctx.fillRect(x0 + game.traffic.x(c) * s - 1, y0 + game.traffic.y(c) * s - 1, 2, 2);
  // Police, red.
  ctx.fillStyle = '#ff3b30';
  for (const c of game.police.cars) { ctx.beginPath(); ctx.arc(x0 + c.x * s, y0 + c.y * s, 3, 0, Math.PI * 2); ctx.fill(); }
  for (const c of game.police.cops) { ctx.beginPath(); ctx.arc(x0 + c.x * s, y0 + c.y * s, 2, 0, Math.PI * 2); ctx.fill(); }
  // Mission marker, yellow.
  const m = game.missions.marker();
  if (m) {
    ctx.fillStyle = '#f5d90a';
    ctx.beginPath(); ctx.arc(x0 + m.x * s, y0 + m.y * s, 4, 0, Math.PI * 2); ctx.fill();
  }
  // The player, white with a dark ring.
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x0 + game.player.x * s, y0 + game.player.y * s, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x0 + game.player.x * s, y0 + game.player.y * s, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, x0 - 4, y0 - 4, size + 8, size + 8, 8); ctx.stroke();
}

export function drawTitle(ctx, game) {
  const vw = CFG.viewW, vh = CFG.viewH;
  const grad = ctx.createLinearGradient(0, 0, 0, vh);
  grad.addColorStop(0, 'rgba(8,12,20,0.82)');
  grad.addColorStop(0.55, 'rgba(8,12,20,0.45)');
  grad.addColorStop(1, 'rgba(8,12,20,0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5d90a';
  ctx.font = 'bold 74px sans-serif';
  ctx.fillText('CORAL BAY', vw / 2, 190);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('HOT STREETS', vw / 2, 252);
  ctx.fillStyle = '#c9d6e2';
  ctx.font = '17px sans-serif';
  ctx.fillText('You are Ray Delgado, getaway driver. Bea runs the garage —', vw / 2, 300);
  ctx.fillText('six jobs stand between you and the big bank score.', vw / 2, 324);
  const save = game.save;
  if (save && save.mission > 0) {
    ctx.fillStyle = '#7de38b';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Save found — Mission ${save.mission + 1} of 6 · $${save.cash.toLocaleString('en-US')}`, vw / 2, 372);
  }
  const blink = 0.6 + Math.sin(game.time * 3) * 0.4;
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(save && save.mission > 0 ? 'CLICK TO CONTINUE' : 'CLICK TO START', vw / 2, 440);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '15px sans-serif';
  ctx.fillText('WASD / arrows — walk & drive · Shift — run · Mouse — aim · Click — shoot', vw / 2, 520);
  ctx.fillText('E — enter / steal a car · R — reload · Esc — pause · M — mute', vw / 2, 546);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '12px sans-serif';
  ctx.fillText('An original game. No Rockstar assets, names or maps — Coral Bay is entirely made up.', vw / 2, 640);
  ctx.textAlign = 'left';
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(8,12,20,0.72)';
  ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('PAUSED', CFG.viewW / 2, 300);
  ctx.fillStyle = '#c9d6e2';
  ctx.font = '17px sans-serif';
  ctx.fillText('Esc to resume · progress is saved', CFG.viewW / 2, 350);
  ctx.textAlign = 'left';
}

export function drawEnd(ctx, kind, cash) {
  ctx.fillStyle = kind === 'busted' ? 'rgba(20,8,30,0.78)' : 'rgba(30,8,8,0.78)';
  ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
  ctx.textAlign = 'center';
  ctx.fillStyle = kind === 'busted' ? '#b08cff' : '#ff5a4a';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText(kind === 'busted' ? 'BUSTED' : 'WASTED', CFG.viewW / 2, 320);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText(kind === 'busted' ? 'The Coral Bay PD hauled you in. Bail cost you $150.' : 'Ray went down. The crew patched him up for $150.', CFG.viewW / 2, 372);
  ctx.fillStyle = '#7de38b';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`Cash left: $${cash.toLocaleString('en-US')}`, CFG.viewW / 2, 404);
  const blink = 0.6 + Math.sin(Date.now() / 300) * 0.4;
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('CLICK TO GET BACK ON THE STREET', CFG.viewW / 2, 470);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
