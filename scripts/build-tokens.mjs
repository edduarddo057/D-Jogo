#!/usr/bin/env node
/**
 * Gera src/styles/tokens.css a partir de docs/design-system/tokens.json.
 * Converte px em rem com 1rem = 10px (html { font-size: 62.5% }).
 * Uso: pnpm tokens
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SRC = `${root}docs/design-system/tokens.json`;
const OUT = `${root}src/styles/tokens.css`;

const t = JSON.parse(readFileSync(SRC, 'utf8'));
const themes = t.color.themes.map((th) => th.id);
const firstTheme = themes[0];

const rem = (v) => {
  const m = /^(-?[\d.]+)px$/.exec(String(v));
  return m ? `${Number(m[1]) / 10}rem` : v;
};
const valueFor = (value, theme) => (typeof value === 'string' ? value : (value[theme] ?? value[firstTheme]));

const lines = [
  '/* Dá Jogo — gerado de docs/design-system/tokens.json. Não edite à mão: rode `pnpm tokens`. */',
  '',
  ':root {',
  '  /* Tipografia — famílias */',
];
for (const [key, stack] of Object.entries(t.type.families)) lines.push(`  --font-${key}: ${stack};`);

lines.push('', '  /* Tipografia — escala (1rem = 10px) */');
for (const group of t.type.groups) {
  for (const s of group.styles) {
    lines.push(`  --text-${s.name}-size: ${rem(s.fontSize)};`);
    lines.push(`  --text-${s.name}-line: ${rem(s.lineHeight)};`);
    lines.push(`  --text-${s.name}-weight: ${s.fontWeight};`);
    if (s.letterSpacing) lines.push(`  --text-${s.name}-tracking: ${s.letterSpacing};`);
    lines.push(`  --text-${s.name}-family: var(--font-${s.family ?? group.family});`);
  }
}

for (const family of ['spacing', 'radius', 'zIndex']) {
  lines.push('', `  /* ${family} */`);
  for (const tok of t[family].tokens) lines.push(`  --${tok.name}: ${rem(tok.value)};`);
}

lines.push(
  '',
  '  /* movimento */',
  '  --duration-fast: 120ms;',
  '  --duration-base: 200ms;',
  '  --duration-slow: 320ms;',
  '  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);',
  '',
  '  /* layout */',
  '  --nav-bottom-height: 7.2rem;',
  '  --nav-side-width: 24rem;',
  '  --content-max: 112rem;',
  '  --content-narrow: 64rem;',
  '}',
  '',
);

const themeBlock = (selector, theme, indent = '') => {
  const out = [`${indent}${selector} {`, `${indent}  color-scheme: ${theme === 'dark' ? 'dark' : 'light'};`];
  for (const tok of t.color.tokens) out.push(`${indent}  --${tok.name}: ${valueFor(tok.value, theme)};`);
  for (const tok of t.shadow.tokens) out.push(`${indent}  --${tok.name}: ${valueFor(tok.value, theme)};`);
  out.push(`${indent}}`);
  return out;
};

lines.push(...themeBlock(':root,\n[data-theme="light"]', 'light'), '');
lines.push(...themeBlock('[data-theme="dark"]', 'dark'), '');
lines.push('/* Sem escolha salva e sem o script do index.html: segue o sistema */');
lines.push('@media (prefers-color-scheme: dark) {');
lines.push(...themeBlock(':root:not([data-theme])', 'dark', '  '));
lines.push('}', '');

lines.push('/* Breakpoints — use em media queries em `em` (não são afetadas pelo 62.5%):');
for (const tok of t.breakpoint.tokens) {
  const px = Number.parseInt(tok.value, 10);
  lines.push(`   ${tok.name}: ${tok.value} -> @media (width >= ${px / 16}em)`);
}
lines.push('*/', '');

writeFileSync(OUT, lines.join('\n'));
console.log(`tokens.css gerado (${t.color.tokens.length} cores, ${themes.length} temas)`);
