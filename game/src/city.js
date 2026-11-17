// Coral Bay itself: a road grid, the blocks between them, the buildings on
// them, the beach on the east edge, the docks on the south edge, and the
// landmarks the story uses. Everything is placed once, from a seed, and the
// same seed always builds the same city.

import { AVENUES, PALETTE, STREETS, WORLD } from './config.js';
import { clamp } from './random.js';

const BLOCK_MARGIN = 42;
const BEACH_X = 3180;
const WATER_X = 3300;
const DOCKS_Y = 2420;

// The park block and the landmark blocks, by grid cell (avenue index, street index).
const PARK_CELL = { a: 2, s: 1 };
const LANDMARKS = {
  hideout: { a: 0, s: 0, kind: 'house', label: 'hideout' },
  hospital: { a: 1, s: 1, kind: 'tower', label: 'hospital' },
  store: { a: 3, s: 2, kind: 'shop', label: 'store' },
  bank: { a: 3, s: 3, kind: 'tower', label: 'bank' },
  garage: { a: 0, s: 5, kind: 'shop', label: 'garage' },
  docks: { a: 5, s: 6, kind: 'warehouse', label: 'docks' },
};

function cellRect(a, s) {
  const x0 = AVENUES[a] + WORLD.roadWidth / 2;
  const x1 = (AVENUES[a + 1] ?? WORLD.width - 120) - WORLD.roadWidth / 2;
  const y0 = STREETS[s] + WORLD.roadWidth / 2;
  const y1 = (STREETS[s + 1] ?? DOCKS_Y) - WORLD.roadWidth / 2;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function downtown(a, s) {
  return a >= 2 && a <= 4 && s >= 2 && s <= 3;
}

export function buildCity(rng) {
  const buildings = [];
  const trees = [];
  const lamps = [];
  const parks = [];
  const landmarks = {};

  // Buildings, one block at a time.
  for (let a = 0; a < AVENUES.length - 1; a++) {
    for (let s = 0; s < STREETS.length - 1; s++) {
      const cell = cellRect(a, s);
      if (cell.w < 90 || cell.h < 90) continue;
      if (a === PARK_CELL.a && s === PARK_CELL.s) {
        parks.push({ x: cell.x, y: cell.y, w: cell.w, h: cell.h });
        for (let i = 0; i < 9; i++) {
          trees.push({
            x: cell.x + rng.range(30, cell.w - 30),
            y: cell.y + rng.range(30, cell.h - 30),
            palm: false,
            size: rng.range(14, 22),
          });
        }
        continue;
      }
      const landmark = Object.values(LANDMARKS).find((l) => l.a === a && l.s === s);
      const ix = cell.x + BLOCK_MARGIN;
      const iy = cell.y + BLOCK_MARGIN;
      const iw = cell.w - BLOCK_MARGIN * 2;
      const ih = cell.h - BLOCK_MARGIN * 2;
      if (landmark) {
        const b = {
          x: ix,
          y: iy,
          w: iw,
          h: ih,
          hgt: landmark.kind === 'tower' ? rng.range(70, 105) : rng.range(30, 48),
          color: rng.pick(PALETTE.buildingRoof),
          kind: landmark.kind,
          label: landmark.label,
        };
        buildings.push(b);
        landmarks[landmark.label] = { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h };
        continue;
      }
      // Split long blocks into two buildings; square ones get one.
      const split = iw > ih * 1.6 || ih > iw * 1.6;
      const count = split ? 2 : 1;
      for (let k = 0; k < count; k++) {
        let bx = ix;
        let by = iy;
        let bw = iw;
        let bh = ih;
        if (split && iw > ih) {
          bw = (iw - 16) / 2;
          bx = ix + k * (bw + 16);
        } else if (split) {
          bh = (ih - 16) / 2;
          by = iy + k * (bh + 16);
        }
        buildings.push({
          x: bx,
          y: by,
          w: bw,
          h: bh,
          hgt: downtown(a, s) ? rng.range(55, 110) : rng.range(18, 52),
          color: downtown(a, s) ? rng.pick(PALETTE.downtownRoof) : rng.pick(PALETTE.buildingRoof),
          kind: downtown(a, s) ? 'tower' : 'house',
          label: null,
        });
      }
      // A tree or two on the block's corners.
      if (rng.chance(0.6)) {
        trees.push({ x: cell.x + 18, y: cell.y + 18, palm: false, size: rng.range(12, 18) });
      }
    }
  }

  // The docks strip: warehouses along the south edge.
  for (let i = 0; i < 4; i++) {
    const w = 200;
    const x = 420 + i * 620;
    buildings.push({
      x,
      y: DOCKS_Y + 46,
      w,
      h: 110,
      hgt: 34,
      color: '#8a7f74',
      kind: 'warehouse',
      label: i === 2 ? 'docks' : null,
    });
  }
  if (!landmarks.docks) landmarks.docks = { x: 420 + 2 * 620 + 100, y: DOCKS_Y + 100, w: 200, h: 110 };

  // Palm trees along the beach, lamps at every intersection.
  for (let y = 120; y < WORLD.height; y += 170) {
    trees.push({ x: BEACH_X + rng.range(8, 70), y: y + rng.range(-20, 20), palm: true, size: rng.range(16, 24) });
  }
  for (const ax of AVENUES) {
    for (const sy of STREETS) {
      lamps.push({ x: ax + WORLD.roadWidth / 2 + 6, y: sy + WORLD.roadWidth / 2 + 6 });
    }
  }

  const intersections = [];
  for (const ax of AVENUES) {
    for (const sy of STREETS) intersections.push({ x: ax, y: sy });
  }

  return {
    width: WORLD.width,
    height: WORLD.height,
    buildings,
    trees,
    lamps,
    parks,
    intersections,
    landmarks,
    beachX: BEACH_X,
    waterX: WATER_X,
    docksY: DOCKS_Y,
    spawn: { x: 700, y: 1950 },
  };
}

/** True when the point is on a road (not sidewalk or block). */
export function pointOnRoad(city, x, y) {
  if (x < 0 || y < 0 || x > city.width || y > city.height) return false;
  const half = WORLD.roadWidth / 2;
  for (const ax of AVENUES) if (Math.abs(x - ax) <= half) return true;
  for (const sy of STREETS) if (Math.abs(y - sy) <= half) return true;
  return false;
}

/** The nearest point on a road centreline, for spawning cars and police. */
export function nearestRoadPoint(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const ax of AVENUES) {
    const d = Math.abs(x - ax);
    if (d < bestD) {
      bestD = d;
      best = { x: ax, y: clamp(y, 60, city.height - 60), vertical: true };
    }
  }
  for (const sy of STREETS) {
    const d = Math.abs(y - sy);
    if (d < bestD) {
      bestD = d;
      best = { x: clamp(x, 60, city.width - 60), y: sy, vertical: false };
    }
  }
  return best;
}

