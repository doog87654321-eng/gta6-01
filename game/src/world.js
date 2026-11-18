// The game itself: state machine (title / playing / paused / busted /
// wasted), the player, the update loop, the camera, and the wiring between
// city, traffic, police, combat and missions.

import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { buildCity, resolveBuildings, clampWorld } from './city.js';
import { createInput } from './input.js';
import { Sfx } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { makeCar, driveCar, randomCarColor } from './vehicles.js';
import { spawnPeds, updatePeds, spawnTraffic, updateTraffic } from './people.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { drawGame } from './render.js';

const VIEW_W = 1280;
const VIEW_H = 720;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = makeRng(20261117);
    this.city = buildCity(20261117);
    this.input = createInput(canvas);
    this.sfx = new Sfx();
    this.save = loadSave() || { cash: 0, mission: 0, stashes: [], bestStars: 0 };
    this.state = 'title';
    this.time = 0;
    this.camera = { x: 0, y: 0 };
    this.flash = '';
    this.flashT = 0;
    this.danger = null;
    this.effects = []; // particles {x,y,vx,vy,t,color}
    this.muted = false;

    this.player = {
      x: 320, y: 1950, angle: -Math.PI / 2,
      hp: CFG.PLAYER_HP, inCar: false, car: null,
      ammo: CFG.MAG, cash: this.save.cash || 0,
      speed: 0,
    };

    this.peds = spawnPeds(this.city, 777, CFG.PED_N);
    this.traffic = spawnTraffic(this.city, 888, CFG.TRAFFIC_N);
    this.police = new Police(this.city);
    this.combat = new Combat();
    this.missions = new Missions(this.city, this);
    // Restore taken stashes from the save.
    this.city.stashes.forEach((s, i) => {
      if (this.save.stashes && this.save.stashes[i]) s.taken = true;
    });
  }

  addCash(n) {
    this.player.cash += n;
    this.persist();
  }

  persist() {
    this.save.cash = this.player.cash;
    this.save.mission = this.missions.index;
    this.save.stashes = this.city.stashes.map((s) => s.taken);
    this.save.bestStars = Math.max(this.save.bestStars || 0, this.police.stars);
    writeSave(this.save);
  }

  busted() {
    if (this.state !== 'playing') return;
    this.state = 'busted';
    this.sfx.busted();
    this.sfx.siren(false);
    this.sfx.engine(0);
    const fine = Math.min(100, this.player.cash);
    this.player.cash -= fine;
    this.persist();
  }

  wasted() {
    if (this.state !== 'playing') return;
    this.state = 'wasted';
    this.sfx.busted();
    this.sfx.siren(false);
    this.sfx.engine(0);
  }

  respawn() {
    const p = this.player;
    p.hp = CFG.PLAYER_HP;
    p.ammo = CFG.MAG;
    p.inCar = false;
    p.car = null;
    p.x = 320;
    p.y = 1950;
    p.angle = -Math.PI / 2;
    this.police.stars = 0;
    this.police.copCars = [];
    this.police.footCops = [];
    this.combat.tracers = [];
    this.combat.reloadT = 0;
    this.effects = [];
    this.state = 'playing';
  }

  // World position of the mouse cursor.
  mouseWorld() {
    const m = this.input.mouse;
    return { x: m.x + this.camera.x, y: m.y + this.camera.y };
  }

  nearestCar(maxD) {
    const p = this.player;
    let best = null;
    let bestD = maxD;
    const all = [...this.traffic, ...this.police.copCars];
    for (const c of all) {
      if (c.dead) continue;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  enterCar(car) {
    const p = this.player;
    // Stealing a traffic car (or a cop car) is a crime.
    const isTraffic = this.traffic.includes(car);
    const isCop = this.police.copCars.includes(car);
    if (isTraffic) {
      this.traffic = this.traffic.filter((c) => c !== car);
      this.police.addHeat(1);
    }
    if (isCop) {
      this.police.copCars = this.police.copCars.filter((c) => c !== car);
      this.police.addHeat(1);
    }
    p.inCar = true;
    p.car = car;
    car.kind = 'player';
    car.color = CFG.COL.playerCar;
    p.x = car.x;
    p.y = car.y;
    this.sfx.pickup();
  }

  exitCar() {
    const p = this.player;
    const car = p.car;
    p.inCar = false;
    p.car = null;
    p.x = car.x - Math.sin(car.angle) * 34;
    p.y = car.y + Math.cos(car.angle) * 34;
    p.angle = car.angle;
    car.kind = 'civilian';
    resolveBuildings(this.city.buildings, p, CFG.PLAYER_R);
    clampWorld(p, 14);
  }

  update(dt) {
    this.time += dt;
    const input = this.input;
    const p = this.player;

    if (this.state === 'title') {
      if (input.mouse.clicked || input.pressed('Enter') || input.pressed('Space')) {
        this.sfx.unlock();
        this.state = 'playing';
      }
      input.endFrame();
      return;
    }
    if (this.state === 'busted' || this.state === 'wasted') {
      if (input.mouse.clicked || input.pressed('KeyR') || input.pressed('Enter')) {
        this.respawn();
      }
      input.endFrame();
      return;
    }
    if (this.state === 'paused') {
      if (input.pressed('Escape')) this.state = 'playing';
      input.endFrame();
      return;
    }

    // --- playing ---
    if (input.pressed('Escape')) {
      this.state = 'paused';
      this.sfx.engine(0);
      this.sfx.siren(false);
      input.endFrame();
      return;
    }
    if (input.pressed('KeyM')) {
      this.muted = !this.muted;
      this.sfx.setMuted(this.muted);
    }

    // Enter / exit a car.
    if (input.pressed('KeyE')) {
      if (p.inCar) this.exitCar();
      else {
        const car = this.nearestCar(CFG.ENTER_DIST);
        if (car) this.enterCar(car);
      }
    }

    if (p.inCar && p.car) {
      const axis = input.axis();
      driveCar(p.car, axis, dt, this.city.buildings);
      p.x = p.car.x;
      p.y = p.car.y;
      p.angle = p.car.angle;
      p.speed = p.car.speed;
      if (input.pressed('KeyH')) this.sfx.horn();
      this.sfx.engine(Math.abs(p.car.speed) / CFG.CAR_MAX);
      // Bump traffic cars out of the way.
      for (const c of this.traffic) {
        if (c.dead) continue;
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d > 0.01 && d < 42) {
          const nx = (c.x - p.x) / d;
          const ny = (c.y - p.y) / d;
          c.x += nx * (42 - d);
          c.y += ny * (42 - d);
        }
      }
    } else {
      const axis = input.axis();
      const sp = input.running() ? CFG.RUN_SPEED : CFG.WALK_SPEED;
      p.x += axis.x * sp * dt;
      p.y += axis.y * sp * dt;
      if (axis.x || axis.y) p.angle = Math.atan2(axis.y, axis.x);
      resolveBuildings(this.city.buildings, p, CFG.PLAYER_R);
      clampWorld(p, 14);
      this.sfx.engine(0);
      // Aim and shoot with the mouse.
      const mw = this.mouseWorld();
      const aim = Math.atan2(mw.y - p.y, mw.x - p.x);
      p.aim = aim;
      if (input.mouse.down || input.mouse.clicked) {
        this.combat.shoot(this, p.x, p.y, aim);
      }
      if (input.pressed('KeyR') && p.ammo < CFG.MAG) {
        this.combat.startReload();
        this.sfx.reload();
      }
    }

    // Missions, police, city life.
    this.missions.update(dt);
    this.missions.checkStashes();
    this.police.update(dt, p, this);
    updatePeds(this.peds, dt, this.city, this.danger);
    updateTraffic(this.traffic, dt, this.city);
    const wasReloading = this.combat.reloadT > 0;
    this.combat.update(dt);
    if (wasReloading && this.combat.reloadT <= 0) p.ammo = CFG.MAG;

    // Particles.
    for (const e of this.effects) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.t -= dt;
    }
    this.effects = this.effects.filter((e) => e.t > 0);
    if (this.danger) this.danger = null;

    // Siren while wanted.
    this.sfx.siren(this.police.stars > 0);
    this.sfx.sirenTick(this.time);

    // Health / death.
    if (p.hp <= 0) {
      p.hp = 0;
      this.wasted();
    }
    if (this.flashT > 0) this.flashT -= dt;

    // Camera follows the player.
    this.camera.x = Math.max(0, Math.min(CFG.WORLD_W - VIEW_W, p.x - VIEW_W / 2));
    this.camera.y = Math.max(0, Math.min(CFG.WORLD_H - VIEW_H, p.y - VIEW_H / 2));

    input.endFrame();
  }

  render() {
    drawGame(this.ctx, this);
  }
}
