// Screenshot staging: ?shot=<name>&seed=<n> puts the game into a fixed,
// deterministic scene so the four screenshots are real renders of the game
// at its best — title, mid-flight play, a ring-catch action moment, and the
// game-over screen with a grade. All staging goes through the same world
// and render code the player sees; nothing is drawn only for screenshots.
import { createWorld, startRun, step } from './world.js';

function seedEntities(world, kind) {
  // Hand-place entities for a readable staged frame (deterministic).
  if (kind === 'play') {
    world.entities = [
      { kind: 'ring', x: -0.15, alt: 0.42, z: 120, spin: 0.4, passed: false },
      { kind: 'ring', x: 0.1, alt: 0.5, z: 170, spin: 1.1, passed: false },
      { kind: 'ring', x: 0.32, alt: 0.62, z: 225, spin: 2.0, passed: false },
      { kind: 'storm', x: -0.75, alt: 0.8, z: 150, spin: 0.7, flap: 0, passed: false },
      { kind: 'balloon', x: 0.72, alt: 0.5, z: 200, spin: 1.4, flap: 0, passed: false },
      { kind: 'bird', x: -0.45, alt: 0.65, z: 90, spin: 0, flap: 1.2, passed: false },
      { kind: 'tower', x: 0.95, alt: 0.08, z: 130, spin: 0.2, flap: 0, passed: false },
    ];
  } else if (kind === 'serve') {
    // Action frame: a ring right at the nose, a storm close on the left.
    world.entities = [
      { kind: 'ring', x: 0.05, alt: 0.34, z: 26, spin: 0.9, passed: false },
      { kind: 'ring', x: 0.28, alt: 0.55, z: 120, spin: 1.7, passed: false },
      { kind: 'storm', x: -0.55, alt: 0.62, z: 48, spin: 0.3, flap: 0, passed: false },
      { kind: 'bird', x: 0.55, alt: 0.7, z: 80, spin: 0, flap: 2.1, passed: false },
      { kind: 'balloon', x: -0.9, alt: 0.35, z: 170, spin: 2.4, flap: 0, passed: false },
    ];
  }
}

// Build the world for a shot name. Returns { world, phase }.
export function stageShot(shot, seed) {
  const world = createWorld(seed);
  if (shot === 'title') {
    world.phase = 'title';
    world.time = 2.4; // sun/clouds settled, runway visible, plane on the ground
    return world;
  }
  if (shot === 'end') {
    startRun(world);
    // Simulate a finished run: score and stats as if a real flight ended.
    world.score = 2470;
    world.rings = 9;
    world.run = 2;
    world.fuel = 0; // the flight ended out of fuel — the gauge must agree
    world.distance = 18400;
    world.stats = { collected: 21, hits: 2, nearMisses: 5, missedRings: 3, ringsSpawned: 24 };
    world.phase = 'over';
    world.overReason = 'OUT OF FUEL';
    world.grade = 'B';
    world.time = 1.2;
    world.messages = [];
    return world;
  }
  // play / serve: a live mid-flight world, advanced a little so the scene
  // is settled (clouds spread, terrain scrolled, plane in the air).
  startRun(world);
  world.plane.alt = shot === 'serve' ? 0.34 : 0.42;
  world.plane.x = shot === 'serve' ? -0.12 : 0.05;
  world.plane.bank = shot === 'serve' ? -0.55 : 0.18;
  if (shot === 'serve') {
    world.score = 1840;
    world.rings = 8;
    world.fuel = 68;
    world.distance = 9200;
    world.messages = [{ text: 'RING! +100  ·  8/12 this run', t: 0.4, color: '#ffd94a' }];
  } else {
    world.score = 1250;
    world.rings = 7;
    world.fuel = 74;
    world.distance = 6100;
  }
  world.time = 24;
  seedEntities(world, shot === 'serve' ? 'serve' : 'play');
  // Advance a few fixed steps so entity animation (spin/flap) is mid-motion
  // and the world is exactly the same for the same seed.
  for (let i = 0; i < 6; i++) step(world, 1 / 60, { steer: 0, climb: 0, boost: false }, null);
  world.nextSpawnAt = world.distance + 500; // keep staged entities in frame
  return world;
}
