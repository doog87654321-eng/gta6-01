// Bea's story: six missions for Ray, plus taxi fares and hidden cash
// stashes on the side. The mission control owns the objective text, the
// map marker and the timers; the world owns the player and the cash.

import { CFG } from './config.js';
import { randomSidewalkPoint, randomRoadPoint } from './city.js';

export const MISSION_DEFS = [
  { id: 0, title: 'First Ride', brief: 'Bea: "Steal a car and bring it to my garage."' },
  { id: 1, title: 'Cab Call', brief: 'Bea: "A fare is waiting. Pick them up, drop them off. Keep it clean."' },
  { id: 2, title: 'The Drop', brief: 'Bea: "Grab the package on foot, then run it to the docks. The cops will be watching."' },
  { id: 3, title: 'Heat Wave', brief: 'Bea: "Three stars on you. Survive sixty seconds, then come home."' },
  { id: 4, title: 'Cash Stash', brief: 'Bea: "Three stashes are hidden around Coral Bay. Collect them on foot."' },
  { id: 5, title: 'The Big One', brief: 'Bea: "The bank. Grab the cash and get out. Every cop in the city will be on you."' },
];

export class MissionControl {
  constructor(game) {
    this.game = game;
    this.index = game.saveMission || 0; // 0..5, 6 = story done
    this.step = 0;
    this.timer = 0;
    this.stashesGot = 0;
    this.grabT = 0;
    this.fare = null;      // {x, y} a waiting fare
    this.fareRide = null;  // {x, y, t} destination and the clock
    this.package = null;   // {x, y} the drop package
    this.fareCooldown = 6;
    this.entered = false;
    this.banner = '';
  }

  get done() { return this.index >= MISSION_DEFS.length; }
  get def() { return MISSION_DEFS[this.index]; }

  startMission() {
    this.entered = true;
    this.step = 0;
    this.timer = 0;
    this.grabT = 0;
    const g = this.game;
    if (this.index === 1) {
      this.fare = randomSidewalkPoint(g.city, g.rng);
    } else if (this.index === 2) {
      this.package = randomSidewalkPoint(g.city, g.rng);
    } else if (this.index === 3) {
      g.police.stars = 3;
      g.police.lastCrimeT = g.time;
      this.timer = 60;
    } else if (this.index === 4) {
      // Any three stashes count: the player should not have to guess
      // which three the map picked for them.
      this.stashesGot = 0;
    }
    this.banner = `${this.def.title} — ${this.def.brief}`;
    g.banner = { text: this.banner, t: 5 };
    if (g.sfx) g.sfx.jingle();
  }

  completeMission() {
    const g = this.game;
    const pay = CFG.pay.mission[this.index];
    g.addCash(pay);
    g.banner = { text: `Mission complete: ${this.def.title}  +$${pay}`, t: 4 };
    if (g.sfx) g.sfx.cash();
    this.index++;
    this.step = 0;
    this.entered = false;
    this.fare = null;
    this.fareRide = null;
    this.package = null;
    g.saveProgress();
    if (this.done) {
      g.banner = { text: 'Coral Bay is yours, Ray. Free roam — fares and stashes still pay.', t: 6 };
    }
  }

  // The world calls this every frame with the E key's pressed state.
  update(dt, ePressed) {
    const g = this.game;
    const p = g.player;
    if (!this.entered && !this.done) this.startMission();
    if (!this.done) this.updateStory(dt, ePressed);
    this.updateSide(dt, ePressed);
  }

  updateStory(dt, ePressed) {
    const g = this.game;
    const p = g.player;
    const near = (x, y, r) => Math.hypot(p.x - x, p.y - y) < r;
    switch (this.index) {
      case 0:
        if (this.step === 0 && p.car) { this.step = 1; }
        else if (this.step === 1 && p.car && near(g.city.garage.x, g.city.garage.y, 70)) this.completeMission();
        break;
      case 1:
        if (this.step === 0 && this.fare && p.car && near(this.fare.x, this.fare.y, 50)) {
          this.fareRide = { ...randomRoadPoint(g.city, g.rng), t: 90 };
          this.fare = null;
          this.step = 1;
          g.banner = { text: 'Fare aboard — get them there in time.', t: 3 };
        } else if (this.step === 1 && this.fareRide) {
          this.fareRide.t -= dt;
          if (near(this.fareRide.x, this.fareRide.y, 70)) {
            g.addCash(CFG.pay.taxi);
            g.banner = { text: `Fare delivered  +$${CFG.pay.taxi}`, t: 3 };
            if (g.sfx) g.sfx.cash();
            this.fareRide = null;
            this.completeMission();
          } else if (this.fareRide.t <= 0) {
            g.banner = { text: 'The fare walked off. Bea is not impressed.', t: 3 };
            this.fareRide = null;
            this.step = 0;
            this.fare = randomSidewalkPoint(g.city, g.rng);
          }
        }
        break;
      case 2:
        if (this.step === 0 && this.package && !p.car && near(this.package.x, this.package.y, 36)) {
          this.package = null;
          this.step = 1;
          g.police.addCrime(2, g);
          g.banner = { text: 'Package grabbed — run it to the docks!', t: 3 };
        } else if (this.step === 1 && near(g.city.docks.x, g.city.docks.y, 70)) {
          this.completeMission();
        }
        break;
      case 3:
        if (this.step === 0) {
          this.timer -= dt;
          if (this.timer <= 0) { this.step = 1; g.banner = { text: 'You made it. Get back to the garage.', t: 3 }; }
        } else if (this.step === 1 && near(g.city.garage.x, g.city.garage.y, 70)) {
          this.completeMission();
        }
        break;
      case 4:
        if (this.step === 0 && this.stashesGot >= 3) this.completeMission();
        break;
      case 5:
        if (this.step === 0 && near(g.city.bank.x, g.city.bank.y, 80)) {
          this.step = 1;
          g.banner = { text: 'Hold E to grab the cash.', t: 3 };
        } else if (this.step === 1) {
          if (near(g.city.bank.x, g.city.bank.y, 80) && g.eHeld) {
            this.grabT += dt;
            if (this.grabT >= 3) {
              this.step = 2;
              g.police.stars = 5;
              g.police.lastCrimeT = g.time;
              g.banner = { text: 'Cash grabbed! Every cop in Coral Bay is coming. RUN.', t: 4 };
              if (g.sfx) g.sfx.cash();
            }
          } else {
            this.grabT = Math.max(0, this.grabT - dt * 2);
          }
        } else if (this.step === 2 && near(g.city.garage.x, g.city.garage.y, 70)) {
          this.completeMission();
        }
        break;
      default:
        break;
    }
    void ePressed;
  }

