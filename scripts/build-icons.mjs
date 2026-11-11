#!/usr/bin/env node
/**
 * Gera os ícones PNG do PWA a partir dos SVGs da marca (public/brand).
 * Uso: pnpm icons  (rodar quando public/brand/app-icon*.svg mudar)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const pub = (p) => `${root}public/${p}`;

const icon = readFileSync(pub('brand/app-icon.svg'));
const maskable = readFileSync(pub('brand/app-icon-maskable.svg'));

const jobs = [
  // "any": cantos arredondados com fundo transparente
  { src: icon, size: 192, out: 'pwa-192x192.png' },
  { src: icon, size: 512, out: 'pwa-512x512.png' },
  // "maskable": fundo cheio, símbolo dentro da área segura (o sistema recorta)
  { src: maskable, size: 512, out: 'maskable-512x512.png' },
  // iOS aplica o próprio arredondamento e não aceita transparência
  { src: maskable, size: 180, out: 'apple-touch-icon.png' },
  { src: icon, size: 32, out: 'favicon-32x32.png' },
];

for (const { src, size, out } of jobs) {
  await sharp(src, { density: Math.ceil((72 * size) / 512) * 2 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(pub(out));
  console.log(`public/${out} (${size}×${size})`);
}
