// Coral Bay itself: a road grid, buildings, a park, a beach and the water.
// Everything here is pure layout — no drawing, no game logic — so the world
// module can ask "is this point on a road / inside a building / in the sea".

import { CFG } from './config.js';

// Road i spans [i * pitch, i * pitch + road]; its centre is i * pitch + road/2.
export function roadCenter(i) { return i * CFG.pitch + CFG.road / 2; }

export function buildCity(seed) {
  const rng = seed;
  const city = {
    size: CFG.world,
    land: CFG.land,
    roads: [],
    buildings: [],
    trees: [],
    park: null,
    garage: null,
    bank: null,
    docks: null,
    stashSpots: [],
  };
  for (let i = 0; i <= CFG.blocks; i++) city.roads.push(roadCenter(i));

  const parkBlock = { bx: 1, by: 6 };
  const garageBlock = { bx: 4, by: 1 };
  const bankBlock = { bx: 6, by: 3 };

  for (let by = 0; by < CFG.blocks; by++) {
    for (let bx = 0; bx < CFG.blocks; bx++) {
      const x0 = bx * CFG.pitch + CFG.road;
      const y0 = by * CFG.pitch + CFG.road;
      if (bx === parkBlock.bx && by === parkBlock.by) {
        city.park = { x: x0, y: y0, w: CFG.block, h: CFG.block };
        for (let t = 0; t < 14; t++) {
          city.trees.push({ x: x0 + 30 + rng.range(0, CFG.block - 60), y: y0 + 30 + rng.range(0, CFG.block - 60), r: rng.range(9, 15) });
        }
        continue;
      }
      const color = rng.pick(CFG.palette.buildingRoof);
      const inset = 22;
      if (bx === garageBlock.bx && by === garageBlock.by) {
        city.buildings.push({ x: x0 + inset, y: y0 + inset, w: CFG.block - inset * 2, h: CFG.block - inset * 2, color: '#8a6f3c', kind: 'garage' });
        city.garage = { x: x0 + CFG.block / 2, y: y0 + CFG.block + CFG.road / 2 };
        continue;
      }
      if (bx === bankBlock.bx && by === bankBlock.by) {
        city.buildings.push({ x: x0 + inset, y: y0 + inset, w: CFG.block - inset * 2, h: CFG.block - inset * 2, color: '#4f6f8a', kind: 'bank' });
        city.bank = { x: x0 + CFG.block / 2, y: y0 + CFG.block + CFG.road / 2 };
        continue;
      }
      if (rng.chance(0.55)) {
        city.buildings.push({ x: x0 + inset, y: y0 + inset, w: CFG.block - inset * 2, h: CFG.block - inset * 2, color, kind: 'block' });
      } else if (rng.chance(0.5)) {
        const w = (CFG.block - inset * 2 - 16) / 2;
        city.buildings.push({ x: x0 + inset, y: y0 + inset, w, h: CFG.block - inset * 2, color, kind: 'block' });
        city.buildings.push({ x: x0 + inset + w + 16, y: y0 + inset, w, h: CFG.block - inset * 2, color: rng.pick(CFG.palette.buildingRoof), kind: 'block' });
      } else {
        const h = (CFG.block - inset * 2 - 16) / 2;
        city.buildings.push({ x: x0 + inset, y: y0 + inset, w: CFG.block - inset * 2, h, color, kind: 'block' });
        city.buildings.push({ x: x0 + inset, y: y0 + inset + h + 16, w: CFG.block - inset * 2, h, color: rng.pick(CFG.palette.buildingRoof), kind: 'block' });
      }
    }
  }

  // The docks: a marker on the east beach, where the drop goes.
  city.docks = { x: CFG.land + CFG.beach / 2, y: roadCenter(4) };

  // Palm trees along both beaches.
  for (let i = 0; i < 16; i++) {
    city.trees.push({ x: 120 + i * 210 + rng.range(-40, 40), y: CFG.land + CFG.beach / 2 + rng.range(-30, 30), r: 12, palm: true });
    city.trees.push({ x: CFG.land + CFG.beach / 2 + rng.range(-30, 30), y: 120 + i * 210 + rng.range(-40, 40), r: 12, palm: true });
  }

  // Hidden cash stashes: quiet corners of the map.
  const stash = [
    [roadCenter(1) + 120, roadCenter(0) + 40],
    [roadCenter(7) - 60, roadCenter(2) + 200],
    [roadCenter(2) + 40, roadCenter(7) - 90],
    [roadCenter(5) + 180, roadCenter(5) + 60],
    [roadCenter(0) + 200, roadCenter(4) + 120],
    [roadCenter(3) - 140, roadCenter(6) + 30],
    [CFG.land + 60, roadCenter(6)],
    [roadCenter(8) - 120, roadCenter(1) + 240],
  ];
  for (const [x, y] of stash) city.stashSpots.push({ x, y, taken: false });

  return city;
}

export function isWater(city, x, y) {
  const s = CFG.land + CFG.beach;
  return x >= s || y >= s || (x >= CFG.land && y >= CFG.land);
}

export function isSand(city, x, y) {
  return !isWater(city, x, y) && (x >= CFG.land || y >= CFG.land);
}

export function isOnRoad(city, x, y) {
  const r = CFG.road / 2;
  for (const c of city.roads) {
    if (Math.abs(x - c) <= r || Math.abs(y - c) <= r) return true;
  }
  return false;
}

// Push a circle out of buildings, the water and the world edge.
// Returns true when the circle was moved (a collision happened).
export function resolveCircle(city, p, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(p.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(p.y, b.y + b.h));
    const dx = p.x - cx, dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r;
        p.y = cy + (dy / d) * r;
      } else {
        p.y = b.y - r;
      }
      hit = true;
    }
  }
  // The sea is a wall: keep circles on the sand.
  const edge = CFG.land + CFG.beach - r;
  if (p.x > edge && p.y < CFG.land) { p.x = edge; hit = true; }
  if (p.y > edge && p.x < CFG.land) { p.y = edge; hit = true; }
  if (p.x >= CFG.land && p.y >= CFG.land) { p.x = CFG.land - r; p.y = CFG.land - r; hit = true; }
  p.x = Math.max(r, Math.min(CFG.world - r, p.x));
  p.y = Math.max(r, Math.min(CFG.world - r, p.y));
  return hit;
}

export function randomRoadPoint(city, rng) {
  const horizontal = rng.chance(0.5);
  const road = rng.pick(city.roads);
  const along = rng.range(140, CFG.land - 140);
  if (horizontal) return { x: along, y: road + (rng.chance(0.5) ? 27 : -27) };
  return { x: road + (rng.chance(0.5) ? 27 : -27), y: along };
}

export function randomSidewalkPoint(city, rng) {
  const bx = rng.int(0, CFG.blocks - 1);
  const by = rng.int(0, CFG.blocks - 1);
  const x0 = bx * CFG.pitch + CFG.road;
  const y0 = by * CFG.pitch + CFG.road;
  const side = rng.int(0, 3);
  if (side === 0) return { x: x0 + rng.range(0, CFG.block), y: y0 - 8 };
  if (side === 1) return { x: x0 + rng.range(0, CFG.block), y: y0 + CFG.block + 8 };
  if (side === 2) return { x: x0 - 8, y: y0 + rng.range(0, CFG.block) };
  return { x: x0 + CFG.block + 8, y: y0 + rng.range(0, CFG.block) };
}
