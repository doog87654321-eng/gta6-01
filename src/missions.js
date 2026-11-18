// Bea's six jobs, plus taxi fares and cash stashes on the side. Missions
// run in order; each one has stages with an objective line and a map
// marker. Completing a job pays cash and advances the story.

import { CFG, MISSIONS } from './config.js';
import { nearestRoadPoint } from './city.js';

function randomRoadPoint(city, rng, near, minDist) {
  for (let tries = 0; tries < 40; tries++) {
    const x = rng.range(80, CFG.LAND - 80);
    const y = rng.range(80, CFG.LAND - 80);
    const p = nearestRoadPoint(x, y);
    if (near && Math.hypot(p.x - near.x, p.y - near.y) < minDist) continue;
    return p;
  }
  return { x: 300, y: 300 };
}

export class Missions {
  constructor(city, game) {
    this.city = city;
    this.game = game;
    this.index = game.save.mission || 0; // next mission to run
    this.stage = 0;
    this.stageT = 0;      // timer for timed stages
    this.marker = null;   // {x, y} or null
    this.collected = 0;   // stashes collected for mission 4
    this.grabT = 0;       // bank grab progress
    this.taxi = null;     // side fare: {stage, px, py, dx, dy}
    this.taxiT = 0;
    this.done = this.index >= MISSIONS.length;
    this.rng = game.rng;
    this.setupStage();
  }

  get current() {
    return MISSIONS[this.index] || null;
  }

  setupStage() {
    const g = this.game;
    this.marker = null;
    this.stageT = 0;
    this.grabT = 0;
    if (this.done) return;
    switch (this.index) {
      case 0:
        this.marker = null; // any car will do
        break;
      case 1: {
        const p = randomRoadPoint(this.city, this.rng, g.player, 300);
        this.marker = { x: p.x, y: p.y, label: 'Fare' };
        break;
      }
      case 2:
        this.marker = { x: this.city.docks.x + this.city.docks.w / 2, y: this.city.docks.y + this.city.docks.h / 2, label: 'Docks' };
        break;
      case 3:
        this.marker = null;
        break;
      case 4:
        this.marker = null;
        this.collected = 0;
        break;
      case 5:
        this.marker = { x: this.city.bank.x + this.city.bank.w / 2, y: this.city.bank.y + this.city.bank.h / 2, label: 'Bank' };
        break;
      default:
        break;
    }
  }

  objective() {
    if (this.done) return 'Story complete — free roam. Taxi fares and stashes still pay.';
    const m = this.current;
    switch (this.index) {
      case 0:
        return `${m.name}: ${m.brief}`;
      case 1:
        return this.stage === 0 ? 'Taxi: pick up the fare at the marker.' : 'Taxi: drive the fare to the drop-off.';
      case 2:
        return `${m.name}: ${m.brief}`;
      case 3:
        return this.stage === 0
          ? 'Heat Wave: get to 3 stars (steal, shoot, or ram a cop car).'
          : `Heat Wave: stay at 3+ stars — ${Math.ceil(this.stageT)}s to go.`;
      case 4:
        return `Stash Run: collect ${3 - this.collected} more cash stash${3 - this.collected === 1 ? '' : 'es'}.`;
      case 5:
        if (this.stage === 0) return 'Bank Job: reach the Coral Bank.';
        if (this.stage === 1) return `Bank Job: grabbing the cash… ${Math.ceil(this.grabT)}s`;
        return 'Bank Job: lose the heat — get back to Bea’s garage.';
      default:
        return m.brief;
    }
  }