/** The nearest intersection to a point. */
export function nearestIntersection(city, x, y) {
  let best = city.intersections[0];
  let bestD = Infinity;
  for (const p of city.intersections) {
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/**
 * Push a circle out of buildings, water and the world edge. Returns the
 * corrected position and whether it hit anything.
 */
export function collideCircle(city, x, y, r) {
  let hit = false;
  const nx = clamp(x, r, city.width - r);
  const ny = clamp(y, r, city.height - r);
  if (nx !== x || ny !== y) hit = true;
  x = nx;
  y = ny;
  // Water is a wall; the sand strip is walkable.
  if (x > city.waterX - r) {
    x = city.waterX - r;
    hit = true;
  }
  for (const b of city.buildings) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      } else {
        // Dead centre: push out along the smallest penetration.
        const left = x - b.x + r;
        const right = b.x + b.w - x + r;
        const top = y - b.y + r;
        const bottom = b.y + b.h - y + r;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = b.x - r;
        else if (m === right) x = b.x + b.w + r;
        else if (m === top) y = b.y - r;
        else y = b.y + b.h + r;
      }
    }
  }
  return { x, y, hit };
}

/** A random point on a road, for traffic and police spawns. */
export function randomRoadPoint(city, rng) {
  if (rng.chance(0.5)) {
    return { x: rng.pick(AVENUES), y: rng.range(80, city.height - 80), vertical: true };
  }
  return { x: rng.range(80, city.width - 80), y: rng.pick(STREETS), vertical: false };
}

/** A random point on a sidewalk, for pedestrians. */
export function randomSidewalkPoint(city, rng) {
  const p = randomRoadPoint(city, rng);
  const off = WORLD.roadWidth / 2 + WORLD.sidewalk / 2 + rng.range(0, 8);
  if (p.vertical) return { x: p.x + (rng.chance(0.5) ? off : -off), y: p.y };
  return { x: p.x, y: p.y + (rng.chance(0.5) ? off : -off) };
}
