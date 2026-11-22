// Gera o símbolo com fundo transparente a partir do original (fundo #121214), troca o laranja do original
// pelo verde da marca (mantendo o degradê) e gera os ícones do app.
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
// Laranja do original → verde da marca (color-primary #5fd49c): muda o tom e mantém luz e sombra
function rgbToHsl(r, g, b) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
for (let o = 0; o < out.length; o += 4) {
  if (out[o + 3] === 0) continue;
  const [h, sat, l] = rgbToHsl(out[o], out[o + 1], out[o + 2]);
  // só o laranja (o branco fica): croma = canal mais forte − mais fraco; o branco tem só ruído (< 24),
  // o laranja e a borda onde ele se mistura com o branco passam disso
  const chroma = Math.max(out[o], out[o + 1], out[o + 2]) - Math.min(out[o], out[o + 1], out[o + 2]);
  if (chroma < 24 || (h > 60 && h < 260)) continue; // 260–360: borda quase transparente puxada para o rosa
  const [r, g, b] = hslToRgb(151, Math.min(1, sat * 0.6), Math.min(0.85, l + 0.09));
  out[o] = r;
  out[o + 1] = g;
  out[o + 2] = b;
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

// Versão para fundo claro: o branco do símbolo vira o azul-marinho da marca
const { data: sym, info: si } = await sharp(symbol).raw().toBuffer({ resolveWithObject: true });
const ink = [20, 42, 64]; // azul-marinho da marca (color-brand)
const dark = Buffer.from(sym);
for (let i = 0; i < dark.length; i += 4) {
  const [r, g, b] = [dark[i], dark[i + 1], dark[i + 2]];
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  if (saturation < 40) [dark[i], dark[i + 1], dark[i + 2]] = ink; // branco/cinza → marinho; verde fica
}
await sharp(dark, { raw: { width: si.width, height: si.height, channels: 4 } })
  .png()
  .toFile('public/brand/symbol-on-light.png');

// Ícones do app: símbolo sobre o azul-marinho da marca
const bg = { r: 20, g: 42, b: 64, alpha: 1 }; // color-brand #142a40
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

// ── Peças da abertura animada: o símbolo recortado em partes (mesmo tamanho do símbolo; empilhadas
// formam o logo exato). Separação por cor (branco × laranja) e por partes conectadas.
{
  const { data: px, info: pi } = await sharp('public/brand/symbol.png').raw().toBuffer({ resolveWithObject: true });
  const W = pi.width;
  const H = pi.height;
  const N = W * H;
  const kind = new Uint8Array(N); // 0 vazio, 1 branco, 2 laranja
  for (let p = 0, i = 0; p < N; p += 1, i += 4) {
    if (px[i + 3] < 60) continue;
    const sat = Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]);
    kind[p] = sat < 60 ? 1 : 2;
  }
  // partes conectadas de cada cor
  const label = new Int32Array(N);
  const parts = [];
  for (let p = 0; p < N; p += 1) {
    if (!kind[p] || label[p]) continue;
    const id = parts.length + 1;
    const stack = [p];
    label[p] = id;
    let count = 0;
    let minX = W;
    let minY = H;
    while (stack.length) {
      const q = stack.pop();
      count += 1;
      const x = q % W;
      minX = Math.min(minX, x);
      minY = Math.min(minY, (q / W) | 0);
      for (const d of [1, -1, W, -W]) {
        const r = q + d;
        if (r < 0 || r >= N || Math.abs((r % W) - x) > 1) continue;
        if (kind[r] === kind[p] && !label[r]) {
          label[r] = id;
          stack.push(r);
        }
      }
    }
    parts.push({ id, kind: kind[p], count, minX, minY });
  }
  // bordas suaves (alfa baixo) vão para a parte mais próxima
  let frontier = [];
  for (let p = 0; p < N; p += 1) if (label[p]) frontier.push(p);
  for (let step = 0; step < 4 && frontier.length; step += 1) {
    const next = [];
    for (const q of frontier)
      for (const d of [1, -1, W, -W]) {
        const r = q + d;
        if (r < 0 || r >= N || label[r] || px[r * 4 + 3] === 0) continue;
        label[r] = label[q];
        next.push(r);
      }
    frontier = next;
  }
  const big = parts.filter((c) => c.count > 200);
  const whites = big.filter((c) => c.kind === 1).sort((a, b) => a.minY - b.minY);
  const oranges = big.filter((c) => c.kind === 2).sort((a, b) => b.count - a.count);
  const pieces = {
    bar: [whites[0]], // barra do D (a parte branca mais alta)
    runner: whites.slice(1), // corpo e cabeça do atleta
    bowl: [oranges[0]], // a curva grande do D
    // o rastro à esquerda: a parte colorida que não é a curva grande nem a bola
    swoosh: [oranges.find((c) => c !== oranges[0] && c.minY >= 50)],
    ball: [oranges.find((c) => c.minY < 50)], // a bola, no alto
  };
  for (const [name, list] of Object.entries(pieces)) {
    const ids = new Set(list.map((c) => c.id));
    const buf = Buffer.alloc(N * 4);
    for (let p = 0; p < N; p += 1) if (ids.has(label[p])) px.copy(buf, p * 4, p * 4, p * 4 + 4);
    await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
      .png()
      .toFile(`public/brand/splash/${name}.png`);
  }
  console.log('peças da abertura:', Object.keys(pieces).join(', '));
}