  complete() {
    const g = this.game;
    const m = this.current;
    g.addCash(m.reward);
    g.sfx.jingle();
    g.flash = `Job done: ${m.name} — +$${m.reward}`;
    g.flashT = 3;
    this.index += 1;
    this.stage = 0;
    if (this.index >= MISSIONS.length) {
      this.done = true;
      this.marker = null;
      g.flash = 'Story complete! Coral Bay is yours.';
    } else {
      this.setupStage();
    }
    g.persist();
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    if (this.done) {
      this.updateTaxi(dt);
      return;
    }
    switch (this.index) {
      case 0:
        if (p.inCar) this.complete();
        break;
      case 1: {
        if (!this.marker) break;
        const d = Math.hypot(p.x - this.marker.x, p.y - this.marker.y);
        if (this.stage === 0) {
          if (p.inCar && d < 46) {
            this.stage = 1;
            const dest = randomRoadPoint(this.city, this.rng, p, 700);
            this.marker = { x: dest.x, y: dest.y, label: 'Drop-off' };
            g.sfx.pickup();
          }
        } else if (d < 46) {
          this.complete();
        }
        break;
      }
      case 2: {
        if (!this.marker) break;
        if (Math.hypot(p.x - this.marker.x, p.y - this.marker.y) < 60) this.complete();
        break;
      }
      case 3: {
        if (this.stage === 0) {
          if (g.police.stars >= 3) {
            this.stage = 1;
            this.stageT = 60;
          }
        } else if (g.police.stars >= 3) {
          this.stageT -= dt;
          if (this.stageT <= 0) this.complete();
        }
        break;
      }
      case 4: {
        // stash pickups are counted in checkStashes()
        if (this.collected >= 3) this.complete();
        break;
      }
      case 5: {
        if (this.stage === 0) {
          if (this.marker && Math.hypot(p.x - this.marker.x, p.y - this.marker.y) < 70) {
            this.stage = 1;
            this.grabT = 3;
          }
        } else if (this.stage === 1) {
          if (this.marker && Math.hypot(p.x - this.marker.x, p.y - this.marker.y) < 90) {
            this.grabT -= dt;
            if (this.grabT <= 0) {
              this.stage = 2;
              this.marker = { x: this.city.garage.x + this.city.garage.w / 2, y: this.city.garage.y + this.city.garage.h / 2, label: 'Garage' };
              g.police.addHeat(5 - g.police.stars); // the alarm brings the whole PD
              g.sfx.busted();
            }
          } else {
            this.grabT = 3;
          }
        } else if (this.marker && Math.hypot(p.x - this.marker.x, p.y - this.marker.y) < 70) {
          // Made it to the garage with the cash: the hideout clears the heat.
          g.police.stars = 0;
          g.police.copCars = [];
          g.police.footCops = [];
          this.complete();
        }
        break;
      }
      default:
        break;
    }
    this.updateTaxi(dt);
  }

  // Cash stashes: any player, any time. Mission 4 counts them.
  checkStashes() {
    const g = this.game;
    const p = g.player;
    for (const s of this.city.stashes) {
      if (s.taken) continue;
      if (Math.hypot(p.x - s.x, p.y - s.y) < 30) {
        s.taken = true;
        g.addCash(CFG.STASH_CASH);
        g.sfx.cash();
        g.flash = `Stash found: +$${CFG.STASH_CASH}`;
        g.flashT = 2;
        if (this.index === 4 && !this.done) this.collected += 1;
        g.persist();
      }
    }
  }

  // Optional taxi fares once the taxi mission is done.
  updateTaxi(dt) {
    const g = this.game;
    if (this.index <= 1 && !this.done) return; // taxi unlocks after mission 1
    this.taxiT -= dt;
    if (!this.taxi && this.taxiT <= 0) {
      this.taxiT = 40 + Math.random() * 30;
      const p = randomRoadPoint(this.city, this.rng, g.player, 350);
      this.taxi = { stage: 0, px: p.x, py: p.y, dx: 0, dy: 0 };
    }
    if (!this.taxi) return;
    const p = g.player;
    if (this.taxi.stage === 0) {
      if (p.inCar && Math.hypot(p.x - this.taxi.px, p.y - this.taxi.py) < 46) {
        this.taxi.stage = 1;
        const dest = randomRoadPoint(this.city, this.rng, p, 650);
        this.taxi.dx = dest.x;
        this.taxi.dy = dest.y;
        g.sfx.pickup();
      }
    } else if (Math.hypot(p.x - this.taxi.dx, p.y - this.taxi.dy) < 46) {
      g.addCash(CFG.TAXI_FARE);
      g.sfx.cash();
      g.flash = `Fare paid: +$${CFG.TAXI_FARE}`;
      g.flashT = 2;
      this.taxi = null;
      this.taxiT = 30;
    }
  }
}
