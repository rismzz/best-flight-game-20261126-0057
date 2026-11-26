// Sky Courier — Ring Runner: bootstrap and frame loop. One job: own the
// canvas, the clock, the phase transitions and the best score, and hand the
// world to the renderer. All game rules live in world.js; all drawing in
// render.js; all sound in audio.js.
import { CFG } from './config.js';
import { createWorld, startRun, step } from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '7', 10) || 7;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CFG.viewW;
canvas.height = CFG.viewH;
const statusEl = document.getElementById('status');

const input = createInput(canvas);
const audio = createAudio();

let best = 0;
try {
  best = Number.parseInt(window.localStorage.getItem('sky-courier-best') || '0', 10) || 0;
} catch { /* storage may be unavailable; best score is best-effort */ }

let world;
let staged = false;
if (shotName) {
  // Screenshot mode: a fixed staged scene, frozen — no loop input needed.
  world = stageShot(shotName, seed);
  staged = true;
  render(ctx, world, { best, muted: audio.isMuted() });
  document.title = `Sky Courier — ${shotName}`;
} else {
  world = createWorld(seed);
  world.phase = 'title';
  world.time = 0;
}

let last = performance.now();
let paused = false;

function saveBest() {
  if (world.score > best) {
    best = Math.floor(world.score);
    try {
      window.localStorage.setItem('sky-courier-best', String(best));
    } catch { /* ignore */ }
  }
}

function announce() {
  if (!statusEl) return;
  if (world.phase === 'title') statusEl.textContent = 'Sky Courier Ring Runner. Press Enter to take off.';
  else if (world.phase === 'play') statusEl.textContent = `Score ${Math.floor(world.score)}, run ${world.run}, rings ${world.rings} of ${CFG.ringsPerRun}, fuel ${Math.ceil(world.fuel)} percent.`;
  else if (world.phase === 'over') statusEl.textContent = `Flight over, grade ${world.grade}, score ${Math.floor(world.score)}. Press Enter to fly again.`;
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const frameInput = input.poll();
  if (frameInput.mutePressed) {
    audio.setMuted(!audio.isMuted());
  }
  if (world.phase === 'title') {
    world.time += dt;
    if (frameInput.startPressed || frameInput.anyKey) {
      audio.unlock();
      audio.click();
      startRun(world);
      announce();
    }
  } else if (world.phase === 'play') {
    if (frameInput.pausePressed) {
      paused = true;
      world.phase = 'paused';
    } else {
      audio.unlock();
      audio.engine(world.speed / CFG.maxSpeed, true);
      step(world, dt, frameInput, audio);
      if (world.phase === 'over') {
        audio.engine(0, false);
        saveBest();
        announce();
      }
    }
  } else if (world.phase === 'paused') {
    audio.engine(0, false);
    if (frameInput.pausePressed || frameInput.startPressed) {
      world.phase = 'play';
      paused = false;
    }
  } else if (world.phase === 'over') {
    world.time += dt;
    if (frameInput.startPressed) {
      audio.unlock();
      audio.click();
      startRun(world);
      announce();
    }
  }
  render(ctx, world, { best, muted: audio.isMuted() });
  requestAnimationFrame(frame);
}

if (!staged) {
  announce();
  requestAnimationFrame(frame);
}

// Keep the tab title honest about the game state for the harness.
window.addEventListener('sky-courier-state', () => {});
