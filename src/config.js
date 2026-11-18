// Coral Bay: Hot Streets — every tuning number and the palette, in one place.
// The city is an 8x8 block grid. Roads run on a 300px pitch; land is
// 2400x2400, then a beach strip and the sea to the east.

export const CFG = {
  // World geometry (px)
  PITCH: 300,          // block pitch: road centre to road centre
  ROAD_W: 64,          // road width
  BLOCKS: 8,           // blocks per side
  LAND: 2400,          // land extent (0..2400 on both axes)
  BEACH_W: 170,        // sand strip east of the land
  SEA_W: 470,          // sea east of the beach
  WORLD_W: 3040,       // LAND + BEACH_W + SEA_W
  WORLD_H: 2400,

  // Player on foot
  WALK_SPEED: 175,
  RUN_SPEED: 265,
  PLAYER_R: 13,
  PLAYER_HP: 100,

  // Cars
  CAR_LEN: 46,
  CAR_WID: 22,
  CAR_ACCEL: 430,
  CAR_REVERSE: 210,
  CAR_MAX: 540,
  CAR_BRAKE: 700,
  CAR_FRICTION: 260,
  ENTER_DIST: 64,

  // Combat
  MAG: 12,
  RELOAD_S: 1.1,
  SHOT_RANGE: 620,
  SHOT_DMG: 34,
  PED_HP: 34,
  COP_HP: 68,

  // Wanted
  WANTED_DECAY_S: 20,  // quiet seconds before a star fades
  COP_RAM_DMG: 9,
  ARREST_S: 1.5,       // seconds a foot cop must hold you to bust you

  // Traffic / pedestrians
  TRAFFIC_N: 34,
  PED_N: 30,

  // Missions
  STASH_N: 8,
  STASH_CASH: 100,
  TAXI_FARE: 120,

  // Palette
  COL: {
    sea: '#1d6f8e',
    seaDeep: '#155a75',
    sand: '#e3cd96',
    grass: '#5f9e52',
    park: '#4c8a44',
    road: '#33373d',
    roadEdge: '#4a4f56',
    dash: '#d8c95a',
    sidewalk: '#9aa0a3',
    building: ['#b5673f', '#7d8aa0', '#a08a5f', '#6f7f6a', '#96605f', '#5f7d8a', '#8a6f9e', '#7a9e6f'],
    roof: ['#8a4f30', '#5f6d80', '#7d6a45', '#55684f', '#75484a', '#4a6270', '#6d5680', '#5f7d55'],
    player: '#f2c14e',
    playerCar: '#e2483d',
    copCar: '#2b5cb8',
    cop: '#27408b',
    taxi: '#f2c230',
    ped: ['#d97b6c', '#7fb3d5', '#a8c686', '#d5a6bd', '#8fb8a8', '#e0a458'],
    stash: '#ffd94a',
    marker: '#ffd94a',
    text: '#f4f1e6',
    hudBg: 'rgba(12,16,20,0.62)',
  },
};

// Mission script: one entry per Bea job. The mission module drives these.
export const MISSIONS = [
  { id: 0, name: 'First Ride', brief: 'Steal any car. Walk up to one and press E.', reward: 150 },
  { id: 1, name: 'Taxi Fare', brief: 'Pick up the fare at the marker, then drive them to the drop-off.', reward: 200 },
  { id: 2, name: 'Package Drop', brief: 'Take the package to the docks, south edge of the city.', reward: 250 },
  { id: 3, name: 'Heat Wave', brief: 'Reach 3 stars and stay hot for 60 seconds.', reward: 400 },
  { id: 4, name: 'Stash Run', brief: 'Collect 3 hidden cash stashes around the city.', reward: 350 },
  { id: 5, name: 'The Coral Bank Job', brief: 'Hit the Coral Bank, grab the cash, and lose the heat at the garage.', reward: 1500 },
];
