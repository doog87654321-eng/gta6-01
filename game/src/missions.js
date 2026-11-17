// Missions and the story: six jobs from Bea, the fixer who runs the garage,
// taking Ray from his first stolen car to the big bank job. Each mission is a
// list of stages — go somewhere, steal something, hold a robbery, survive a
// fight, lose the cops — and the game tracks the current objective, the
// marker on the map, timers and payouts. Taxis are the side hustle: fares
// appear while driving, pay cash, and never block the story.

import { MISSION_REWARD, TAXI_FARE } from './config.js';
import { nearestRoadPoint } from './city.js';
import { addHeat } from './police.js';
import { makeCar } from './vehicles.js';
import { makePed, scarePeds } from './people.js';
import { writeSave } from './save.js';

export const MISSIONS = [
  {
    id: 0,
    name: 'First Wheels',
    brief: 'Bea needs a driver. Get to her garage, then bring her a car — any car.',
    reward: MISSION_REWARD[0],
    stages: [
      { type: 'goto', text: 'Get to Bea’s Garage', place: 'garage', radius: 90 },
      { type: 'enterCar', text: 'Steal a car (walk up and press E)' },
      { type: 'driveTo', text: 'Drive it back to Bea’s Garage', place: 'garage', radius: 100 },
    ],
  },
  {
    id: 1,
    name: 'The Courier',
    brief: 'A package is waiting at the South Docks. Pick it up and take it to the bank — fast.',
    reward: MISSION_REWARD[1],
    stages: [
      { type: 'goto', text: 'Pick up the package at the South Docks', place: 'docks', radius: 90 },
      { type: 'timed', text: 'Deliver the package to Coral Bay Bank', place: 'bank', radius: 100, seconds: 100 },
    ],
  },
  {
    id: 2,
    name: 'Quick Cash',
    brief: 'Sunset Mart keeps its takings in a tin under the counter. Take it — then vanish.',
    reward: MISSION_REWARD[2],
    stages: [
      { type: 'goto', text: 'Get to Sunset Mart', place: 'store', radius: 90 },
      { type: 'hold', text: 'Hold the robbery — stay at the counter', place: 'store', radius: 70, seconds: 3, heat: 22 },
      { type: 'escape', text: 'Lose the cops — or reach the Hideout', place: 'hideout', radius: 100 },
    ],
  },
  {
    id: 3,
    name: 'Hot Wheels',
    brief: 'A Vortex GT is parked on Palmera Beach, keys in it. Bea has a buyer. Bring it home in one piece.',
    reward: MISSION_REWARD[3],
    stages: [
      { type: 'goto', text: 'Get to the Vortex GT on Palmera Beach', place: 'beach', radius: 110 },
      { type: 'stealTarget', text: 'Take the Vortex GT (press E)' },
      { type: 'driveTo', text: 'Deliver the Vortex GT to Bea’s Garage — don’t wreck it', place: 'garage', radius: 100, minHealth: 0.3 },
    ],
  },
  {
    id: 4,
    name: 'Turf War',
    brief: 'The Vultures are hitting Bea’s garage tonight. Be there. Bring the pistol.',
    reward: MISSION_REWARD[4],
    stages: [
      { type: 'goto', text: 'Get to Bea’s Garage', place: 'garage', radius: 110 },
      { type: 'survive', text: 'Defend the garage — take down the Vultures', count: 5 },
    ],
  },
  {
    id: 5,
    name: 'The Big Score',
    brief: 'Coral Bay Bank. Five minutes, no mistakes. After this, Ray Delgado is out — or he is legend.',
    reward: MISSION_REWARD[5],
    stages: [
      { type: 'goto', text: 'Get to Coral Bay Bank', place: 'bank', radius: 100 },
      { type: 'hold', text: 'Crack the vault — stay at the counter', place: 'bank', radius: 80, seconds: 5, heat: 45 },
      { type: 'escape', text: 'Escape to the Hideout with the money', place: 'hideout', radius: 110 },
    ],
  },
];

