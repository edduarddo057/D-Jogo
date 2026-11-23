import { checkDemoPassword, clearDemo, getDemo, hasSavedDemo, isDemoActive, leaveDemo, sha256Hex, startDemo } from '.';

const DAY = 86_400_000;

describe('modo demonstração', () => {
  beforeEach(() => clearDemo());
  afterEach(() => vi.unstubAllEnvs());

  it('liga, sai sem apagar e retoma com o mesmo prazo', () => {
    const t0 = Date.parse('2026-11-22T12:00:00Z');
    const first = startDemo(t0);
    expect(isDemoActive()).toBe(true);
    expect(new Date(first.expiresAt).getTime() - t0).toBe(30 * DAY);
    localStorage.setItem('dajogo:demo-db', '{}');

    leaveDemo();
    expect(isDemoActive()).toBe(false);
    expect(hasSavedDemo()).toBe(true); // os dados continuam para consultar

    const again = startDemo(t0 + 5 * DAY);
    expect(again.expiresAt).toBe(first.expiresAt); // não renova o prazo ao voltar
    expect(isDemoActive()).toBe(true);
  });

  it('depois do prazo, os dados são apagados', () => {
    const t0 = Date.parse('2026-11-22T12:00:00Z');
    startDemo(t0);
    localStorage.setItem('dajogo:demo-db', '{}');
    expect(getDemo(t0 + 31 * DAY)).toBeNull();
    expect(localStorage.getItem('dajogo:demo-db')).toBeNull();
  });

  it('confere a senha pela impressão digital; sem senha configurada, fica fechada', async () => {
    expect(await checkDemoPassword('qualquer')).toBe(false);
    vi.stubEnv('VITE_DEMO_PASSWORD_HASH', await sha256Hex('BoraJogar2026'));
    expect(await checkDemoPassword('BoraJogar2026')).toBe(true);
    expect(await checkDemoPassword(' BoraJogar2026 ')).toBe(true);
    expect(await checkDemoPassword('borajogar2026')).toBe(false);
  });
});
