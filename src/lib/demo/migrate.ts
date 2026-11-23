import { API_URL } from '@/lib/http';
import { DEMO_DB_KEY, isDemoActive } from './index';

/**
 * Versões antigas guardavam a demo só no aparelho (`dajogo:demo-db`). Na primeira abertura da demo
 * com a versão nova, ela sobe para a conta (PUT /demo) e só então sai do aparelho — nada se perde.
 * Sem internet ou sem sessão, fica para a próxima abertura.
 */
export async function moveDeviceDemoToAccount(): Promise<void> {
  if (import.meta.env.VITE_API_MOCK === 'true' || !isDemoActive()) return;
  const raw = localStorage.getItem(DEMO_DB_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as { db?: unknown };
    if (!saved.db) return localStorage.removeItem(DEMO_DB_KEY);
    const signal = AbortSignal.timeout(10_000);
    const refresh = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal,
    });
    if (!refresh.ok) return;
    const { accessToken } = (await refresh.json()) as { accessToken: string };
    const put = await fetch(`${API_URL}/demo`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ data: saved.db }),
      signal,
    });
    if (put.ok) localStorage.removeItem(DEMO_DB_KEY);
  } catch {
    /* tenta de novo na próxima abertura */
  }
}
