#!/usr/bin/env node
/** 16-klatkowy placeholderowy tileset (maska→kolor mieszany baza/upper) do walidacji autotilingu. */
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const theme = process.argv[2] ?? 'fantasy';
const pair = process.argv[3] ?? 'water'; // grass<->X
const T = 32;
const COLORS = { grass: [79, 122, 58], water: [47, 111, 154], dirt: [154, 112, 56], rock: [125, 122, 115] };
const base = COLORS.grass;
const up = COLORS[pair] ?? [200, 60, 200];

const sheet = new PNG({ width: T * 16, height: T, fill: true });
function px(x, y, c) { const i = (y * sheet.width + x) * 4; sheet.data[i] = c[0]; sheet.data[i + 1] = c[1]; sheet.data[i + 2] = c[2]; sheet.data[i + 3] = 255; }
for (let m = 0; m < 16; m++) {
  const nw = m & 1, ne = m & 2, sw = m & 4, se = m & 8;
  const ox = m * T;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const top = y < T / 2, left = x < T / 2;
    const corner = top ? (left ? nw : ne) : (left ? sw : se);
    px(ox + x, y, corner ? up : base);
  }
}
const frames = {};
for (let m = 0; m < 16; m++) frames[`t_${m}`] = { frame: { x: m * T, y: 0, w: T, h: T }, sourceSize: { w: T, h: T }, spriteSourceSize: { x: 0, y: 0, w: T, h: T } };
const outDir = join(root, `packages/client/public/assets/${theme}/tilemap`);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${pair}.png`), PNG.sync.write(sheet));
writeFileSync(join(outDir, `${pair}.json`), JSON.stringify({ frames, meta: { image: `${pair}.png`, format: 'RGBA8888', size: { w: T * 16, h: T }, scale: '1' } }, null, 2));
writeFileSync(join(outDir, 'index.json'), JSON.stringify({ pairs: ['water', 'dirt', 'rock'], tile: T }, null, 2));
console.log(`placeholder tileset ${theme}/${pair} (16 kafli)`);
