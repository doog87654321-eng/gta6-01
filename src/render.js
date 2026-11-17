// The renderer: a sun-soaked top-down Coral Bay — warm roads, pastel roofs,
// long shadows, the beach and the docks — then the HUD with its minimap,
// wanted stars, cash, health, speed and the mission objective. Screens:
// title, play, paused, wasted, busted and the story's end.

import { AVENUES, FONT, FONT_HEAVY, PALETTE, STREETS, WORLD } from './config.js';
import { clamp } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'wasted';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_STORY = 'story';

const MAP_W = 196;
const MAP_H = 150;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShadow(ctx, x, y, w, h, hgt) {
  ctx.fillStyle = 'rgba(40, 30, 20, 0.22)';
  ctx.fillRect(x + hgt * 0.28, y + hgt * 0.32, w, h);
}

function drawBuilding(ctx, b, time) {
  drawShadow(ctx, b.x, b.y, b.w, b.h, b.hgt);
  ctx.fillStyle = PALETTE.buildingWall;
  ctx.fillRect(b.x + 3, b.y + 3, b.w, b.h);
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // Roof furniture: vents, skylights, a pool on some towers.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  const cols = Math.max(1, Math.floor(b.w / 46));
  const rows = Math.max(1, Math.floor(b.h / 46));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      ctx.fillRect(b.x + 10 + i * 46, b.y + 10 + j * 46, 18, 12);
    }
  }
  if (b.kind === 'tower' && b.w > 120) {
    ctx.fillStyle = '#5fb8d8';
    ctx.fillRect(b.x + b.w / 2 - 22, b.y + b.h / 2 - 12, 44, 24);
  }
  if (b.label) {
    ctx.fillStyle = 'rgba(20, 20, 30, 0.85)';
    ctx.fillRect(b.x + b.w / 2 - 52, b.y + b.h / 2 - 12, 104, 24);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const names = {
      garage: "BEA'S GARAGE",
      hospital: 'HOSPITAL',
      store: 'SUNSET MART',
      bank: 'BANK',
      docks: 'DOCKS',
      hideout: 'HIDEOUT',
    };
    ctx.fillText(names[b.label] || b.label.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
  void time;
}

function drawCar(ctx, car, G) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const L = 48;
  const W = 26;
  if (car.wreck) {
    ctx.fillStyle = 'rgba(40,30,20,0.25)';
    ctx.beginPath();
    ctx.ellipse(3, 4, L / 2, W / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    roundRect(ctx, -L / 2, -W / 2, L, W, 7);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(-L / 2 + 6, -W / 2 + 4, 12, 8);
    ctx.restore();
    return;
  }
  // Soft shadow.
  ctx.fillStyle = 'rgba(40, 30, 20, 0.28)';
  ctx.beginPath();
  ctx.ellipse(2, 3, L / 2 + 2, W / 2 + 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wheels.
  ctx.fillStyle = '#16181c';
  ctx.fillRect(-L / 2 + 4, -W / 2 - 2, 10, 5);
  ctx.fillRect(L / 2 - 14, -W / 2 - 2, 10, 5);
  ctx.fillRect(-L / 2 + 4, W / 2 - 3, 10, 5);
  ctx.fillRect(L / 2 - 14, W / 2 - 3, 10, 5);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -L / 2, -W / 2, L, W, 8);
  ctx.fill();
  if (car.kind === 'police') {
    ctx.fillStyle = '#1d3a6e';
    ctx.fillRect(-8, -W / 2, 16, W);
    ctx.fillStyle = '#eef1f5';
    ctx.fillRect(-L / 2 + 2, -W / 2 + 2, 6, W - 4);
  }
  // Windshield and roof.
  ctx.fillStyle = 'rgba(30, 42, 58, 0.85)';
  ctx.fillRect(L / 2 - 16, -W / 2 + 4, 9, W - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(-6, -W / 2 + 4, 14, W - 8);
  // Headlights and tail lights.
  ctx.fillStyle = '#fff6c9';
  ctx.fillRect(L / 2 - 2, -W / 2 + 3, 3, 5);
  ctx.fillRect(L / 2 - 2, W / 2 - 8, 3, 5);
  ctx.fillStyle = car.brakeLight ? '#ff2d2d' : '#a33';
  ctx.fillRect(-L / 2, -W / 2 + 3, 3, 5);
  ctx.fillRect(-L / 2, W / 2 - 8, 3, 5);
  // Police light bar, flashing red and blue.
  if (car.kind === 'police' && car.siren) {
    const phase = Math.floor(G.time * 6) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2d2d' : '#2d6bff';
    ctx.fillRect(-4, -W / 2 - 1, 8, 6);
    ctx.fillStyle = phase ? '#2d6bff' : '#ff2d2d';
    ctx.fillRect(-4, W / 2 - 5, 8, 6);
    // Light glow on the road.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = phase ? '#ff2d2d' : '#2d6bff';
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (car.kind === 'taxi' || car.model === 'taxi') {
    ctx.fillStyle = '#16181c';
    ctx.font = 'bold 8px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, -W / 2 - 4);
  }
  ctx.restore();
  // Smoke from a dying car.
  if (car.smoke) {
    ctx.fillStyle = 'rgba(80,80,80,0.5)';
    ctx.beginPath();
    ctx.arc(car.x - Math.cos(car.angle) * 18, car.y - Math.sin(car.angle) * 18, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPed(ctx, ped, G) {
  const down = ped.state === 'down';
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(40, 30, 20, 0.25)';
  ctx.beginPath();
  ctx.ellipse(1, 2, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (down) {
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.color;
    roundRect(ctx, -13, -6, 26, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(15, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.rotate(ped.angle);
  // Body and head, walking bob.
  const bob = ped.speed > 10 ? Math.sin(G.time * 12 + ped.x) * 1.5 : 0;
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(0, bob * 0.3, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(4, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  if (ped.gang) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (p.dead) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Marker ring so the eye finds Ray in a crowd.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(40, 30, 20, 0.25)';
  ctx.beginPath();
  ctx.ellipse(1, 2, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  const bob = p.speed > 10 ? Math.sin(G.time * 14) * 1.5 : 0;
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, bob * 0.3, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerShirt;
  ctx.beginPath();
  ctx.arc(2, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(5, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // The pistol, when Ray is aiming.
  ctx.strokeStyle = '#1c1c22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(20, 0);
  ctx.stroke();
  ctx.restore();
}

function drawWorld(ctx, G) {
  const city = G.city;
  const cam = G.camera;
  const view = G.view;
  const z = cam.zoom;
  ctx.save();
  ctx.translate(view.w / 2, view.h / 2);
  ctx.scale(z, z);
  const shX = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
  const shY = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
  ctx.translate(-cam.x + shX, -cam.y + shY);

  // Ground: grass, then sand and water on the east edge, docks concrete south.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, city.width, city.height);
  ctx.fillStyle = PALETTE.grassDark;
  for (let x = 0; x < city.width; x += 260) {
    for (let y = 0; y < city.height; y += 260) {
      if ((x / 260 + y / 260) % 2 === 0) ctx.fillRect(x, y, 130, 130);
    }
  }
  ctx.fillStyle = '#8a8f96';
  ctx.fillRect(0, city.docksY, city.width, city.height - city.docksY);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(city.beachX, 0, city.waterX - city.beachX, city.height);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(city.waterX, 0, city.width - city.waterX, city.height);
  ctx.fillStyle = PALETTE.waterDeep;
  for (let y = 0; y < city.height; y += 90) {
    ctx.fillRect(city.waterX + 40, y + ((y / 90) % 2) * 30, 120, 8);
  }
  // Parks.
  for (const park of city.parks) {
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
  }
  // Sidewalks, then roads.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const ax of AVENUES) {
    ctx.fillRect(ax - WORLD.roadWidth / 2 - WORLD.sidewalk, 0, WORLD.roadWidth + WORLD.sidewalk * 2, city.height);
  }
  for (const sy of STREETS) {
    ctx.fillRect(0, sy - WORLD.roadWidth / 2 - WORLD.sidewalk, city.width, WORLD.roadWidth + WORLD.sidewalk * 2);
  }
  ctx.fillStyle = PALETTE.road;
  for (const ax of AVENUES) {
    ctx.fillRect(ax - WORLD.roadWidth / 2, 0, WORLD.roadWidth, city.height);
  }
  for (const sy of STREETS) {
    ctx.fillRect(0, sy - WORLD.roadWidth / 2, city.width, WORLD.roadWidth);
  }
  // Lane dashes.
  ctx.fillStyle = PALETTE.lane;
  for (const ax of AVENUES) {
    for (let y = 0; y < city.height; y += 64) ctx.fillRect(ax - 2, y, 4, 32);
  }
  for (const sy of STREETS) {
    for (let x = 0; x < city.width; x += 64) ctx.fillRect(x, sy - 2, 32, 4);
  }
  // Buildings, sorted so taller ones overlap lower ones correctly.
  const sorted = [...city.buildings].sort((a, b) => a.y + a.h - (b.y + b.h));
  for (const b of sorted) drawBuilding(ctx, b, G.time);
  // Trees and lamps.
  for (const t of city.trees) {
    ctx.fillStyle = 'rgba(40, 30, 20, 0.2)';
    ctx.beginPath();
    ctx.ellipse(t.x + 5, t.y + 6, t.size * 0.8, t.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (t.palm) {
      ctx.strokeStyle = '#8a6a4a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + 4, t.y - 8);
      ctx.stroke();
      ctx.fillStyle = '#3f9e4d';
    } else {
      ctx.fillStyle = '#4d8a44';
    }
    ctx.beginPath();
    ctx.arc(t.x, t.y - 6, t.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const lamp of city.lamps) {
    ctx.fillStyle = '#3c3f46';
    ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
    ctx.fillStyle = 'rgba(255, 240, 180, 0.5)';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cash stashes: a sparkling briefcase.
  for (const stash of G.stashes) {
    if (stash.taken) continue;
    const pulse = 0.6 + Math.sin(G.time * 4 + stash.x) * 0.4;
    ctx.fillStyle = `rgba(255, 210, 63, ${0.5 * pulse})`;
    ctx.beginPath();
    ctx.arc(stash.x, stash.y, 16 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5a1d';
    ctx.fillRect(stash.x - 9, stash.y - 6, 18, 12);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(stash.x - 9, stash.y - 1, 18, 2);
  }

  // Mission marker: a light pillar and a bouncing diamond.
  if (G.marker) {
    const m = G.marker;
    const bounce = Math.sin(G.time * 3) * 6;
    ctx.fillStyle = PALETTE.beacon;
    ctx.fillRect(m.x - 14, m.y - 260, 28, 260);
    ctx.save();
    ctx.translate(m.x, m.y - 46 + bounce);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = m.kind === 'taxi' ? '#7ee081' : PALETTE.marker;
    ctx.fillRect(-11, -11, 22, 22);
    ctx.restore();
    ctx.fillStyle = '#16181c';
    ctx.font = 'bold 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(m.kind === 'taxi' ? '$' : '!', m.x, m.y - 47 + bounce + 4);
  }

  // Cars, peds, cops, the player, bullets, particles — painted in y order
  // where it matters, cars first so feet walk over them correctly.
  const cars = [...G.cars].sort((a, b) => a.y - b.y);
  for (const car of cars) drawCar(ctx, car, G);
  for (const ped of G.peds) drawPed(ctx, ped, G);
  for (const cop of G.cops) {
    if (cop.down) {
      ctx.save();
      ctx.translate(cop.x, cop.y);
      ctx.fillStyle = PALETTE.cop;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 7, cop.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.translate(cop.x, cop.y);
    ctx.fillStyle = 'rgba(40, 30, 20, 0.25)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(cop.angle);
    ctx.fillStyle = PALETTE.cop;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(4, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // A cop closing in flashes a bust warning.
    if (cop.bustTimer > 0.4) {
      ctx.fillStyle = '#ff2d2d';
      ctx.font = 'bold 12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -20);
    }
    ctx.restore();
  }
  if (G.player.onFoot) drawPlayer(ctx, G);

  for (const b of G.bullets) {
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const p of G.particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.kind === 'smoke' ? 1 + (1 - a) : a), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
}

function drawMinimap(ctx, G) {
  const x0 = 16;
  const y0 = G.view.h - MAP_H - 16;
  panel(ctx, x0 - 6, y0 - 6, MAP_W + 12, MAP_H + 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, MAP_W, MAP_H);
  ctx.clip();
  const sx = MAP_W / G.city.width;
  const sy = MAP_H / G.city.height;
  ctx.fillStyle = '#33502c';
  ctx.fillRect(x0, y0, MAP_W, MAP_H);
  ctx.fillStyle = '#2e9db4';
  ctx.fillRect(x0 + G.city.waterX * sx, y0, MAP_W - G.city.waterX * sx, MAP_H);
  ctx.fillStyle = '#ecd9a4';
  ctx.fillRect(x0 + G.city.beachX * sx, y0, (G.city.waterX - G.city.beachX) * sx, MAP_H);
  ctx.strokeStyle = '#cfc9ba';
  ctx.lineWidth = 3;
  for (const ax of AVENUES) {
    ctx.beginPath();
    ctx.moveTo(x0 + ax * sx, y0);
    ctx.lineTo(x0 + ax * sx, y0 + MAP_H);
    ctx.stroke();
  }
  for (const sy2 of STREETS) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + sy2 * sy);
    ctx.lineTo(x0 + MAP_W, y0 + sy2 * sy);
    ctx.stroke();
  }
  // Blips: mission, taxi, police, player.
  const blip = (x, y, color, size) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x0 + x * sx, y0 + y * sy, size, 0, Math.PI * 2);
    ctx.fill();
  };
  if (G.marker) {
    const m = G.marker;
    const pulse = 3 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = m.kind === 'taxi' ? '#7ee081' : '#ffd23f';
    ctx.beginPath();
    ctx.arc(x0 + m.x * sx, y0 + m.y * sy, pulse + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const car of G.policeCars) blip(car.x, car.y, Math.floor(G.time * 4) % 2 === 0 ? '#ff2d2d' : '#2d6bff', 3.5);
  for (const cop of G.cops) blip(cop.x, cop.y, '#2d6bff', 2.5);
  blip(G.player.x, G.player.y, '#ffffff', 4);
  ctx.restore();
  // The camera's view box.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  const vw = (G.view.w / G.camera.zoom) * sx;
  const vh = (G.view.h / G.camera.zoom) * sy;
  ctx.strokeRect(x0 + G.camera.x * sx - vw / 2, y0 + G.camera.y * sy - vh / 2, vw, vh);
}

function drawHud(ctx, G) {
  const view = G.view;
  const p = G.player;
  // Wanted stars and health, top left.
  panel(ctx, 14, 14, 216, 64);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WANTED', 26, 30);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? PALETTE.star : PALETTE.starEmpty;
    ctx.font = '20px ' + FONT;
    ctx.fillText('★', 96 + i * 22, 31);
  }
  const hpW = 180;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 26, 50, hpW, 10, 5);
  ctx.fill();
  ctx.fillStyle = p.health > 30 ? PALETTE.health : PALETTE.healthLow;
  roundRect(ctx, 26, 50, hpW * clamp(p.health / 100, 0, 1), 10, 5);
  ctx.fill();

  // Cash, clock and progress, top right.
  const cashText = `$${p.cash.toLocaleString('en-US')}`;
  panel(ctx, view.w - 230, 14, 216, 64);
  ctx.fillStyle = PALETTE.cash;
  ctx.font = 'bold 22px ' + FONT;
  ctx.textAlign = 'right';
  ctx.fillText(cashText, view.w - 30, 34);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px ' + FONT;
  const hour = Math.floor(G.clock);
  const minute = Math.floor((G.clock - hour) * 60);
  ctx.fillText(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}  ·  Missions ${G.save.missionsDone}/6`, view.w - 30, 60);

  // Objective, top centre.
  if (G.objective) {
    ctx.font = 'bold 15px ' + FONT;
    const w = Math.min(view.w - 480, ctx.measureText(G.objective).width + 36);
    panel(ctx, (view.w - w) / 2, 14, w, 34);
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'center';
    ctx.fillText(G.objective, view.w / 2, 32);
  }
  // Message line, under the objective.
  if (G.messageTimer > 0 && G.message) {
    ctx.font = '14px ' + FONT;
    ctx.fillStyle = PALETTE.hudText;
    ctx.textAlign = 'center';
    ctx.fillText(G.message, view.w / 2, 66);
  }
  // Robbery progress bar.
  const stage = G.mission && G.mission.active ? G.mission.def.stages[G.mission.stageIndex] : null;
  if (stage && stage.type === 'hold' && G.mission.progress > 0) {
    const w = 260;
    panel(ctx, (view.w - w) / 2, view.h - 120, w, 26);
    ctx.fillStyle = '#ffd23f';
    roundRect(ctx, (view.w - w) / 2 + 8, view.h - 112, (w - 16) * clamp(G.mission.progress / stage.seconds, 0, 1), 10, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('ROBBERY IN PROGRESS — STAY PUT', view.w / 2, view.h - 84);
  }
  // Speed or ammo, bottom right.
  if (p.car) {
    const mph = Math.round(Math.abs(p.car.speed) * 0.12);
    panel(ctx, view.w - 150, view.h - 66, 136, 52);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 26px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(`${mph}`, view.w - 58, view.h - 40);
    ctx.font = '13px ' + FONT;
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.fillText('mph', view.w - 30, view.h - 40);
    ctx.fillStyle = p.car.health < p.car.maxHealth * 0.4 ? PALETTE.healthLow : PALETTE.hudMuted;
    ctx.font = '12px ' + FONT;
    ctx.fillText(`${p.car.name}  ·  ${Math.max(0, Math.round(p.car.health))}%`, view.w - 30, view.h - 22);
  } else {
    panel(ctx, view.w - 150, view.h - 66, 136, 52);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 20px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(p.reloadTimer > 0 ? 'RELOADING…' : `AMMO ${p.ammo}/${12}`, view.w - 30, view.h - 40);
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = '12px ' + FONT;
    ctx.fillText('Click to shoot · E to drive', view.w - 30, view.h - 22);
  }
  // Controls hint, above the minimap.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText('WASD move · Shift run · E enter car · F use · Esc pause · M mute', 16, view.h - MAP_H - 34);

  drawMinimap(ctx, G);

  // Off-screen marker arrow, above the player, pointing at the objective.
  if (G.marker) {
    const m = G.marker;
    const dx = m.x - p.x;
    const dy = m.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 60) {
      const ang = Math.atan2(dy, dx);
      const ax = p.x + Math.cos(ang) * 46;
      const ay = p.y + Math.sin(ang) * 46;
      const z = G.camera.zoom;
      const sx = (ax - G.camera.x) * z + view.w / 2;
      const sy2 = (ay - G.camera.y) * z + view.h / 2;
      ctx.save();
      ctx.translate(sx, sy2);
      ctx.rotate(ang);
      ctx.fillStyle = m.kind === 'taxi' ? '#7ee081' : '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = m.kind === 'taxi' ? '#7ee081' : '#ffd23f';
      ctx.font = 'bold 12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(d)}m`, sx, sy2 - 14);
    }
  }
}

function drawTitle(ctx, G) {
  const view = G.view;
  ctx.fillStyle = 'rgba(10, 14, 24, 0.45)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = '84px ' + FONT_HEAVY;
  ctx.fillText('CORAL BAY', view.w / 2, view.h * 0.3);
  ctx.fillStyle = '#ff5d47';
  ctx.font = 'bold 34px ' + FONT_HEAVY;
  ctx.fillText('H O T   S T R E E T S', view.w / 2, view.h * 0.3 + 48);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '17px ' + FONT;
  ctx.fillText('An open-world crime story — steal cars, outrun the law, pull the big score.', view.w / 2, view.h * 0.3 + 92);
  const save = G.save;
  if (save.missionsDone > 0) {
    ctx.fillStyle = '#7ee081';
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText(`Continue — ${save.missionsDone}/6 missions done · $${save.cash.toLocaleString('en-US')} in the pocket`, view.w / 2, view.h * 0.52);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText('Press ENTER or click to play', view.w / 2, view.h * 0.62);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '15px ' + FONT;
  ctx.fillText('WASD / arrows — move & drive      Mouse — aim      Click — shoot', view.w / 2, view.h * 0.7);
  ctx.fillText('E — enter / steal a car      Shift — run      Esc — pause      M — mute', view.w / 2, view.h * 0.7 + 26);
  ctx.fillText('An original game: its city, people, cars and story are all made up. No Rockstar content.', view.w / 2, view.h * 0.86);
}

function drawCenterCard(ctx, G, title, lines, accent) {
  const view = G.view;
  ctx.fillStyle = 'rgba(10, 14, 24, 0.6)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '72px ' + FONT_HEAVY;
  ctx.fillText(title, view.w / 2, view.h * 0.42);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '19px ' + FONT;
  lines.forEach((line, i) => ctx.fillText(line, view.w / 2, view.h * 0.42 + 46 + i * 30));
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '16px ' + FONT;
  ctx.fillText('Press ENTER to continue', view.w / 2, view.h * 0.42 + 46 + lines.length * 30 + 26);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    draw(G, screen) {
      G.view.w = window.innerWidth;
      G.view.h = window.innerHeight;
      ctx.clearRect(0, 0, G.view.w, G.view.h);
      drawWorld(ctx, G);
      if (screen === SCREEN_PLAY) {
        drawHud(ctx, G);
      } else if (screen === SCREEN_TITLE) {
        drawTitle(ctx, G);
      } else if (screen === SCREEN_PAUSED) {
        drawHud(ctx, G);
        drawCenterCard(ctx, G, 'PAUSED', ['Take a breath. Coral Bay will wait.'], '#f4f1e6');
      } else if (screen === SCREEN_OVER) {
        drawCenterCard(ctx, G, 'WASTED', ['Ray got wasted.', `You kept $${G.player.cash.toLocaleString('en-US')} — the hospital kept the rest.`], '#e5534b');
      } else if (screen === SCREEN_BUSTED) {
        drawCenterCard(ctx, G, 'BUSTED', ['The Coral Bay PD caught up with Ray.', 'The mission failed. Bail is cheap — try again.'], '#2d6bff');
      } else if (screen === SCREEN_STORY) {
        drawCenterCard(
          ctx,
          G,
          'THE BIG SCORE',
          ['Ray Delgado walked out of Coral Bay Bank with the money,', 'the whole city behind him — and drove off into the sunset.', `Final take: $${G.player.cash.toLocaleString('en-US')}`],
          '#ffd23f',
        );
      }
    },
  };
}
