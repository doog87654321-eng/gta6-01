// Coral Bay: Hot Streets — the hand-in program. It gathers the playable
// game and its screenshots into the output directory and asks the vendored
// make.fun library to write the dossier the judge reads.
//
//   Node 22, standard library only; nothing is installed or downloaded.
//   Run it from the repository root:
//     mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//   In the grader's container MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root: the folder this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const handInDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, so this program refuses exactly what the scorer
// would refuse: at most 4 screenshots, each at most 256 KiB; game/ at most
// 993 entries and 48 MiB, its paths at most 1000 bytes; the dossier text
// capped at 160 KiB (the only cap that shapes the bytes).
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Count the files under a directory, subdirectories included.
function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    n += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

function handIn() {
  // Fail fast on a hand-in the scorer would refuse, instead of building
  // a dossier for it: the game entrypoint and 3-4 screenshots must exist.
  if (!existsSync(join(repoRoot, 'game', 'index.html'))) throw new Error('game/index.html is missing');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing: the gate needs 3-4 screenshots');
  const shotFiles = readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (shotFiles.length < 3 || shotFiles.length > 4) throw new Error(`screenshots/ holds ${shotFiles.length} images, the gate needs 3-4`);
  mkdirSync(handInDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(handInDir, 'game'), { recursive: true });
  mkdirSync(join(handInDir, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(handInDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(handInDir, dossierCaps);
  writeFileSync(join(handInDir, 'dossier.json'), dossier);
  console.log(`hand-in: game ${countFiles(join(handInDir, 'game'))} files, ${shotFiles.length} screenshots, dossier ${dossier.length} bytes`);
}

handIn();
