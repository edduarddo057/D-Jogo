// Gera o símbolo com fundo transparente a partir do original (fundo #121214) e os ícones do app.
// Uso: node scripts/brand/build-symbol.mjs
import sharp from 'sharp';

const SRC = 'public/brand/source/simbolo-original.png';
const BG = [18, 18, 20];

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
  // "cor para alfa": quanto o pixel se afasta do fundo vira opacidade; a cor é recuperada sem o fundo
  const c = [data[i], data[i + 1], data[i + 2]];
  const a = Math.max(...c.map((v, k) => (v - BG[k]) / (255 - BG[k])), 0);
  const alpha = Math.min(1, a);
  for (let k = 0; k < 3; k += 1) out[o + k] = alpha > 0 ? Math.round(BG[k] + (c[k] - BG[k]) / alpha) : 0;
  out[o + 3] = Math.round(alpha * 255);
}
const transparent = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
const trimmed = await transparent.png().toBuffer();
const { data: symbol, info: trim } = await sharp(trimmed)
  .trim({ threshold: 1 })
  .png()
  .toBuffer({ resolveWithObject: true });
await sharp(symbol).toFile('public/brand/symbol.png');
// posição do recorte no original: a animação de abertura desenha por cima nas mesmas coordenadas
console.log('symbol.png', trim.width, trim.height, 'offset', -trim.trimOffsetLeft, -trim.trimOffsetTop);

// Versão para fundo claro: o branco do símbolo vira o grafite da marca
const { data: sym, info: si } = await sharp(symbol).raw().toBuffer({ resolveWithObject: true });
const ink = [20, 20, 22];
const dark = Buffer.from(sym);
for (let i = 0; i < dark.length; i += 4) {
  const [r, g, b] = [dark[i], dark[i + 1], dark[i + 2]];
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  if (saturation < 40) [dark[i], dark[i + 1], dark[i + 2]] = ink; // branco/cinza → grafite; laranja fica
}
await sharp(dark, { raw: { width: si.width, height: si.height, channels: 4 } })
  .png()
  .toFile('public/brand/symbol-on-light.png');

// Ícones do app: símbolo sobre o fundo escuro da marca
const bg = { r: 18, g: 18, b: 20, alpha: 1 };
async function icon(size, file, scale) {
  const inner = Math.round(size * scale);
  const logo = await sharp(symbol)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(file);
}
await icon(512, 'public/pwa-512x512.png', 0.78);
await icon(192, 'public/pwa-192x192.png', 0.78);
await icon(180, 'public/apple-touch-icon.png', 0.74);
await icon(512, 'public/maskable-512x512.png', 0.6); // zona segura do ícone adaptável (Android)
await icon(32, 'public/favicon-32x32.png', 0.9);
await icon(256, 'public/brand/app-icon.png', 0.78);
console.log('ícones gerados');
