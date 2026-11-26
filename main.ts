// Sky Courier — Ring Runner: the hand-in program (Node 22, standard library
// only). It copies this repository's game/ and screenshots/ beside it into
// /output (or $MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, so the judge can
// read the game. It refuses to hand in an entry with no screenshots: the
// dossier is only meaningful with real renders of the game.
//
// Run it locally to check the entry before entering:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (from the competition kit): the dossier text is
// capped, screenshots are at most 4 and 256 KiB each, and game/ stays under
// its file and byte caps with room left under /output's own 1,000-entry cap.
const DOSSIER_OPTS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  console.error(`sky-courier main.ts: ${message}`);
  process.exit(1);
}

const screenshotsDir = join(here, 'screenshots');
if (!existsSync(screenshotsDir)) fail('screenshots/ is missing — take the screenshots first');
const shots = readdirSync(screenshotsDir).filter((name) => {
  const p = join(screenshotsDir, name);
  return statSync(p).isFile() && !name.startsWith('.');
});
if (shots.length < 3 || shots.length > 4) {
  fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}
for (const name of shots) {
  const size = statSync(join(screenshotsDir, name)).size;
  if (size > 262144) fail(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
  if (!/\.(png|jpe?g)$/i.test(name)) fail(`screenshot ${name} is not a PNG or JPEG`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(screenshotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_OPTS));
console.log(`sky-courier: wrote ${out}/dossier.json with ${shots.length} screenshots (${shots.join(', ')})`);
