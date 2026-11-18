// The city of Coral Bay, built once from a fixed seed so every run shows
// the same streets: an 8x8 block grid, a park in the middle, a beach and
// the sea to the east, the docks at the south edge, Bea's garage and the
// Coral Bank as landmarks.

import { CFG } from './config.js';
import { makeRng } from './rng.js';

const { PITCH, ROAD_W, BLOCKS, LAND, BEACH_W, SEA_W, WORLD_W, WORLD_H } = CFG;
const HALF = ROAD_W / 2;

function roadBand(v) {
  // distance from v to the nearest road centreline (multiples of PITCH)
  const m = ((v % PITCH) + PITCH) % PITCH;
  return Math.min(m, PITCH - m);
}

export function isRoad(x, y) {
  if (x < 0 || y < 0 || x >= LAND || y >= LAND) return false;
  return roadBand(x) <= HALF || roadBand(y) <= HALF;
}

export function onSidewalk(x, y) {
  if (x < 0 || y < 0 || x >= LAND || y >= LAND) return false;
  const d = Math.min(roadBand(x), roadBand(y));
  return d > HALF && d <= HALF + 16;
}

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const stashes = [];

  // Park: blocks (2..3, 2..3) stay open, with trees.
  const isPark = (bx, by) => bx >= 2 && bx <= 3 && by >= 2 && by <= 3;
  // Docks: blocks (6..7, 7) stay open as a pier yard.
  const isDocks = (bx, by) => by === 7 && bx >= 6;

  for (let bx = 0; bx < BLOCKS; bx++) {
    for (let by = 0; by < BLOCKS; by++) {
      const x0 = bx * PITCH + HALF;
      const y0 = by * PITCH + HALF;
      const w = PITCH - ROAD_W;
      const h = PITCH - ROAD_W;
      if (isPark(bx, by)) {
        for (let t = 0; t < 14; t++) {
          trees.push({
            x: x0 + rng.range(24, w - 24),
            y: y0 + rng.range(24, h - 24),
            r: rng.range(9, 15),
          });
        }
        continue;
      }
      if (isDocks(bx, by)) continue;
      // One or two buildings per block, inset from the road.
      const n = rng.chance(0.45) ? 2 : 1;
      if (n === 1) {
        const bw = rng.range(w * 0.45, w * 0.72);
        const bh = rng.range(h * 0.45, h * 0.72);
        const ci = rng.int(0, CFG.COL.building.length - 1);
        buildings.push({
          x: x0 + (w - bw) / 2, y: y0 + (h - bh) / 2, w: bw, h: bh,
          color: CFG.COL.building[ci], roof: CFG.COL.roof[ci],
        });
      } else {
        const bw = w * 0.42;
        const bh = h * 0.42;
        const c1 = rng.int(0, CFG.COL.building.length - 1);
        const c2 = rng.int(0, CFG.COL.building.length - 1);
        buildings.push({
          x: x0 + 8, y: y0 + 8, w: bw, h: bh,
          color: CFG.COL.building[c1], roof: CFG.COL.roof[c1],
        });
        buildings.push({
          x: x0 + w - 8 - bw, y: y0 + h - 8 - bh, w: bw, h: bh,
          color: CFG.COL.building[c2], roof: CFG.COL.roof[c2],
        });
      }
    }
  }

  // Landmarks: the bank (block 4,4) and Bea's garage (block 1,6).
  const bank = { x: 4 * PITCH + HALF + 30, y: 4 * PITCH + HALF + 30, w: 150, h: 120 };
  const garage = { x: 1 * PITCH + HALF + 40, y: 6 * PITCH + HALF + 40, w: 140, h: 100 };
  buildings.push({ ...bank, color: '#c8b06a', roof: '#8a743a', landmark: 'bank' });
  buildings.push({ ...garage, color: '#5f7d8a', roof: '#3f5a66', landmark: 'garage' });
  const docks = { x: 6 * PITCH + HALF, y: 7 * PITCH + HALF, w: 2 * PITCH - ROAD_W, h: PITCH - ROAD_W };

  // 8 cash stashes: on sidewalks and in the park, never inside a building.
  const stashSpots = [];
  let guard = 0;
  while (stashSpots.length < CFG.STASH_N && guard++ < 400) {
    const x = rng.range(80, LAND - 80);
    const y = rng.range(80, LAND - 80);
    if (isRoad(x, y)) continue;
    if (pointInBuilding(buildings, x, y, 24)) continue;
    if (stashSpots.some((s) => Math.hypot(s.x - x, s.y - y) < 320)) continue;
    stashSpots.push({ x, y, taken: false });
  }
  stashes.push(...stashSpots);

  return {
    buildings,
    trees,
    stashes,
    park: { x: 2 * PITCH + HALF, y: 2 * PITCH + HALF, w: 2 * PITCH - ROAD_W, h: 2 * PITCH - ROAD_W },
    beach: { x: LAND, y: 0, w: BEACH_W, h: LAND },
    sea: { x: LAND + BEACH_W, y: 0, w: SEA_W, h: WORLD_H },
    docks,
    bank,
    garage,
    isRoad,
    onSidewalk,
  };
}

export function pointInBuilding(buildings, x, y, pad) {
  const p = pad || 0;
  for (const b of buildings) {
    if (x > b.x - p && x < b.x + b.w + p && y > b.y - p && y < b.y + b.h + p) return b;
  }
  return null;
}

// Push a circle out of any building it overlaps. Returns true if pushed.
export function resolveBuildings(buildings, obj, r) {
  let pushed = false;
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(obj.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(obj.y, b.y + b.h));
    const dx = obj.x - cx;
    const dy = obj.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      obj.x = cx + (dx / d) * r;
      obj.y = cy + (dy / d) * r;
      pushed = true;
    } else if (d2 <= 0.0001) {
      // centre inside the rect: push out along the smallest axis
      const left = obj.x - b.x;
      const right = b.x + b.w - obj.x;
      const top = obj.y - b.y;
      const bottom = b.y + b.h - obj.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) obj.x = b.x - r;
      else if (m === right) obj.x = b.x + b.w + r;
      else if (m === top) obj.y = b.y - r;
      else obj.y = b.y + b.h + r;
      pushed = true;
    }
  }
  return pushed;
}

// Nearest road-centre point (used to drop entities onto roads).
export function nearestRoadPoint(x, y) {
  const nx = Math.round(x / PITCH) * PITCH;
  const ny = Math.round(y / PITCH) * PITCH;
  if (Math.abs(x - nx) < Math.abs(y - ny)) return { x: nx, y };
  return { x, y: ny };
}

export function clampWorld(o, margin) {
  const m = margin || 0;
  o.x = Math.max(m, Math.min(WORLD_W - m, o.x));
  o.y = Math.max(m, Math.min(WORLD_H - m, o.y));
}
