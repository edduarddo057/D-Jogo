/**
 * Modo demonstração (sem conta e sem cadastro): o app inteiro roda com os mocks no navegador, numa turma
 * pronta, e os dados ficam salvos neste aparelho por um tempo. Entra por /demo, com senha.
 *
 * - `dajogo:demo`: { active, startedAt, expiresAt } — se a demo está ligada e até quando os dados valem.
 * - `dajogo:demo-db`: o banco da demo (src/mocks/demo), salvo a cada alteração.
 * Sair da demo só desliga (`active: false`): os dados continuam até expirar, para consultar depois.
 */
export const DEMO_KEY = 'dajogo:demo';
export const DEMO_DB_KEY = 'dajogo:demo-db';

export interface DemoState {
  active: boolean;
  startedAt: string;
  expiresAt: string;
}

const DAY = 86_400_000;
export const DEMO_DAYS = Number(import.meta.env.VITE_DEMO_DAYS ?? 30) || 30;

function read(): DemoState | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as DemoState) : null;
  } catch {
    return null;
  }
}

function write(state: DemoState) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
}

/** Estado da demo; dados vencidos são apagados aqui. */
export function getDemo(now = Date.now()): DemoState | null {
  const state = read();
  if (state && new Date(state.expiresAt).getTime() <= now) {
    clearDemo();
    return null;
  }
  return state;
}

/** A demo está ligada neste aparelho (decide, na abertura do app, se os mocks entram). */
export function isDemoActive(): boolean {
  return getDemo()?.active === true;
}

/** Há dados de uma demo anterior, ainda dentro do prazo. */
export function hasSavedDemo(): boolean {
  return getDemo() !== null && localStorage.getItem(DEMO_DB_KEY) !== null;
}

/** Liga a demo: retoma os dados guardados (se ainda valem) ou começa do zero. */
export function startDemo(now = Date.now()): DemoState {
  const saved = getDemo(now);
  const state: DemoState = saved
    ? { ...saved, active: true }
    : {
        active: true,
        startedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + DEMO_DAYS * DAY).toISOString(),
      };
  write(state);
  return state;
}

/** Sai da demo sem apagar: os dados ficam até expirar. */
export function leaveDemo() {
  const state = read();
  if (state) write({ ...state, active: false });
}

/**
 * Entra na demo a partir do app (Perfil): quem já tem conta não precisa da senha de /demo. O app
 * recarrega com os mocks; a sessão real fica guardada no cookie e volta ao sair.
 */
export function enterDemo() {
  startDemo();
  window.location.assign(import.meta.env.BASE_URL);
}

/** Volta ao app oficial: desliga a demo (os dados dela ficam salvos) e recarrega sem os mocks. */
export function exitDemoToApp() {
  leaveDemo();
  window.location.assign(import.meta.env.BASE_URL);
}

/** Apaga tudo da demo deste aparelho. */
export function clearDemo() {
  localStorage.removeItem(DEMO_KEY);
  localStorage.removeItem(DEMO_DB_KEY);
}

/** A senha da demo foi configurada (VITE_DEMO_PASSWORD_HASH). Sem ela, /demo fica fechada. */
export function demoConfigured(): boolean {
  return /^[0-9a-f]{64}$/i.test(import.meta.env.VITE_DEMO_PASSWORD_HASH ?? '');
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Confere a senha pela impressão digital (SHA-256): a senha em si não fica no código. */
export async function checkDemoPassword(password: string): Promise<boolean> {
  if (!demoConfigured()) return false;
  return (await sha256Hex(password.trim())) === String(import.meta.env.VITE_DEMO_PASSWORD_HASH).toLowerCase();
}
