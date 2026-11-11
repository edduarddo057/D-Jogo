/**
 * Orçamento de performance (etapa 13): JS e CSS carregados na primeira visita, comprimidos com gzip.
 * Lê o dist/index.html (entrada + modulepreload). Rode depois de `pnpm build`.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET = { js: 170 * 1024, css: 20 * 1024 };
const html = readFileSync('dist/index.html', 'utf8');
const files = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(js|css))"/g)].map((m) => ({
  path: m[1],
  kind: m[2],
}));
const size = (path) => gzipSync(readFileSync(`dist/${path}`)).length;

let failed = false;
for (const kind of ['js', 'css']) {
  const total = files.filter((f) => f.kind === kind).reduce((sum, f) => sum + size(f.path), 0);
  const ok = total <= BUDGET[kind];
  failed ||= !ok;
  console.log(
    `${ok ? '✓' : '✗'} ${kind.toUpperCase()} inicial: ${(total / 1024).toFixed(1)} KB gzip (limite ${BUDGET[kind] / 1024} KB)`,
  );
}
process.exit(failed ? 1 : 0);
