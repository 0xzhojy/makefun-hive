import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const index = process.argv.indexOf('--input');
const input = index >= 0 ? process.argv[index + 1] : '/input/snapshot.json';
const file = input.endsWith('.json') ? input : join(input, 'snapshot.json');
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
// Build every output from one sealed snapshot before making the dossier.
const snapshot = JSON.parse(readFileSync(file, 'utf8'));
const radar = build(snapshot);
mkdirSync(out, {recursive: true});
writeFileSync(join(out, 'board.json'), JSON.stringify({rows: radar.rows}) + '\n');
writeFileSync(join(out, 'data.js'), 'window.RADAR=' + JSON.stringify(radar) + ';\n');
for (const name of ['dashboard', 'screenshots']) {
  const src = join(root, name), dst = join(out, name);
  if (existsSync(src)) { rmSync(dst, {recursive: true, force: true}); cpSync(src, dst, {recursive: true}); }
}
const images = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')) : [];
if (existsSync(join(out, 'dashboard/index.html')) && images.length >= 3) {
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, {text_max_bytes: 65536}));
} else {
  rmSync(join(out, 'dossier.json'), {force: true});
  console.error('Dashboard or three screenshots missing; dossier cannot be built.');
  process.exitCode = 1;
}
console.log(`${radar.rows.length} ranked records; ${radar.live.length} token records; ${snapshot.watchlist.length} watchlist entries.`);
