// Coral Bay: Hot Streets — tuning constants and the palette.
// Everything the game needs to know about size, speed and colour lives here,
// so the other modules stay small and the numbers can be tuned in one place.

export const CFG = {
  viewW: 1280,
  viewH: 720,

  // City geometry: 8x8 blocks, 300 px blocks, 110 px roads, 410 px pitch.
  blocks: 8,
  block: 300,
  road: 110,
  pitch: 410,
  // Land is 3390 px square; a sand strip and open water wrap the south and
  // east edges, so the full world is 3600 px square.
  land: 3390,
  world: 3600,
  beach: 170,

  player: {
    radius: 14,
    walk: 155,
    run: 245,
    health: 100,
    mag: 12,
    reloadTime: 1.15,
    shotRange: 430,
    shotDamage: 34,
    regenDelay: 5,
    regenRate: 9,
  },

  car: {
    length: 64,
    width: 32,
    accel: 520,
    brake: 760,
    reverseMax: 190,
    maxSpeed: 540,
    turn: 2.7,
    grip: 0.86,
    health: 100,
  },

  traffic: {
    count: 34,
    speedMin: 70,
    speedMax: 125,
    turnChance: 0.3,
  },

  peds: {
    count: 30,
    walkMin: 26,
    walkMax: 48,
    fleeSpeed: 130,
  },

  police: {
    // stars -> how many police cars hunt the player. Five stars is the
    // bank-job escape, so it gets one more car than the four before.
    carsByStars: [0, 1, 2, 2, 3, 5],
    carSpeed: 470,
    footSpeed: 152,
    ramDamage: 14,
    copShotDamage: 9,
    copShotRange: 380,
    copShotInterval: 0.95,
    arrestRadius: 26,
    decayQuiet: 20,
    decayStep: 10,
  },

  wanted: {
    stealCar: 1,
    shoot: 1,
    kill: 1,
    maxStars: 5,
  },

  palette: {
    road: '#2b2f36',
    roadEdge: '#3a3f47',
    lane: '#c8b45a',
    sidewalk: '#8d9299',
    sidewalkEdge: '#6f747c',
    grass: '#5f9e52',
    plaza: '#b9a684',
    sand: '#e3cd96',
    waterDeep: '#14608f',
    waterShallow: '#2b8ab5',
    buildingRoof: ['#b0563f', '#4f7fa8', '#7a6a9e', '#a8854f', '#5d8a6a', '#96604f', '#5f7f96', '#a05a6a'],
    buildingEdge: '#2c2f36',
    parkTree: '#2f7a3d',
    palm: '#3f9150',
  },

  // Story payouts, in dollars.
  pay: { mission: [300, 250, 500, 600, 400, 2000], taxi: 120, stash: 100 },
};
