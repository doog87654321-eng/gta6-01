// The game itself: state machine, player, cars, and the update loop that
// ties the city, the people, the police, the combat and the missions
// together. Rendering lives in render.js; staging lives in shots.js.

import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { buildCity, resolveCircle, randomRoadPoint } from './city.js';
import { Sfx } from './audio.js';
import { keys, wasPressed, isDown, mouse } from './input.js';
import { loadSave, storeSave } from './save.js';
import { Pedestrians, Traffic } from './people.js';
import { Car } from './vehicles.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { MissionControl } from './missions.js';

const PARKED_COLORS = ['#b0483e', '#3e6fb0', '#c9a13e', '#5d8a5a', '#8a5a9e', '#c9c9c9', '#3a3f47', '#b0703e'];

export class Game {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.opts = opts || {};
    const save = loadSave();
    this.save = save;
    this.saveMission = save ? save.mission : 0;
    this.cash = save ? save.cash : 150;
    this.stashesFound = save ? save.stashes : 0;
    this.bestWanted = save ? save.bestWanted : 0;

    const seed = this.opts.seed ?? (Date.now() % 2147483647);
    this.rng = makeRng(seed);
    this.city = buildCity(this.rng);
    this.sfx = new Sfx();
    this.time = 0;
    this.state = 'title'; // title | playing | paused | busted | dead
    this.cam = { x: 0, y: 0 };
    this.particles = [];
    this.banner = null;
    this.saveT = 0;
    this.eHeld = false;

    this.player = {
      x: this.city.garage.x,
      y: this.city.garage.y + 120,
      angle: -Math.PI / 2,
      aimAngle: 0,
      health: CFG.player.health,
      ammo: CFG.player.mag,
      reloading: false,
      reloadT: 0,
      car: null,
      lastHurtT: -999,
    };

