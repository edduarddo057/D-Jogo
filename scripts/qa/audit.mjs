/* global document, getComputedStyle, axe */
/**
 * Auditoria da etapa 13 no Chrome de verdade (CSS real: contraste, overflow, foco).
 * Uso: pnpm dev (com VITE_API_MOCK=true) e depois `node scripts/qa/audit.mjs [baseUrl]`.
 * Precisa de puppeteer-core e de um Chrome (CHROME_PATH).
 */
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5173';
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const AXE = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');

const ROUTES = [
  '/',
  '/?folha=pagar&jogo=m_qua',
  '/jogos/m_sab',
  '/jogos/m_sab_p1/resumo',
  '/avisos',
  '/turmas',
  '/turmas?folha=nova-turma',
  '/turmas/g_sabado',
  '/turmas/g_quarta',
  '/turmas/nova',
  '/voce',
  '/voce?folha=editar-perfil',
  '/voce/ajustes',
  '/organizar',
  '/organizar/g_sabado/presenca',
  '/organizar/g_sabado/presenca?folha=novo-jogo',
  '/organizar/g_sabado/presenca?folha=convidar',
  '/organizar/g_sabado/membros',
  '/organizar/g_sabado/membros?folha=membro&pessoa=mb_sab_u_bruno',
  '/organizar/g_sabado/caixa',
  '/organizar/g_sabado/caixa?folha=lancamento',
  '/organizar/g_sabado/dia-de-jogo/m_sab',
  '/convite/SABADO25',
  '/termos',
  '/privacidade',
  '/nao-existe',
];
const WIDTHS = [320, 390, 768, 1280];
const THEMES = ['light', 'dark'];

const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'], headless: true });
const problems = [];
const errors = [];
const VERBOSE = process.env.VERBOSE === '1';

/** Um "trabalho" = tema × largura; roda até 4 em paralelo, cada um num contexto isolado. */
async function audit(theme, width) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem('dajogo:theme', JSON.stringify({ state: { preference: t }, version: 0 }));
    } catch {
      /* about:blank não tem localStorage */
    }
  }, theme);
  await page.setViewport({ width, height: 800, isMobile: width < 768, deviceScaleFactor: 1 });
  // axe em 390 (os dois temas) e 1280 (claro): o contraste muda com o tema; o layout, com a largura
  const withAxe = width === 390 || (width === 1280 && theme === 'light');
  for (const route of ROUTES) {
    const started = Date.now();
    await page.goto(BASE + route, { waitUntil: 'load' });
    await page
      .waitForSelector('h1', { timeout: 8000 })
      .catch(() => problems.push(`[${theme} ${width}] ${route}: sem h1`));
    await page.waitForNetworkIdle({ idleTime: 250, timeout: 5000 }).catch(() => {});
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) problems.push(`[${theme} ${width}] ${route}: rolagem horizontal de ${overflow}px`);
    if (withAxe) {
      await page.evaluate(AXE);
      const result = await page.evaluate(async () => {
        const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] });
        return r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
        }));
      });
      for (const v of result)
        problems.push(`[${theme} ${width}] ${route}: ${v.id} (${v.impact}) → ${v.nodes.join(' | ')}`);
    }
    if (VERBOSE) console.log(`${theme} ${width} ${route} ${Date.now() - started}ms`);
    else process.stdout.write('.');
  }
  await context.close();
}

const jobs = THEMES.flatMap((t) => WIDTHS.map((w) => [t, w]));
for (let i = 0; i < jobs.length; i += 4) await Promise.all(jobs.slice(i, i + 4).map(([t, w]) => audit(t, w)));
console.log('');

const page = await browser.newPage();
// Teclado: Tab a partir do topo leva ao "Pular para o conteúdo" e o foco é sempre visível
await page.setViewport({ width: 390, height: 800, isMobile: true });
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await page.keyboard.press('Tab');
const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
if (first !== 'Pular para o conteúdo') problems.push(`teclado: primeiro Tab foi para "${first}"`);
for (let i = 0; i < 25; i += 1) {
  await page.keyboard.press('Tab');
  const visible = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return true;
    const s = getComputedStyle(el);
    return s.outlineStyle !== 'none' || s.boxShadow !== 'none';
  });
  if (!visible) {
    const label = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80));
    problems.push(`teclado: foco sem indicador visível em ${label}`);
  }
}

await browser.close();
const unique = [...new Set(problems)];
console.log(unique.length ? unique.join('\n') : 'Nenhum problema encontrado.');
if (errors.length) console.log('\nErros de JS:\n' + [...new Set(errors)].join('\n'));
process.exit(unique.length || errors.length ? 1 : 0);
