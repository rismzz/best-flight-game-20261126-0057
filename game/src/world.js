// Sky Courier world: pure game logic, no DOM, no canvas. createWorld(seed)
// builds the state; step(world, dt, input, sfx) advances it. The headless
// simulator imports exactly this file, so anything the browser does, the
// simulator can prove — movement, ring catches, collisions, fuel, game over.
import { CFG } from './config.js';
import { mulberry32, range, pick } from './random.js';

const SPAWN_Z = 260; // world units from the far horizon to the plane
const PLANE_Z = 0;
const OBSTACLE_KINDS = ['storm', 'balloon', 'bird', 'tower'];

export function createWorld(seed = 1) {
  const rng = mulberry32(seed);
  // Decorative clouds: fixed per seed so a screenshot replay looks identical.
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: range(rng, -1.6, 1.6),
      alt: range(rng, 0.55, 1.35),
      d: range(rng, 0.15, 1),
      size: range(rng, 0.5, 1.4),
      speed: range(rng, 0.5, 1.1),
    });
  }
  // Distant mountain ridge: fixed per seed, drawn as a silhouette.
  const ridge = [];
  for (let i = 0; i < 14; i++) ridge.push(range(rng, 0.35, 1));
  return {
    seed,
    rng,
    phase: 'title', // title | play | paused | over
    time: 0,
    distance: 0,
    score: 0,
    rings: 0, // rings collected in the current delivery run
    run: 1, // delivery run number; speed grows with it
    fuel: CFG.fuelMax,
    hull: CFG.hullMax,
    speed: 0,
    plane: { x: 0, alt: 0.12, bank: 0, tilt: 0 },
    entities: [], // { kind, x, alt, z, spin, flap, passed, scored }
    clouds,
    ridge,
    nextSpawnAt: 40,
    invuln: 0,
    shake: 0,
    flash: 0,
    messages: [], // { text, t, color }
    stats: { collected: 0, hits: 0, nearMisses: 0, missedRings: 0, ringsSpawned: 0 },
    overReason: '',
    grade: '',
    events: [], // plain log the simulator asserts on: 'ring','hit','near','run','over'
    startedAt: 0,
  };
}

export function startRun(world) {
  world.phase = 'play';
  world.time = 0;
  world.distance = 0;
  world.score = 0;
  world.rings = 0;
  world.run = 1;
  world.fuel = CFG.fuelMax;
  world.hull = CFG.hullMax;
  world.plane = { x: 0, alt: 0.12, bank: 0, tilt: 0 };
  world.entities = [];
  world.nextSpawnAt = 40;
  world.invuln = 0;
  world.shake = 0;
  world.flash = 0;
  world.messages = [];
  world.stats = { collected: 0, hits: 0, nearMisses: 0, missedRings: 0, ringsSpawned: 0 };
  world.overReason = '';
  world.grade = '';
  world.events = [];
  pushMessage(world, 'DELIVERY RUN 1 — fly through 12 rings!', '#ffd94a');
}

export function gradeFor(score) {
  if (score >= CFG.gradeS) return 'S';
  if (score >= CFG.gradeA) return 'A';
  if (score >= CFG.gradeB) return 'B';
  if (score >= CFG.gradeC) return 'C';
  return 'D';
}

function pushMessage(world, text, color = '#ffffff') {
  world.messages.push({ text, t: 0, color });
  if (world.messages.length > 4) world.messages.shift();
}

function currentSpeed(world, boosting) {
  const base = Math.min(
    CFG.baseSpeed + (world.run - 1) * CFG.speedPerRun,
    CFG.maxSpeed,
  );
  return boosting ? base * CFG.boostMultiplier : base;
}

function spawnWave(world) {
  const rng = world.rng;
  const difficulty = Math.min(1, 0.25 + world.run * 0.12 + world.distance / 9000);
  const z = SPAWN_Z;
  // A ring line: 1–3 rings, sometimes arcing up or down.
  const ringCount = rng() < 0.45 ? 2 + Math.floor(rng() * 2) : 1;
  const ringX = range(rng, -0.8, 0.8);
  const ringAlt = range(rng, 0.25, 0.85);
  const arc = range(rng, -0.25, 0.25);
  for (let i = 0; i < ringCount; i++) {
    world.entities.push({
      kind: 'ring',
      x: ringX + (rng() - 0.5) * 0.1,
      alt: Math.max(0.12, Math.min(0.95, ringAlt + arc * i)),
      z: z + i * 26,
      spin: rng() * Math.PI * 2,
      passed: false,
    });
    world.stats.ringsSpawned++;
  }
  // Obstacles: more of them, and closer to the ring line, as difficulty rises.
  const obstacleCount = rng() < difficulty ? 1 + (rng() < difficulty * 0.6 ? 1 : 0) : 0;
  for (let i = 0; i < obstacleCount; i++) {
    const kind = pick(rng, OBSTACLE_KINDS);
    // Storm clouds sit high, towers sit on the ground, balloons and birds mid-air.
    const alt = kind === 'tower' ? 0.08 : kind === 'storm' ? range(rng, 0.55, 0.95)
      : kind === 'balloon' ? range(rng, 0.3, 0.7) : range(rng, 0.35, 0.9);
    let x = range(rng, -1.0, 1.0);
    // Don't spawn exactly on the ring line unless the player is meant to dodge.
    if (Math.abs(x - ringX) < 0.35 && rng() < 0.6) x += x >= 0 ? 0.45 : -0.45;
    world.entities.push({
      kind,
      x: Math.max(-1.1, Math.min(1.1, x)),
      alt,
      z: z + range(rng, 0, 60),
      spin: rng() * Math.PI * 2,
      flap: rng() * Math.PI * 2,
      passed: false,
    });
  }
  const gap = range(rng, CFG.spawnGapMin, CFG.spawnGapMax);
  world.nextSpawnAt = world.distance + gap * (1.15 - difficulty * 0.35);
}

