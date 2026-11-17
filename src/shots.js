// Screenshot staging: `?shot=walk|drive|chase|mission|title&seed=N` puts the
// game into a real, playable scene and main.js sets window.__shotReady
// once it has been painted. Every staged scene is the game itself running
// — nothing is drawn just for the camera.

import { CFG } from './config.js';
import { Car } from './vehicles.js';
import { roadCenter } from './city.js';

function giveCar(game, x, y, angle, color) {
  const car = new Car(x, y, angle, color || '#b0483e', 'sedan');
  car._city = game.city;
  car.speed = 380;
  game.player.car = car;
  game.player.x = x;
  game.player.y = y;
  return car;
}

function addPoliceCar(game, x, y, angle) {
  const car = new Car(x, y, angle, '#e8e8e8', 'sedan');
  car.police = true;
  car._city = game.city;
  car.speed = 420;
  game.police.cars.push(car);
  return car;
}

export function stageShot(game, name) {
  const city = game.city;
  const p = game.player;
  game.state = 'playing';
  game.cam.x = 0; game.cam.y = 0;

  if (name === 'title') {
    game.state = 'title';
    game.cam.x = 1200; game.cam.y = 1400;
    return;
  }

  if (name === 'walk') {
    // Ray on foot by the park, pedestrians around, first job on the board.
    p.car = null;
    p.x = 700; p.y = roadCenter(7) - 40;
    p.angle = Math.PI / 2;
    p.aimAngle = Math.PI / 2;
    game.missions.index = 0;
    game.missions.step = 0;
    game.missions.entered = true;
    game.police.stars = 0;
    return;
  }

  if (name === 'drive') {
    // Ray driving up a main drag, traffic all around.
    giveCar(game, 1500, roadCenter(3) + 27, 0, '#3e6fb0');
    game.missions.index = 0;
    game.missions.step = 1;
    game.missions.entered = true;
    game.police.stars = 0;
    return;
  }

  if (name === 'chase') {
    // Heat Wave: three stars, two PD cars on Ray's tail, racing east on the
    // road past Bea's garage — the yellow beam marks the goal.
    giveCar(game, 1500, roadCenter(2), 0, '#b0483e');
    game.missions.index = 3;
    game.missions.step = 1;
    game.missions.entered = true;
    game.missions.timer = 42;
    game.police.stars = 3;
    game.police.lastCrimeT = game.time;
    addPoliceCar(game, 1380, roadCenter(2), 0);
    addPoliceCar(game, 1300, roadCenter(2) + 50, 0);
    game.police.cops.push({ x: 1560, y: roadCenter(2) + 90, health: 100, shootT: 0.4, flash: 0 });
    return;
  }

  if (name === 'mission') {
    // The Big One: cash grabbed, five stars, fleeing east on the road past
    // the bank with the whole PD behind.
    giveCar(game, 2500, roadCenter(4), 0, '#c9a13e');
    game.missions.index = 5;
    game.missions.step = 2;
    game.missions.entered = true;
    game.missions.grabT = 3;
    game.police.stars = 5;
    game.police.lastCrimeT = game.time;
    addPoliceCar(game, 2360, roadCenter(4), 0);
    addPoliceCar(game, 2280, roadCenter(4) + 50, 0);
    addPoliceCar(game, 2650, roadCenter(4) + 50, Math.PI);
    game.police.cops.push({ x: 2590, y: roadCenter(4) + 95, health: 100, shootT: 0.4, flash: 0 });
    return;
  }

  // Unknown shot name: plain free roam.
  p.car = null;
  p.x = city.garage.x;
  p.y = city.garage.y + 120;
  void CFG;
}
