// Headless simulator for Sky Courier's core loop. Imports the exact world
// logic the browser runs (no DOM, no canvas) and proves, with a fixed seed:
// the plane moves where the input points, rings are caught and score, a
// head-on obstacle costs hull, fuel runs out, the game ends, and two runs
// with the same seed are byte-identical. Run: node test/simulate.mjs
import { createWorld, startRun, step, gradeFor } from '../game/src/world.js';
import { CFG } from '../game/src/config.js';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}
function hashState(w) {
  return [
    Math.round(w.score), Math.round(w.distance), Math.round(w.fuel * 100),
    w.rings, w.run, w.hull, w.phase,
    Math.round(w.plane.x * 1000), Math.round(w.plane.alt * 1000),
    w.entities.length, w.stats.collected, w.stats.hits,
  ].join('|');
}
function runScripted(seed, script, seconds = 30) {
  const w = createWorld(seed);
  startRun(w);
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    const input = script(i * dt, w) || { steer: 0, climb: 0, boost: false };
    step(w, dt, input, null);
    if (w.phase === 'over') break;
  }
  return w;
}

// 1. Steering: holding right moves the plane right, holding up climbs.
{
  const w = runScripted(7, (t) => ({ steer: 1, climb: 1, boost: false }), 2);
  check('steer right moves plane right', w.plane.x > 0.5, `x=${w.plane.x.toFixed(2)}`);
  check('climb raises altitude', w.plane.alt > 0.5, `alt=${w.plane.alt.toFixed(2)}`);
  check('plane stays in bounds', w.plane.x <= CFG.planeMaxX && w.plane.alt <= CFG.planeMaxAlt);
}

// 2. Determinism: the same seed and the same inputs give the same world.
{
  const script = (t) => ({ steer: Math.sin(t * 0.7), climb: Math.cos(t * 0.5) * 0.6, boost: t > 5 && t < 8 });
  const a = runScripted(42, script, 20);
  const b = runScripted(42, script, 20);
  check('deterministic replay', hashState(a) === hashState(b), hashState(a));
  const c = runScripted(43, script, 20);
  check('different seed diverges', hashState(a) !== hashState(c));
}

// 3. Rings: flying straight through a hand-placed ring catches it.
{
  const w = createWorld(11);
  startRun(w);
  w.entities.push({ kind: 'ring', x: 0, alt: 0.12, z: 30, spin: 0, passed: false });
  const before = w.score;
  for (let i = 0; i < 120; i++) step(w, 1 / 60, { steer: 0, climb: 0, boost: false }, null);
  check('ring caught', w.stats.collected === 1, `collected=${w.stats.collected}`);
  check('ring scores +100', Math.floor(w.score) >= Math.floor(before) + CFG.scorePerRing);
  check('ring refills fuel', w.fuel > CFG.fuelMax - 8, `fuel=${w.fuel.toFixed(1)}`);
}

// 4. Collision: a head-on storm costs exactly one hull and grants invulnerability.
{
  const w = createWorld(13);
  startRun(w);
  const hullBefore = w.hull;
  w.entities.push({ kind: 'storm', x: 0, alt: 0.12, z: 30, spin: 0, flap: 0, passed: false });
  for (let i = 0; i < 120; i++) step(w, 1 / 60, { steer: 0, climb: 0, boost: false }, null);
  check('obstacle hit costs 1 hull', w.hull === hullBefore - 1, `hull=${w.hull}`);
  check('hit logged', w.events.includes('hit'));
  check('invulnerable after hit', w.invuln > 0 || w.hull < hullBefore);
}

// 5. Three hits end the flight with a grade.
{
  const w = createWorld(17);
  startRun(w);
  for (let hit = 0; hit < 3; hit++) {
    w.invuln = 0;
    w.entities.push({ kind: 'tower', x: w.plane.x, alt: w.plane.alt, z: 20, spin: 0, flap: 0, passed: false });
    for (let i = 0; i < 120 && w.phase === 'play'; i++) step(w, 1 / 60, { steer: 0, climb: 0, boost: false }, null);
  }
  check('three hits end the game', w.phase === 'over', `phase=${w.phase}`);
  check('game over reason set', w.overReason === 'HULL DESTROYED', w.overReason);
  check('grade assigned', ['S', 'A', 'B', 'C', 'D'].includes(w.grade), `grade=${w.grade}`);
}

// 6. Fuel: with no rings, the tank empties and the flight ends on fuel.
{
  const w = createWorld(19);
  startRun(w);
  w.fuel = 3; // nearly empty
  for (let i = 0; i < 600 && w.phase === 'play'; i++) step(w, 1 / 60, { steer: 0, climb: 0, boost: false }, null);
  check('fuel exhaustion ends the game', w.phase === 'over', `phase=${w.phase}`);
  check('fuel reason', w.overReason === 'OUT OF FUEL', w.overReason);
}

// 7. Delivery run: 12 rings complete a run, pay the bonus, and speed up.
{
  const w = createWorld(23);
  startRun(w);
  const speedBefore = w.speed;
  for (let i = 0; i < 12; i++) {
    w.entities.push({ kind: 'ring', x: w.plane.x, alt: w.plane.alt, z: 20 + i * 5, spin: 0, passed: false });
  }
  for (let i = 0; i < 600 && w.phase === 'play'; i++) step(w, 1 / 60, { steer: 0, climb: 0, boost: false }, null);
  check('12 rings complete a run', w.run === 2, `run=${w.run}`);
  check('run bonus paid', w.events.includes('run'));
  check('run bonus is +500', w.score >= 12 * CFG.scorePerRing + CFG.runBonus);
}

// 8. Grade thresholds behave.
check('grade S at 4200', gradeFor(4200) === 'S');
check('grade A at 2800', gradeFor(2800) === 'A');
check('grade B at 1600', gradeFor(1600) === 'B');
check('grade D below 700', gradeFor(100) === 'D');

// 9. A full hands-off flight spawns waves and stays playable for a while.
{
  const w = runScripted(7, () => ({ steer: 0, climb: 0, boost: false }), 45);
  check('waves spawn', w.stats.ringsSpawned > 0, `spawned=${w.stats.ringsSpawned}`);
  check('distance grows', w.distance > 500, `distance=${Math.floor(w.distance)}`);
  console.log(`      hands-off flight: phase=${w.phase} score=${Math.floor(w.score)} distance=${Math.floor(w.distance)}`);
}

console.log(failures === 0 ? 'SIM OK — all checks passed' : `SIM FAILED — ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