export function startMission(G, id) {
  const def = MISSIONS[id];
  if (!def) return;
  G.mission = {
    def,
    stageIndex: 0,
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
  G.message = `New mission: ${def.name}`;
  G.messageTimer = 5;
  G.audio.pickup();
}

function placeOf(G, place) {
  if (place === 'beach') return { x: G.city.beachX - 90, y: 1300, w: 0, h: 0 };
  const lm = G.city.landmarks[place];
  return lm ? { x: lm.x, y: lm.y, w: lm.w, h: lm.h } : { x: 700, y: 2000, w: 0, h: 0 };
}

/**
 * True when the player is at a place: inside the landmark's rectangle grown
 * by `radius`, so a big building counts from its front door, not its centre.
 */
function nearPlace(G, place, radius) {
  const t = placeOf(G, place);
  const p = G.player;
  const hw = t.w / 2 + radius;
  const hh = t.h / 2 + radius;
  return Math.abs(p.x - t.x) <= hw && Math.abs(p.y - t.y) <= hh;
}

function currentStage(G) {
  const m = G.mission;
  return m && m.active ? m.def.stages[m.stageIndex] : null;
}

export function currentObjective(G) {
  const stage = currentStage(G);
  if (stage) return stage.text;
  if (G.taxi.phase !== 'none') {
    return G.taxi.phase === 'pickup' ? 'Taxi fare: pick up the passenger' : 'Taxi fare: drop off the passenger';
  }
  if (G.save.missionsDone >= MISSIONS.length) return 'Story complete — free roam. Press Enter for the next job board.';
  return 'Free roam — press Enter to start the next mission.';
}

export function currentMarker(G) {
  const stage = currentStage(G);
  if (stage && stage.place) {
    const p = placeOf(G, stage.place);
    return { x: p.x, y: p.y, kind: 'mission' };
  }
  if (stage && stage.type === 'stealTarget' && G.mission.targetCar) {
    return { x: G.mission.targetCar.x, y: G.mission.targetCar.y, kind: 'mission' };
  }
  if (G.taxi.phase !== 'none') return { x: G.taxi.x, y: G.taxi.y, kind: 'taxi' };
  return null;
}

function advanceStage(G) {
  const m = G.mission;
  m.stageIndex += 1;
  m.timer = 0;
  m.progress = 0;
  m.spawned = false;
  if (m.stageIndex >= m.def.stages.length) completeMission(G);
}

function failMission(G, reason) {
  const m = G.mission;
  m.active = false;
  m.failed = true;
  m.failReason = reason;
  G.missionFailed = reason;
  G.audio.busted();
}

function completeMission(G) {
  const m = G.mission;
  m.active = false;
  m.done = true;
  G.player.cash += m.def.reward;
  G.save.missionsDone = Math.max(G.save.missionsDone, m.def.id + 1);
  G.save.cash = G.player.cash;
  writeSave(G.save);
  G.missionComplete = m.def;
  G.audio.missionDone();
  G.message = `Mission complete: ${m.def.name} — $${m.def.reward} earned.`;
  G.messageTimer = 5;
}

function spawnGang(G, count) {
  const garage = placeOf(G, 'garage');
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = garage.x + Math.cos(angle) * 260;
    const y = garage.y + Math.sin(angle) * 260;
    const ped = makePed(G, x, y, { gang: true, hp: 70, color: '#1c1c22' });
    G.peds.push(ped);
  }
  scarePeds(G, garage.x, garage.y, 400);
}