function endGame(world, reason) {
  world.phase = 'over';
  world.overReason = reason;
  world.grade = gradeFor(world.score);
  world.speed = 0;
  world.events.push('over');
}

function collectRing(world, sfx) {
  world.rings++;
  world.stats.collected++;
  world.score += CFG.scorePerRing;
  world.fuel = Math.min(CFG.fuelMax, world.fuel + CFG.fuelPerRing);
  world.events.push('ring');
  if (sfx) sfx.ring();
  pushMessage(world, `RING! +${CFG.scorePerRing}  ·  ${world.rings}/${CFG.ringsPerRun} this run`, '#ffd94a');
  if (world.rings >= CFG.ringsPerRun) {
    world.run++;
    world.rings = 0;
    world.score += CFG.runBonus;
    world.events.push('run');
    if (sfx) sfx.fanfare();
    pushMessage(world, `DELIVERY COMPLETE! +${CFG.runBonus} — RUN ${world.run} (faster!)`, '#7dff8a');
  }
}

function hitObstacle(world, entity, sfx) {
  world.hull--;
  world.stats.hits++;
  world.invuln = CFG.invulnerableSeconds;
  world.shake = 0.7;
  world.flash = 0.5;
  world.events.push('hit');
  if (sfx) sfx.hit();
  pushMessage(world, `HIT ${entity.kind.toUpperCase()}! Hull ${Math.max(0, world.hull)}/${CFG.hullMax}`, '#ff6b5e');
  if (world.hull <= 0) {
    if (sfx) sfx.gameOver();
    endGame(world, 'HULL DESTROYED');
  }
}

// Advance the world by dt seconds. input: { steer, climb, boost } in [-1,1].
// sfx: optional audio object { ring, nearMiss, hit, fanfare, gameOver }.
export function step(world, dt, input, sfx = null) {
  if (world.phase !== 'play') return;
  dt = Math.min(dt, 0.05);
  world.time += dt;
  const boosting = !!input.boost && world.fuel > 1;
  world.speed = currentSpeed(world, boosting);
  world.distance += world.speed * dt;
  world.score += CFG.scorePerSecond * dt * (boosting ? 1.5 : 1);

  // Plane motion: smooth steering with banking.
  const p = world.plane;
  const targetBank = input.steer * 0.9;
  p.bank += (targetBank - p.bank) * Math.min(1, dt * 7);
  p.x += input.steer * CFG.lateralSpeed * dt;
  p.x = Math.max(CFG.planeMinX, Math.min(CFG.planeMaxX, p.x));
  p.alt += input.climb * CFG.climbSpeed * dt;
  p.alt = Math.max(CFG.planeMinAlt, Math.min(CFG.planeMaxAlt, p.alt));
  p.tilt += ((input.climb * 0.35) - p.tilt) * Math.min(1, dt * 6);

  // Fuel is the mission clock.
  world.fuel -= (boosting ? CFG.fuelDrainBoost : CFG.fuelDrain) * dt;
  if (world.fuel <= 0) {
    world.fuel = 0;
    if (sfx) sfx.gameOver();
    endGame(world, 'OUT OF FUEL');
    return;
  }

  // Spawn waves ahead.
  if (world.distance >= world.nextSpawnAt) spawnWave(world);

  // Move entities toward the camera and resolve crossings.
  for (const e of world.entities) {
    e.z -= world.speed * dt;
    e.spin += dt * 1.4;
    e.flap += dt * (e.kind === 'bird' ? 9 : 2);
    if (!e.passed && e.z <= PLANE_Z) {
      e.passed = true;
      const dx = Math.abs(e.x - p.x);
      const da = Math.abs(e.alt - p.alt);
      if (e.kind === 'ring') {
        if (dx < CFG.ringCatchLat && da < CFG.ringCatchAlt) {
          collectRing(world, sfx);
        } else {
          world.stats.missedRings++;
        }
      } else if (dx < CFG.hitLat && da < CFG.hitAlt) {
        if (world.invuln <= 0) hitObstacle(world, e, sfx);
      } else if (dx < CFG.hitLat + 0.22 && da < CFG.hitAlt + 0.2) {
        // Close shave: threading past an obstacle pays a little.
        world.stats.nearMisses++;
        world.score += CFG.nearMissBonus;
        world.events.push('near');
        if (sfx) sfx.nearMiss();
        pushMessage(world, `NEAR MISS +${CFG.nearMissBonus}`, '#9fd8ff');
      }
    }
  }
  // Drop entities that flew past the camera.
  world.entities = world.entities.filter((e) => e.z > -30);

  // Clouds drift slowly toward the camera and wrap around.
  for (const c of world.clouds) {
    c.d -= (world.speed * 0.25 * c.speed * dt) / SPAWN_Z;
    if (c.d < 0.02) {
      c.d = 1;
      c.x = range(world.rng, -1.6, 1.6);
      c.alt = range(world.rng, 0.55, 1.35);
    }
  }

  if (world.invuln > 0) world.invuln -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt);
  for (const m of world.messages) m.t += dt;
  world.messages = world.messages.filter((m) => m.t < 2.6);
}

// Heading: the plane weaves a gentle S-course; the compass shows it.
export function headingDegrees(world) {
  return Math.round(90 + Math.sin(world.distance / 420) * 24 + world.plane.bank * 12);
}

// Altitude in feet, for the HUD: 200 ft on the runway up to ~12,000 ft.
export function altitudeFeet(world) {
  return Math.round(200 + world.plane.alt * 11800);
}

// Speed in knots for the HUD.
export function speedKnots(world) {
  return Math.round(world.speed * 3.4);
}
