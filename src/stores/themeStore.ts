import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Mesma chave lida pelo script inline do index.html, que aplica o tema antes da primeira pintura. */
export const THEME_STORAGE_KEY = 'dajogo:theme';
const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#f5f5f7', dark: '#0e0e10' };

const prefersDark = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

export const resolveTheme = (preference: ThemePreference): ResolvedTheme =>
  preference === 'system' ? (prefersDark() ? 'dark' : 'light') : preference;

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Reavalia quando o sistema troca de tema (só vale com preference = system). */
  syncWithSystem: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      resolved: resolveTheme('system'),
      setPreference: (preference) => {
        const resolved = resolveTheme(preference);
        applyTheme(resolved);
        set({ preference, resolved });
      },
      syncWithSystem: () => {
        if (get().preference !== 'system') return;
        const resolved = resolveTheme('system');
        applyTheme(resolved);
        set({ resolved });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (s) => ({ preference: s.preference }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.resolved = resolveTheme(state.preference);
        applyTheme(state.resolved);
      },
    },
  ),
);

/** Liga o acompanhamento do tema do sistema. Retorna a função para desligar. */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => useThemeStore.getState().syncWithSystem();
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
