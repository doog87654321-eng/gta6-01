// Coral Bay: Hot Streets — every tuning number and colour in one place.
// The world is a fixed 3400x2600 coastal city; the renderer shows a camera window
// around the player, so no rule below depends on the screen size.

export const STEP = 1 / 60;

export const WORLD = {
  width: 3400,
  height: 2600,
  roadWidth: 92,
  laneOffset: 20,
  sidewalk: 26,
};

// Avenues run north-south, streets east-west. The grid leaves the east edge as
// beach and water, and the south edge as the docks.
export const AVENUES = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100];
export const STREETS = [260, 600, 950, 1300, 1650, 2000, 2350];

export const PLAYER = {
  radius: 13,
  walkSpeed: 175,
  runSpeed: 265,
  health: 100,
  regenDelay: 5,
  regenRate: 4,
  pistolDamage: 34,
  pistolRange: 520,
  magSize: 12,
  reloadSeconds: 1.1,
  fireInterval: 0.22,
};

export const CAR = {
  // Top speed in px/s, accel, grip (how fast it turns), and toughness.
  models: {
    sedan: { top: 430, accel: 300, grip: 2.6, health: 100, name: 'Civic Sedan', color: '#c94f43' },
    taxi: { top: 410, accel: 290, grip: 2.6, health: 100, name: 'Bay Cab', color: '#f2b705' },
    coupe: { top: 470, accel: 330, grip: 2.9, health: 90, name: 'Comet Coupe', color: '#3e7cb1' },
    sports: { top: 620, accel: 430, grip: 3.4, health: 80, name: 'Vortex GT', color: '#e8b10c' },
    truck: { top: 340, accel: 220, grip: 2.1, health: 160, name: 'Hauler Truck', color: '#5b7a5e' },
    van: { top: 380, accel: 250, grip: 2.3, health: 140, name: 'Courier Van', color: '#e8e3d8' },
    muscle: { top: 540, accel: 380, grip: 2.8, health: 110, name: 'Rebel Muscle', color: '#7a3b8f' },
    police: { top: 560, accel: 400, grip: 3.2, health: 150, name: 'CBPD Interceptor', color: '#eef1f5' },
  },
  width: 26,
  length: 48,
  enterRadius: 64,
};

export const PED = {
  radius: 11,
  walkSpeed: 46,
  runSpeed: 150,
  fleeRadius: 260,
};

export const POLICE = {
  // Heat thresholds that raise the wanted level, and how many units answer.
  starHeat: [0, 8, 30, 50, 70, 90],
  maxCars: [0, 2, 3, 4, 5, 6],
  maxFoot: [0, 2, 3, 4, 6, 8],
  heatDecay: 4.5,
  coolSeconds: 9,
  bustSeconds: 1.4,
  spawnDistance: 620,
  despawnDistance: 1100,
};

export const CRIME_HEAT = {
  stealCar: 12,
  hitPed: 15,
  killPed: 25,
  shoot: 8,
  hitCop: 20,
  killCop: 35,
  robStore: 22,
  robBank: 45,
};

export const MISSION_REWARD = [200, 400, 800, 600, 1000, 2500];
export const TAXI_FARE = [35, 50, 65, 80];
export const STASH_VALUE = 100;
export const STASH_COUNT = 10;

export const PALETTE = {
  grass: '#7fae62',
  grassDark: '#6d9c54',
  sand: '#ecd9a4',
  water: '#2e9db4',
  waterDeep: '#1f7f9e',
  road: '#3c3f46',
  roadEdge: '#2e3138',
  lane: '#e8d44d',
  sidewalk: '#b9b3a4',
  curb: '#8f887a',
  park: '#5d9150',
  buildingRoof: ['#d97b5f', '#e8a25c', '#7fb3c8', '#c8b48a', '#a87fb3', '#e0788a', '#8fb573', '#6f8fc0'],
  buildingWall: '#5a5148',
  downtownRoof: ['#5d7ea6', '#7a6a9e', '#4f8a7d', '#96705a'],
  player: '#2f6fd0',
  playerShirt: '#f2f2f2',
  cop: '#1d3a6e',
  copCar: '#eef1f5',
  marker: '#ffd23f',
  beacon: 'rgba(255, 210, 63, 0.55)',
  hudPanel: 'rgba(12, 16, 24, 0.72)',
  hudText: '#f4f1e6',
  hudMuted: '#b9c0c9',
  star: '#ffd23f',
  starEmpty: 'rgba(255,255,255,0.28)',
  health: '#4ecb5d',
  healthLow: '#e5534b',
  cash: '#7ee081',
  sky: '#f7c873',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_HEAVY = '"Arial Black", "Trebuchet MS", sans-serif';

/** Where the save lives between visits (this browser only). */
export const SAVE_KEY = 'coral-bay-hot-streets.save.v1';

/** Landmark names, all original to Coral Bay. */
export const PLACES = {
  garage: "Bea's Garage",
  hospital: 'Coral Bay General',
  store: 'Sunset Mart',
  bank: 'Coral Bay Bank',
  docks: 'South Docks',
  hideout: 'Ray’s Hideout',
  beach: 'Palmera Beach',
};