    this.peds = new Pedestrians(this.city, this.rng);
    this.traffic = new Traffic(this.city, this.rng);
    this.police = new Police(this.city, this.rng);
    this.combat = new Combat();
    this.missions = new MissionControl(this);
    this.parked = [];
    for (let i = 0; i < 9; i++) this.parked.push(this.spawnParked());
    this.shotMode = this.opts.shot || null;
  }

  spawnParked() {
    const p = randomRoadPoint(this.city, this.rng);
    const horizontal = this.rng.chance(0.5);
    const angle = horizontal ? (this.rng.chance(0.5) ? 0 : Math.PI) : (this.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const car = new Car(
      horizontal ? p.x : p.x + (this.rng.chance(0.5) ? 44 : -44),
      horizontal ? p.y + (this.rng.chance(0.5) ? 44 : -44) : p.y,
      angle,
      this.rng.pick(PARKED_COLORS),
      this.rng.pick(['sedan', 'sedan', 'coupe', 'truck']),
    );
    car._city = this.city;
    return car;
  }

  addCash(n) { this.cash = Math.max(0, this.cash + n); }

  saveProgress() {
    storeSave({
      cash: this.cash,
      mission: this.missions.index,
      stashes: this.stashesFound,
      bestWanted: this.bestWanted,
    });
  }

  start() {
    this.state = 'playing';
    this.sfx.unlock();
  }

  togglePause() {
    if (this.state === 'playing') { this.state = 'paused'; this.saveProgress(); }
    else if (this.state === 'paused') this.state = 'playing';
  }

  busted() {
    if (this.state !== 'playing') return;
    this.state = 'busted';
    this.cash = Math.max(0, this.cash - 150);
    if (this.sfx) this.sfx.busted();
    this.saveProgress();
  }

  respawn() {
    this.player.x = this.city.garage.x;
    this.player.y = this.city.garage.y + 120;
    this.player.health = CFG.player.health;
    this.player.ammo = CFG.player.mag;
    this.player.car = null;
    this.police.stars = 0;
    this.police.cars = [];
    this.police.cops = [];
    this.state = 'playing';
    this.saveProgress();
  }

  kill() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.cash = Math.max(0, this.cash - 150);
    this.saveProgress();
  }

  aimWorld() {
    return { x: this.cam.x + mouse.x, y: this.cam.y + mouse.y };
  }

  nearestCar(maxDist) {
    const p = this.player;
    let best = null, bestD = maxDist;
    const consider = (car, kind) => {
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d < bestD) { bestD = d; best = { car, kind }; }
    };
    for (const c of this.parked) if (!c.wrecked) consider(c, 'parked');
    for (const c of this.traffic.list) consider({ x: this.traffic.x(c), y: this.traffic.y(c), ref: c }, 'traffic');
    return best;
  }

  enterCar() {
    const p = this.player;
    const found = this.nearestCar(75);
    if (!found) return;
    let car;
    if (found.kind === 'parked') {
      car = found.car;
      this.parked = this.parked.filter((c) => c !== car);
      // An empty parked car is only a crime if a cop saw it happen.
      if (this.police.nearestCopDist(this) < 500) this.police.addCrime(CFG.wanted.stealCar, this);
    } else {
      const t = found.car.ref;
      this.traffic.list = this.traffic.list.filter((c) => c !== t);
      car = new Car(found.car.x, found.car.y, this.traffic.angle(t), t.taxi ? '#e8c33a' : t.color, t.model);
      car._city = this.city;
      car.taxi = t.taxi;
      // Stealing a car someone is driving is always a crime.
      this.police.addCrime(CFG.wanted.stealCar, this);
    }
    p.car = car;
    p.x = car.x; p.y = car.y;
    if (this.sfx) this.sfx.pickup();
  }

  exitCar() {
    const p = this.player;
    const car = p.car;
    if (!car) return;
    const side = car.angle + Math.PI / 2;
    p.x = car.x + Math.cos(side) * 34;
    p.y = car.y + Math.sin(side) * 34;
    resolveCircle(this.city, p, CFG.player.radius);
    p.car = null;
    this.parked.push(car);
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    if (this.state === 'title') {
      this.peds.update(dt, this);
      this.traffic.update(dt);
      this.time += dt;
      return;
    }
    if (this.state !== 'playing') return;
    this.time += dt;
    const p = this.player;
    this.eHeld = keys.has('KeyE');
    // Escape is handled in main.js (it must work while paused too).

    if (wasPressed('KeyM')) this.sfx.setMuted(!this.sfx.muted);
    // H honks the horn while driving.
    if (wasPressed('KeyH') && p.car && this.sfx) this.sfx.horn();
    if (wasPressed('KeyE')) {
      if (p.car) this.exitCar();
      else this.enterCar();
    }

    // Movement.
    const up = isDown('KeyW') || isDown('ArrowUp');
    const down = isDown('KeyS') || isDown('ArrowDown');
    const left = isDown('KeyA') || isDown('ArrowLeft');
    const right = isDown('KeyD') || isDown('ArrowRight');
    const run = isDown('ShiftLeft') || isDown('ShiftRight');
    if (p.car) {
      const car = p.car;
      car.setInput(up, down, left, right);
      car.drive(dt, this.city, this.traffic.list.map((t) => ({ x: this.traffic.x(t), y: this.traffic.y(t), speed: t.speed, wrecked: false })));
      p.x = car.x; p.y = car.y;
      this.sfx.engine(Math.abs(car.speed) / CFG.car.maxSpeed);
      if (car.wrecked) {
        this.particles.push({ x: car.x, y: car.y, t: 0.5, color: '#ff8a3c', n: 14 });
        p.health -= 15;
        p.lastHurtT = this.time;
        this.exitCar();
        this.police.addCrime(1, this);
      }
    } else {
      this.sfx.engine(0);
      let mx = (right ? 1 : 0) - (left ? 1 : 0);
      let my = (down ? 1 : 0) - (up ? 1 : 0);
      const len = Math.hypot(mx, my);
      if (len > 0) {
        mx /= len; my /= len;
        const sp = run ? CFG.player.run : CFG.player.walk;
        p.x += mx * sp * dt;
        p.y += my * sp * dt;
        p.angle = Math.atan2(my, mx);
        resolveCircle(this.city, p, CFG.player.radius);
      }
      const aim = this.aimWorld();
      p.aimAngle = Math.atan2(aim.y - p.y, aim.x - p.x);
      // Shooting.
      if (p.reloading) {
        p.reloadT -= dt;
        if (p.reloadT <= 0) { p.reloading = false; p.ammo = CFG.player.mag; }
      } else if (mouse.clicked) {
        if (p.ammo > 0) {
          p.ammo--;
          const mx0 = p.x + Math.cos(p.aimAngle) * 18;
          const my0 = p.y + Math.sin(p.aimAngle) * 18;
          this.combat.shoot(this, mx0, my0, p.aimAngle);
          if (this.sfx) this.sfx.shot();
          // Firing a gun in the city draws heat when the law is close.
          if (this.police.nearestCopDist(this) < 600) this.police.addCrime(CFG.wanted.shoot, this);
          if (p.ammo === 0) { p.reloading = true; p.reloadT = CFG.player.reloadTime; }
        }
      }
      if (wasPressed('KeyR') && !p.reloading && p.ammo < CFG.player.mag) {
        p.reloading = true;
        p.reloadT = CFG.player.reloadTime;
        if (this.sfx) this.sfx.reload();
      }
      // Health regen after a quiet spell.
      if (this.time - p.lastHurtT > CFG.player.regenDelay && p.health < CFG.player.health) {
        p.health = Math.min(CFG.player.health, p.health + CFG.player.regenRate * dt);
      }
    }

    if (p.health <= 0) { this.kill(); return; }

    this.peds.update(dt, this);
    this.traffic.update(dt);
    this.police.update(dt, this);
    this.combat.update(dt);
    this.missions.update(dt, wasPressed('KeyE'));
    this.sfx.siren(this.police.stars > 0);
    this.sfx.sirenTick(this.time);

    // Particles.
    for (const pt of this.particles) pt.t -= dt;
    this.particles = this.particles.filter((pt) => pt.t > 0);

    // Camera follows the player.
    this.cam.x = Math.max(0, Math.min(CFG.world - CFG.viewW, p.x - CFG.viewW / 2));
    this.cam.y = Math.max(0, Math.min(CFG.world - CFG.viewH, p.y - CFG.viewH / 2));

    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    this.saveT += dt;
    if (this.saveT > 10) { this.saveT = 0; this.saveProgress(); }
  }
}
