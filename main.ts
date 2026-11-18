// Hand-in program (Node 22, standard library only). Copies game/ and
// screenshots/ from beside this file into the output directory and writes
// /output/dossier.json with the vendored make.fun library, so the scorer
// can grade the entry from the summary alone.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The build is refused up front if it would not survive the scorer's gate:
// a missing game/index.html, or fewer than three or more than four
// screenshots. A short summary is printed on success.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const indexHtml = join(here, 'game', 'index.html');
if (!existsSync(indexHtml)) {
  throw new Error('refusing to hand in: game/index.html is missing');
}
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f))
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`refusing to hand in: ${shots.length} screenshots, the gate wants 3 or 4`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files, or a
// path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

const gameFiles = readdirSync(join(out, 'game'), { recursive: true })
  .filter((f) => statSync(join(out, 'game', f)).isFile());
const gameBytes = gameFiles.reduce((n, f) => n + statSync(join(out, 'game', f)).size, 0);
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`hand-in: game ${gameFiles.length} files (${gameBytes} bytes), ${shots.length} screenshots, dossier ${dossierBytes} bytes`);
