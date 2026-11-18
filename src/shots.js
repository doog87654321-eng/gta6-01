// Screenshot staging: ?shot=walk|drive|chase|mission|title&seed=7 puts the
// game into a real scene (nothing is drawn just for the camera) and sets
// window.__shotReady once it has been painted.

import { CFG } from './config.js';

export function applyShot(game, name) {
  const p = game.player;
  const city = game.city;
  game.state = 'playing';
  game.police.stars = 0;
  game.police.copCars = [];
  game.police.footCops = [];

  if (name === 'title') {
    game.state = 'title';
  } else if (name === 'walk') {
    // On foot in the park, mission 1 objective showing.
    p.inCar = false;
    p.car = null;
    p.x = city.park.x + city.park.w / 2;
    p.y = city.park.y + city.park.h / 2 + 60;
    p.angle = -Math.PI / 2;
    game.camera.x = Math.max(0, Math.min(CFG.WORLD_W - 1280, p.x - 640));
    game.camera.y = Math.max(0, Math.min(CFG.WORLD_H - 720, p.y - 360));
  } else if (name === 'drive') {
    // In a car on a road, moving.
    const car = game.traffic[0];
    if (car) {
      game.traffic = game.traffic.filter((c) => c !== car);
      p.inCar = true;
      p.car = car;
      car.kind = 'player';
      car.color = CFG.COL.playerCar;
      car.x = 900;
      car.y = 600; // road centreline, not the park
      car.angle = 0;
      car.speed = 320;
      p.x = car.x;
      p.y = car.y;
      p.angle = 0;
      game.camera.x = Math.max(0, Math.min(CFG.WORLD_W - 1280, p.x - 640));
      game.camera.y = Math.max(0, Math.min(CFG.WORLD_H - 720, p.y - 360));
    }
  } else if (name === 'chase') {
    // 3 stars, cop cars on the player's tail, mission 4 running.
    p.inCar = false;
    p.car = null;
    p.x = 1200;
    p.y = 1200;
    p.angle = 0;
    game.police.stars = 3;
    game.police.spawnCopCar(p);
    game.police.spawnCopCar(p);
    game.missions.index = 3;
    game.missions.stage = 1;
    game.missions.stageT = 42;
    game.camera.x = Math.max(0, Math.min(CFG.WORLD_W - 1280, p.x - 640));
    game.camera.y = Math.max(0, Math.min(CFG.WORLD_H - 720, p.y - 360));
  } else if (name === 'mission') {
    // The bank job at 5 stars, outside the Coral Bank.
    p.inCar = false;
    p.car = null;
    p.x = city.bank.x + city.bank.w / 2;
    p.y = city.bank.y + city.bank.h + 60;
    p.angle = -Math.PI / 2;
    game.police.stars = 5;
    game.police.spawnCopCar(p);
    game.police.spawnCopCar(p);
    game.missions.index = 5;
    game.missions.stage = 0;
    game.missions.marker = { x: city.bank.x + city.bank.w / 2, y: city.bank.y + city.bank.h / 2, label: 'Bank' };
    game.camera.x = Math.max(0, Math.min(CFG.WORLD_W - 1280, p.x - 640));
    game.camera.y = Math.max(0, Math.min(CFG.WORLD_H - 720, p.y - 360));
  }
}