export function updateMission(G, dt) {
  const m = G.mission;
  if (!m || !m.active) return;
  const stage = currentStage(G);
  if (!stage) return;
  const p = G.player;

  if (stage.type === 'goto' || stage.type === 'driveTo' || stage.type === 'timed') {
    if (stage.type === 'timed') {
      m.timer += dt;
      if (m.timer > stage.seconds) {
        failMission(G, 'Too slow — the package went cold.');
        return;
      }
    }
    if (stage.type === 'driveTo' && stage.minHealth && m.targetCar && m.targetCar.wreck) {
      failMission(G, 'The Vortex GT is wrecked — Bea’s buyer walked away.');
      return;
    }
    if (nearPlace(G, stage.place, stage.radius)) {
      if (stage.type === 'driveTo' && !p.car) {
        G.message = 'You need to be in the car for the delivery.';
        G.messageTimer = 2;
        return;
      }
      advanceStage(G);
    }
    return;
  }

  if (stage.type === 'enterCar') {
    if (p.car) advanceStage(G);
    return;
  }

  if (stage.type === 'stealTarget') {
    if (!m.targetCar) {
      const beach = placeOf(G, 'beach');
      const car = makeCar('sports', beach.x, beach.y - 40, Math.PI / 2, 'parked');
      car.driver = false;
      G.cars.push(car);
      m.targetCar = car;
    }
    if (p.car === m.targetCar) {
      addHeat(G, 12, 'stole the Vortex');
      G.message = 'The Vortex GT is yours. Get it to Bea’s — in one piece.';
      G.messageTimer = 3;
      advanceStage(G);
    }
    return;
  }

  if (stage.type === 'hold') {
    if (nearPlace(G, stage.place, stage.radius) && p.onFoot) {
      m.progress += dt;
      if (m.progress >= stage.seconds) {
        addHeat(G, stage.heat, 'robbery');
        G.message = 'Got it! Now run — the cops are coming.';
        G.messageTimer = 3;
        advanceStage(G);
      }
    } else {
      m.progress = Math.max(0, m.progress - dt * 0.5);
    }
    return;
  }

  if (stage.type === 'survive') {
    if (!m.spawned) {
      m.spawned = true;
      spawnGang(G, stage.count);
      m.gangLeft = stage.count;
      G.message = 'The Vultures are here! Defend the garage!';
      G.messageTimer = 4;
    }
    const left = G.peds.filter((ped) => ped.gang && ped.state !== 'down').length;
    m.gangLeft = left;
    if (left === 0) advanceStage(G);
    return;
  }

  if (stage.type === 'escape') {
    if (p.wantedHeat <= 0.5) {
      G.message = 'Clean getaway. The heat is off.';
      G.messageTimer = 3;
      advanceStage(G);
      return;
    }
    if (nearPlace(G, stage.place, stage.radius)) {
      p.wantedHeat = 0;
      G.policeCars.forEach((c) => {
        c.siren = false;
      });
      G.policeCars = [];
      G.cops = [];
      advanceStage(G);
    }
    return;
  }
}

/** Fail the active mission when the player is wasted or busted. */
export function failMissionOnArrest(G, reason) {
  if (G.mission && G.mission.active) failMission(G, reason);
}

// ---------------------------------------------------------------- taxis

export function updateTaxi(G, dt) {
  const taxi = G.taxi;
  if (taxi.phase === 'none') {
    taxi.cooldown -= dt;
    // A fare appears while the player drives around with no mission running.
    if (taxi.cooldown <= 0 && G.player.car && (!G.mission || !G.mission.active)) {
      taxi.cooldown = 40;
      const p = nearestRoadPoint(G.city, G.player.x + G.rng.range(-500, 500), G.player.y + G.rng.range(-500, 500));
      taxi.phase = 'pickup';
      taxi.x = p.x;
      taxi.y = p.y;
      taxi.timer = 45;
      taxi.fare = G.rng.pick(TAXI_FARE);
      G.message = 'Taxi fare nearby — pick up the passenger for cash.';
      G.messageTimer = 3;
    }
    return;
  }
  taxi.timer -= dt;
  if (taxi.timer <= 0) {
    taxi.phase = 'none';
    taxi.cooldown = 25;
    G.message = 'The fare gave up waiting.';
    G.messageTimer = 2;
    return;
  }
  const d = Math.hypot(G.player.x - taxi.x, G.player.y - taxi.y);
  if (d < 70 && G.player.car) {
    if (taxi.phase === 'pickup') {
      taxi.phase = 'dropoff';
      const dest = nearestRoadPoint(G.city, G.player.x + G.rng.range(-900, 900), G.player.y + G.rng.range(-900, 900));
      taxi.x = dest.x;
      taxi.y = dest.y;
      taxi.timer = 60;
      G.message = 'Passenger aboard — take them to the marker.';
      G.messageTimer = 3;
    } else {
      G.player.cash += taxi.fare;
      G.save.cash = G.player.cash;
      G.audio.cash();
      G.message = `Fare complete — $${taxi.fare} earned.`;
      G.messageTimer = 3;
      taxi.phase = 'none';
      taxi.cooldown = 30;
    }
  }
}
