// Screenshot scenes behind ?shot=walk|drive|chase|mission|title. Each one
// stages a real world from the fixed seed, places the player, the cars and
// the police where the scene needs them, then plays the real rules forward
// for a fixed number of steps with a small autopilot, so the frame is what a
// short game really looks like — never a mock-up.

import { STEP } from './config.js';
import { MISSIONS, startMission } from './missions.js';
import { makeCar, enterCar } from './vehicles.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** No keys held, no mouse: the world idles while traffic and peds move. */
const IDLE_INPUT = {
  walkVector: () => null,
  move: () => ({ steer: 0, drive: 0, run: false }),
  shiftHeld: () => false,
  mouse: { down: false, x: 0, y: 0 },
};

/** Foot on the gas, hands off the wheel: straight down the avenue. */
const DRIVE_INPUT = {
  walkVector: () => null,
  move: () => ({ steer: 0, drive: 1, run: false }),
  shiftHeld: () => false,
  mouse: { down: false, x: 0, y: 0 },
};

function putPlayerInCar(G, model, x, y, angle) {
  const car = makeCar(model, x, y, angle, 'parked');
  car.driver = false;
  car.speed = 220;
  G.cars.push(car);
  enterCar(G, car);
  G.player.wantedHeat = 0;
  return car;
}

function addPoliceCar(G, x, y, angle, speed) {
  const car = makeCar('police', x, y, angle, 'police');
  car.siren = true;
  car.speed = speed;
  car.ai.targetSpeed = 560;
  G.cars.push(car);
  G.policeCars.push(car);
  return car;
}

function addFootCop(G, x, y) {
  G.cops.push({ x, y, angle: 0, speed: 0, hp: 60, down: false, downTimer: 0, bustTimer: 0 });
}

/**
 * Stage the named scene on G (already a fresh world) and return the screen
 * to draw, the input to steer with, and how many fixed steps to play.
 */
export function stageShot(name, G) {
  const p = G.player;
  // Staged scenes speak for themselves; the welcome line would stale-date them.
  G.message = '';
  G.messageTimer = 0;
  if (name === 'title') {
    // A slow pan over downtown, traffic and peds alive underneath the title.
    G.camera.x = 1500;
    G.camera.y = 1300;
    return { screen: SCREEN_TITLE, input: IDLE_INPUT, steps: Math.floor(4 / STEP) };
  }
  if (name === 'drive') {
    // Ray in a Vortex GT, flying up the beach avenue, traffic alongside.
    putPlayerInCar(G, 'sports', 3100, 1900, -Math.PI / 2);
    G.player.car.speed = 430;
    const taxi = makeCar('taxi', 3064, 1500, -Math.PI / 2, 'traffic');
    taxi.speed = 300;
    G.cars.push(taxi);
    const sedan = makeCar('sedan', 3136, 1200, -Math.PI / 2, 'traffic');
    sedan.speed = 260;
    G.cars.push(sedan);
    G.camera.x = p.x;
    G.camera.y = p.y;
    return { screen: SCREEN_PLAY, input: DRIVE_INPUT, steps: Math.floor(1.6 / STEP) };
  }
  if (name === 'chase') {
    // Three stars, three interceptors on Ray's tail, the Hideout marked.
    putPlayerInCar(G, 'muscle', 1900, 1500, -Math.PI / 2);
    G.player.car.speed = 480;
    G.mission = {
      def: MISSIONS[2],
      stageIndex: 2,
      timer: 0,
      progress: 0,
      active: true,
      done: false,
      failed: false,
      failReason: '',
      targetCar: null,
      gangLeft: 0,
      spawned: false,
    };
    G.player.wantedHeat = 65;
    G.player.lastCrime = G.time;
    addPoliceCar(G, 1864, 1780, -Math.PI / 2, 520);
    addPoliceCar(G, 1936, 1900, -Math.PI / 2, 500);
    addPoliceCar(G, 1900, 2050, -Math.PI / 2, 540);
    addFootCop(G, 1820, 1300);
    addFootCop(G, 1980, 1250);
    G.spawnTimer = 99;
    G.camera.x = p.x;
    G.camera.y = p.y;
    return { screen: SCREEN_PLAY, input: DRIVE_INPUT, steps: Math.floor(2.2 / STEP) };
  }
  if (name === 'mission') {
    // Turf War: Ray defends Bea's garage, pistol out, the Vultures closing in.
    startMission(G, 4);
    p.x = 700;
    p.y = 2050;
    p.angle = Math.PI / 2;
    // The staged shootout is a photo, not a fight: Ray cannot die for it.
    p.invuln = 999;
    G.camera.x = p.x;
    G.camera.y = p.y;
    return { screen: SCREEN_PLAY, input: IDLE_INPUT, steps: Math.floor(4 / STEP) };
  }
  // Default: walk — Ray on foot downtown, the city alive around him.
  p.x = 1500;
  p.y = 1240;
  p.angle = Math.PI / 2;
  startMission(G, 0);
  G.camera.x = p.x;
  G.camera.y = p.y;
  return { screen: SCREEN_PLAY, input: IDLE_INPUT, steps: Math.floor(2.5 / STEP) };
}
