import { checkDemoPassword, clearDemo, getDemo, isDemoActive, leaveDemo, sha256Hex, startDemo } from '.';

const DAY = 86_400_000;

describe('modo demonstração', () => {
  beforeEach(() => clearDemo());
  afterEach(() => vi.unstubAllEnvs());

  it('liga e sai sem apagar (os dados ficam na conta); ao voltar, é a mesma demo', () => {
    const t0 = Date.parse('2026-11-22T12:00:00Z');
    const first = startDemo(t0);
    expect(isDemoActive()).toBe(true);
    leaveDemo();
    expect(isDemoActive()).toBe(false);
    expect(startDemo(t0 + 5 * DAY).startedAt).toBe(first.startedAt);
    expect(isDemoActive()).toBe(true);
  });

  it('não vence com o tempo: só some quando a pessoa apaga', () => {
    startDemo(Date.parse('2025-01-01T00:00:00Z'));
    expect(getDemo()?.active).toBe(true);
  });

  it('confere a senha pela impressão digital; sem senha configurada, fica fechada', async () => {
    expect(await checkDemoPassword('qualquer')).toBe(false);
    vi.stubEnv('VITE_DEMO_PASSWORD_HASH', await sha256Hex('BoraJogar2026'));
    expect(await checkDemoPassword('BoraJogar2026')).toBe(true);
    expect(await checkDemoPassword(' BoraJogar2026 ')).toBe(true);
    expect(await checkDemoPassword('borajogar2026')).toBe(false);
  });
});
