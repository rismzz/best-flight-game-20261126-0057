// Deterministic seeded RNG (mulberry32) plus a tiny hash, so a ?seed= replay
// always builds the same sky, and the headless simulator can prove it.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Integer in [min, max] from a rng function.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Pick one element from an array with a rng function.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
