import { parse } from 'yaml';
import { API_URL } from '@/lib/http';
import { handlers } from '../handlers';
import openapi from '../../../docs/api/openapi.yaml?raw';

/**
 * Etapa 15: os mocks cobrem o contrato inteiro e não inventam rotas fora dele.
 * Quando a API real chegar, o mesmo contrato vale para os dois lados.
 */
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

const spec = parse(openapi) as {
  paths: Record<string, Partial<Record<(typeof METHODS)[number], unknown>>>;
};

const normalize = (path: string) => path.replace(/\{[^}]+\}/g, ':p').replace(/:[A-Za-z]+/g, ':p');

const contract = new Set(
  Object.entries(spec.paths).flatMap(([path, ops]) =>
    METHODS.filter((m) => ops[m]).map((m) => `${m.toUpperCase()} ${normalize(path)}`),
  ),
);

const mocked = new Set(
  handlers
    .map((h) => h.info as { method?: string; path?: unknown })
    .filter((info) => typeof info.path === 'string' && info.method && info.method !== 'OPTIONS')
    .map((info) => `${String(info.method)} ${normalize(String(info.path).replace(API_URL, ''))}`),
);

describe('contrato da API × mocks', () => {
  it('toda operação do openapi.yaml tem handler no MSW', () => {
    const missing = [...contract].filter((op) => !mocked.has(op));
    expect(missing).toEqual([]);
  });

  it('nenhum handler fora do contrato', () => {
    const extra = [...mocked].filter((op) => !contract.has(op));
    expect(extra).toEqual([]);
  });
});