  updateSide(dt, ePressed) {
    const g = this.game;
    const p = g.player;
    // Cash stashes: walk over one on foot to collect it.
    for (const s of g.city.stashSpots) {
      if (s.taken) continue;
      if (!p.car && Math.hypot(p.x - s.x, p.y - s.y) < 32) {
        s.taken = true;
        s.respawnT = 90;
        g.addCash(CFG.pay.stash);
        if (g.sfx) g.sfx.pickup();
        g.banner = { text: `Cash stash  +$${CFG.pay.stash}`, t: 2.5 };
        if (this.index === 4) this.stashesGot++;
      }
    }
    for (const s of g.city.stashSpots) {
      if (s.taken && s.respawnT !== undefined) {
        s.respawnT -= dt;
        if (s.respawnT <= 0) { s.taken = false; s.respawnT = undefined; }
      }
    }
    // Taxi fares after the cab mission: a fare waits, E picks them up.
    this.fareCooldown -= dt;
    if (this.index >= 2 && !this.fare && !this.fareRide && this.fareCooldown <= 0 && p.car) {
      const pt = randomSidewalkPoint(g.city, g.rng);
      if (Math.hypot(pt.x - p.x, pt.y - p.y) < 800) this.fare = pt;
      else this.fareCooldown = 3;
    }
    if (this.fare && p.car && Math.hypot(p.x - this.fare.x, p.y - this.fare.y) < 50 && ePressed) {
      this.fareRide = { ...randomRoadPoint(g.city, g.rng), t: 75 };
      this.fare = null;
      g.banner = { text: 'Fare aboard — get them there in time.', t: 3 };
    }
    if (this.fareRide) {
      this.fareRide.t -= dt;
      if (Math.hypot(p.x - this.fareRide.x, p.y - this.fareRide.y) < 70) {
        g.addCash(CFG.pay.taxi);
        g.banner = { text: `Fare delivered  +$${CFG.pay.taxi}`, t: 3 };
        if (g.sfx) g.sfx.cash();
        this.fareRide = null;
        this.fareCooldown = 10;
      } else if (this.fareRide.t <= 0) {
        g.banner = { text: 'The fare gave up waiting.', t: 3 };
        this.fareRide = null;
        this.fareCooldown = 12;
      }
    }
  }

  objectiveText() {
    if (this.done) return 'Free roam — fares and stashes still pay.';
    switch (this.index) {
      case 0: return this.step === 0 ? 'Steal a car (E near a car)' : 'Drive it to Bea\'s garage';
      case 1: return this.step === 0 ? 'Pick up the fare' : `Drop the fare off — ${Math.ceil(this.fareRide?.t ?? 0)}s left`;
      case 2: return this.step === 0 ? 'Grab the package on foot' : 'Run the package to the docks';
      case 3: return this.step === 0 ? `Survive the heat — ${Math.ceil(this.timer)}s` : 'Get back to Bea\'s garage';
      case 4: return `Collect the stashes — ${this.stashesGot}/3`;
      case 5:
        if (this.step === 0) return 'Get to the bank';
        if (this.step === 1) return 'Hold E to grab the cash';
        return 'Escape to Bea\'s garage — 5 stars!';
      default: return '';
    }
  }

  // The current map marker, or null when there is none.
  marker() {
    if (this.fareRide) return { x: this.fareRide.x, y: this.fareRide.y, kind: 'ride' };
    if (this.done) return this.fare ? { x: this.fare.x, y: this.fare.y, kind: 'fare' } : null;
    switch (this.index) {
      case 0: return this.step === 1 ? { x: this.game.city.garage.x, y: this.game.city.garage.y, kind: 'garage' } : null;
      case 1: return this.step === 0 && this.fare ? { x: this.fare.x, y: this.fare.y, kind: 'fare' } : null;
      case 2: return this.step === 0 && this.package ? { x: this.package.x, y: this.package.y, kind: 'package' } : { x: this.game.city.docks.x, y: this.game.city.docks.y, kind: 'docks' };
      case 3: return this.step === 1 ? { x: this.game.city.garage.x, y: this.game.city.garage.y, kind: 'garage' } : null;
      case 4: {
        // Point at the nearest stash still on the map.
        let best = null, bd = 1e9;
        for (const sp of this.game.city.stashSpots) {
          if (sp.taken) continue;
          const d = Math.hypot(sp.x - this.game.player.x, sp.y - this.game.player.y);
          if (d < bd) { bd = d; best = sp; }
        }
        return best ? { x: best.x, y: best.y, kind: 'stash' } : null;
      }
      case 5:
        if (this.step === 0 || this.step === 1) return { x: this.game.city.bank.x, y: this.game.city.bank.y, kind: 'bank' };
        return { x: this.game.city.garage.x, y: this.game.city.garage.y, kind: 'garage' };
      default: return null;
    }
  }
}
