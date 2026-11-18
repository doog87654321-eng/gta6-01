// All drawing: the city, the entities, the HUD, the minimap and the
// menus. The camera transform is applied once; HUD and menus draw in
// screen space afterwards.

import { CFG } from './config.js';
import { drawCar } from './vehicles.js';
import { drawPed } from './people.js';

const VIEW_W = 1280;
const VIEW_H = 720;

export function drawGame(ctx, game) {
  const city = game.city;
  const cam = game.camera;
  ctx.save();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.translate(-cam.x, -cam.y);

  drawGround(ctx, city);
  drawRoads(ctx, city);
  drawPark(ctx, city);
  drawDocks(ctx, city);
  drawBuildings(ctx, city);
  drawStashes(ctx, city);
  drawMarker(ctx, game);

  for (const car of game.traffic) drawCar(ctx, car);
  game.police.draw(ctx);
  for (const p of game.peds) {
    if (!p.dead) drawPed(ctx, p);
  }
  drawPlayer(ctx, game);
  game.combat.draw(ctx);
  drawParticles(ctx, game);

  ctx.restore();

  drawHUD(ctx, game);
  drawMinimap(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  if (game.state === 'paused') drawPaused(ctx);
  if (game.state === 'busted') drawEnd(ctx, 'BUSTED', 'The Coral Bay PD caught you. $100 fine. Click or press R to get back out.');
  if (game.state === 'wasted') drawEnd(ctx, 'WASTED', 'You got taken out. Click or press R to try again.');
}

function drawGround(ctx, city) {
  const COL = CFG.COL;
  // Land base.
  ctx.fillStyle = COL.grass;
  ctx.fillRect(0, 0, CFG.LAND, CFG.LAND);
  // Beach and sea.
  ctx.fillStyle = COL.sand;
  ctx.fillRect(city.beach.x, 0, city.beach.w, CFG.LAND);
  ctx.fillStyle = COL.sea;
  ctx.fillRect(city.sea.x, 0, city.sea.w, CFG.WORLD_H);
  ctx.fillStyle = COL.seaDeep;
  for (let y = 60; y < CFG.WORLD_H; y += 180) {
    ctx.fillRect(city.sea.x + 40, y, city.sea.w - 80, 6);
  }
  // Sidewalks: a light band around every block.
  ctx.fillStyle = COL.sidewalk;
  for (let bx = 0; bx < CFG.BLOCKS; bx++) {
    for (let by = 0; by < CFG.BLOCKS; by++) {
      ctx.fillRect(bx * CFG.PITCH + CFG.ROAD_W / 2, by * CFG.PITCH + CFG.ROAD_W / 2, CFG.PITCH - CFG.ROAD_W, CFG.PITCH - CFG.ROAD_W);
    }
  }
}

function drawRoads(ctx) {
  ctx.fillStyle = CFG.COL.road;
  for (let i = 0; i <= CFG.BLOCKS; i++) {
    ctx.fillRect(i * CFG.PITCH - CFG.ROAD_W / 2, 0, CFG.ROAD_W, CFG.LAND);
    ctx.fillRect(0, i * CFG.PITCH - CFG.ROAD_W / 2, CFG.LAND, CFG.ROAD_W);
  }
  // Centre dashes.
  ctx.fillStyle = CFG.COL.dash;
  for (let i = 0; i <= CFG.BLOCKS; i++) {
    for (let d = 40; d < CFG.LAND; d += 90) {
      ctx.fillRect(i * CFG.PITCH - 2, d, 4, 34);
      ctx.fillRect(d, i * CFG.PITCH - 2, 34, 4);
    }
  }
}

function drawPark(ctx, city) {
  const park = city.park;
  ctx.fillStyle = CFG.COL.park;
  ctx.fillRect(park.x, park.y, park.w, park.h);
  // Pond.
  ctx.fillStyle = CFG.COL.sea;
  ctx.beginPath();
  ctx.ellipse(park.x + park.w * 0.62, park.y + park.h * 0.6, 70, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  // Trees.
  for (const t of city.trees) {
    ctx.fillStyle = '#2f6b2a';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f8a36';
    ctx.beginPath();
    ctx.arc(t.x - 2, t.y - 2, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDocks(ctx, city) {
  const d = city.docks;
  ctx.fillStyle = '#8a6a42';
  ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.fillStyle = '#6e5232';
  for (let x = d.x + 12; x < d.x + d.w; x += 26) {
    ctx.fillRect(x, d.y, 3, d.h);
  }
  ctx.fillStyle = '#5f7d8a';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DOCKS', d.x + d.w / 2, d.y + d.h / 2 + 6);
}

function drawBuildings(ctx, city) {
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 4, b.y + 4, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
    ctx.fillStyle = 'rgba(255,255,200,0.55)';
    for (let wx = b.x + 20; wx < b.x + b.w - 16; wx += 34) {
      for (let wy = b.y + 20; wy < b.y + b.h - 16; wy += 34) {
        ctx.fillRect(wx, wy, 12, 9);
      }
    }
    if (b.landmark === 'bank') {
      ctx.fillStyle = '#fff8dc';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CORAL BANK', b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
    if (b.landmark === 'garage') {
      ctx.fillStyle = '#fff8dc';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BEA’S GARAGE', b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
  }
}

function drawStashes(ctx, city) {
  for (const s of city.stashes) {
    if (s.taken) continue;
    const pulse = 1 + 0.18 * Math.sin(Date.now() / 240);
    ctx.fillStyle = CFG.COL.stash;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 9 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6d00';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', s.x, s.y + 4);
  }
}

function drawMarker(ctx, game) {
  const m = game.missions.marker;
  const taxi = game.missions.taxi;
  const target = m || (taxi ? { x: taxi.stage === 0 ? taxi.px : taxi.dx, y: taxi.stage === 0 ? taxi.py : taxi.dy } : null);
  if (!target) return;
  const bob = Math.sin(game.time * 4) * 5;
  ctx.save();
  ctx.translate(target.x, target.y + bob);
  ctx.fillStyle = CFG.COL.marker;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.lineTo(10, -8);
  ctx.lineTo(-10, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // A ring on the ground so the spot reads from the minimap too.
  ctx.strokeStyle = 'rgba(255,217,74,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 26, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlayer(ctx, game) {
  const p = game.player;
  if (p.inCar && p.car) {
    drawCar(ctx, p.car);
    return;
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(2, 3, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CFG.COL.player;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242a';
  ctx.beginPath();
  ctx.arc(Math.cos(p.angle || 0) * 5, Math.sin(p.angle || 0) * 5, 5, 0, Math.PI * 2);
  ctx.fill();
  // Gun direction.
  ctx.strokeStyle = '#20242a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(p.aim || 0) * 18, Math.sin(p.aim || 0) * 18);
  ctx.stroke();
  if (game.combat.muzzleT > 0) {
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(Math.cos(p.aim || 0) * 22, Math.sin(p.aim || 0) * 22, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx, game) {
  for (const e of game.effects) {
    ctx.globalAlpha = Math.max(0, e.t / 0.5);
    ctx.fillStyle = e.color || '#ffd94a';
    ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * frac), h - 4);
}

function drawHUD(ctx, game) {
  const p = game.player;
  const COL = CFG.COL;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  // Top-left panel: cash, health, ammo.
  ctx.fillStyle = COL.hudBg;
  ctx.fillRect(14, 12, 220, 86);
  ctx.fillStyle = '#7dff8a';
  ctx.fillText(`$ ${p.cash}`, 26, 34);
  bar(ctx, 26, 44, 120, 12, Math.max(0, p.hp / CFG.PLAYER_HP), '#ff5a4e');
  ctx.fillStyle = COL.text;
  ctx.font = '13px sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.hp)}`, 152, 55);
  ctx.fillText(`AMMO ${p.inCar ? '—' : `${p.ammo}/${CFG.MAG}`}${game.combat.reloading ? '  reloading…' : ''}`, 26, 78);
  // Objective, top centre.
  const obj = game.missions.objective();
  ctx.font = 'bold 15px sans-serif';
  const ow = ctx.measureText(obj).width + 28;
  ctx.fillStyle = COL.hudBg;
  ctx.fillRect((VIEW_W - ow) / 2, 12, ow, 32);
  ctx.fillStyle = COL.text;
  ctx.textAlign = 'center';
  ctx.fillText(obj, VIEW_W / 2, 34);
  ctx.textAlign = 'left';
  // Wanted stars, top right.
  ctx.fillStyle = COL.hudBg;
  ctx.fillRect(VIEW_W - 190, 12, 176, 40);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < game.police.stars ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    ctx.font = '22px sans-serif';
    ctx.fillText('★', VIEW_W - 176 + i * 32, 40);
  }
  // Flash message, clear of the objective bar.
  if (game.flashT > 0) {
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(game.flash, VIEW_W / 2, 96);
    ctx.textAlign = 'left';
  }
  // Speedometer, bottom left while driving.
  if (p.inCar && p.car) {
    const mph = Math.round(Math.abs(p.car.speed) * 0.14);
    ctx.fillStyle = COL.hudBg;
    ctx.fillRect(14, VIEW_H - 58, 130, 44);
    ctx.fillStyle = COL.text;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`${mph} mph`, 26, VIEW_H - 26);
  }
  // Controls hint, bottom left.
  ctx.fillStyle = 'rgba(12,16,20,0.5)';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(244,241,230,0.85)';
  ctx.fillText('WASD move/drive · E steal car · Click shoot · R reload · H honk · Esc pause · M mute', 14, VIEW_H - 8);
}

function drawMinimap(ctx, game) {
  const w = 190;
  const h = Math.round(w * (CFG.WORLD_H / CFG.WORLD_W));
  const x0 = VIEW_W - w - 14;
  const y0 = VIEW_H - h - 14;
  const sx = w / CFG.WORLD_W;
  const sy = h / CFG.WORLD_H;
  ctx.fillStyle = 'rgba(12,16,20,0.72)';
  ctx.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
  ctx.fillStyle = CFG.COL.sea;
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = CFG.COL.grass;
  ctx.fillRect(x0, y0, CFG.LAND * sx, CFG.LAND * sy);
  ctx.fillStyle = CFG.COL.road;
  for (let i = 0; i <= CFG.BLOCKS; i++) {
    ctx.fillRect(x0 + i * CFG.PITCH * sx - 1, y0, 2, CFG.LAND * sy);
    ctx.fillRect(x0, y0 + i * CFG.PITCH * sy - 1, CFG.LAND * sx, 2);
  }
  const dot = (x, y, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x0 + x * sx, y0 + y * sy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const m = game.missions.marker;
  if (m) dot(m.x, m.y, 5, CFG.COL.marker);
  const taxi = game.missions.taxi;
  if (taxi) {
    dot(taxi.stage === 0 ? taxi.px : taxi.dx, taxi.stage === 0 ? taxi.py : taxi.dy, 4, '#f2c230');
  }
  for (const c of game.police.copCars) dot(c.x, c.y, 3, '#7db3ff');
  dot(game.player.x, game.player.y, 4, '#ffe27a');
  // Viewport rectangle.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + game.camera.x * sx, y0 + game.camera.y * sy, VIEW_W * sx, VIEW_H * sy);
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(8,10,14,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawTitle(ctx, game) {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('CORAL BAY', VIEW_W / 2, 200);
  ctx.fillStyle = CFG.COL.text;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('HOT STREETS', VIEW_W / 2, 244);
  ctx.font = '16px sans-serif';
  ctx.fillText('You are Ray Delgado, a getaway driver in Coral Bay.', VIEW_W / 2, 300);
  ctx.fillText('Steal cars, outrun the PD, and pull six jobs for Bea.', VIEW_W / 2, 328);
  ctx.fillText('WASD move and drive · E steal a car · Click to shoot · R reload', VIEW_W / 2, 372);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Click to start', VIEW_W / 2, 440);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = CFG.COL.text;
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
  ctx.font = '16px sans-serif';
  ctx.fillText('Press Esc to keep playing', VIEW_W / 2, VIEW_H / 2 + 36);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, title, sub) {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a4e';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.fillStyle = CFG.COL.text;
  ctx.font = '17px sans-serif';
  ctx.fillText(sub, VIEW_W / 2, VIEW_H / 2 + 34);
  ctx.textAlign = 'left';
}
