// Sky Courier — Ring Runner: tuning constants. One clear job: every number the
// game balances on lives here, so tuning never means hunting through logic.
export const CFG = {
  viewW: 1280,
  viewH: 720,
  horizonY: 330,
  // Plane motion
  planeMinX: -1.15,
  planeMaxX: 1.15,
  planeMinAlt: 0.04,
  planeMaxAlt: 1.0,
  lateralSpeed: 1.55, // lateral units per second at full stick
  climbSpeed: 0.85, // altitude units per second
  // World speed (distance units per second) grows with each delivery run.
  baseSpeed: 34,
  speedPerRun: 7,
  maxSpeed: 92,
  boostMultiplier: 1.55,
  // Fuel: drains per second, rings refill. Running dry ends the run.
  fuelMax: 100,
  fuelDrain: 2.1,
  fuelDrainBoost: 4.6,
  fuelPerRing: 16,
  // Rings per delivery run; finish a run for a bonus and a faster next run.
  ringsPerRun: 12,
  runBonus: 500,
  scorePerRing: 100,
  scorePerSecond: 6,
  nearMissBonus: 25,
  // Lives / hull
  hullMax: 3,
  invulnerableSeconds: 1.6,
  // Spawning: distance between spawn waves shrinks as speed rises.
  spawnGapMin: 26,
  spawnGapMax: 46,
  // Collision tolerances (lateral / altitude units)
  ringCatchLat: 0.34,
  ringCatchAlt: 0.30,
  hitLat: 0.30,
  hitAlt: 0.26,
  // Mission clock: none — fuel is the clock. Grade thresholds on final score.
  gradeS: 4200,
  gradeA: 2800,
  gradeB: 1600,
  gradeC: 700,
};
