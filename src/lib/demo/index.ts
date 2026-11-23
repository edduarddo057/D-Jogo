/**
 * Modo demonstração: uma turma pronta, ligada à conta da pessoa (é preciso estar logado). Os dados
 * ficam na API, separados dos dados reais (demo_worlds), e só somem quando a pessoa apaga — trocar de
 * celular ou atualizar o app não mexe neles. O app avisa a API em cada pedido (X-Dajogo-Demo: 1).
 *
 * - `dajogo:demo`: { active, startedAt } — só se ESTE aparelho está mostrando a demo agora.
 * - `dajogo:demo-db`: usado apenas com VITE_API_MOCK=true (dev), quando a demo roda nos mocks.
 */
export const DEMO_KEY = 'dajogo:demo';
export const DEMO_DB_KEY = 'dajogo:demo-db';
export const DEMO_HEADER = 'X-Dajogo-Demo';

export interface DemoState {
  active: boolean;
  startedAt: string;
}

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

/** Estado da demo neste aparelho (sem prazo: os dados vivem na conta). */
export function getDemo(): DemoState | null {
  return read();
}

/** Este aparelho está na demo (cada pedido à API vai para a demo da conta). */
export function isDemoActive(): boolean {
  return getDemo()?.active === true;
}

/** Liga a demo neste aparelho. */
export function startDemo(now = Date.now()): DemoState {
  const state: DemoState = { active: true, startedAt: read()?.startedAt ?? new Date(now).toISOString() };
  write(state);
  return state;
}

/** Sai da demo neste aparelho (os dados continuam na conta). */
export function leaveDemo() {
  const state = read();
  if (state) write({ ...state, active: false });
}

/**
 * Entra na demo a partir do app (Perfil): quem já tem conta não precisa da senha de /demo. O app
 * recarrega e passa a ver a demo da conta (na primeira vez, a API cria a turma pronta).
 */
export function enterDemo() {
  startDemo();
  window.location.assign(import.meta.env.BASE_URL);
}

/** Volta ao app oficial: desliga a demo neste aparelho (os dados dela ficam na conta) e recarrega. */
export function exitDemoToApp() {
  leaveDemo();
  window.location.assign(import.meta.env.BASE_URL);
}

/** Esquece a demo neste aparelho (a da conta é apagada pela API: deleteDemo). */
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
