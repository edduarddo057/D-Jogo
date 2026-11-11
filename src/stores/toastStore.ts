import { create } from 'zustand';

export type ToastTone = 'neutral' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onAction: () => void };
  /** ms; padrão 4000, ou 6000 quando há ação (design system › Toast). */
  duration: number;
}

interface ToastState {
  current: Toast | null;
  show: (toast: Omit<Toast, 'id' | 'duration' | 'tone'> & Partial<Pick<Toast, 'duration' | 'tone'>>) => void;
  dismiss: (id?: number) => void;
}

let nextId = 1;

/** Um toast por vez: o novo substitui o anterior. */
export const useToastStore = create<ToastState>()((set, get) => ({
  current: null,
  show: (toast) =>
    set({
      current: {
        id: nextId++,
        tone: toast.tone ?? 'neutral',
        duration: toast.duration ?? (toast.action ? 6000 : 4000),
        message: toast.message,
        ...(toast.action ? { action: toast.action } : {}),
      },
    }),
  dismiss: (id) => {
    if (id === undefined || get().current?.id === id) set({ current: null });
  },
}));

/** Atalho para uso fora de componentes (ex.: onError de mutações). */
export const toast = (message: string, options?: Partial<Omit<Toast, 'id' | 'message'>>) =>
  useToastStore.getState().show({ message, ...options });
