import { create } from 'zustand';

/** Evento do Chrome/Edge/Android para oferecer a instalação (não existe no Safari). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'prompt' | 'ios' | 'unsupported';

interface PwaState {
  /** Já está aberto como app instalado. */
  isStandalone: boolean;
  /** Como oferecer a instalação neste navegador. */
  platform: InstallPlatform;
  deferredPrompt: BeforeInstallPromptEvent | null;
  /** Há uma versão nova esperando para ser aplicada. */
  updateAvailable: boolean;
  applyUpdate: (() => Promise<void>) | null;

  setDeferredPrompt: (event: BeforeInstallPromptEvent | null) => void;
  setUpdate: (apply: () => Promise<void>) => void;
  setInstalled: () => void;
}

const detectStandalone = () =>
  typeof window !== 'undefined' &&
  ((typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

const detectIos = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)); // iPadOS se identifica como Mac

export const usePwaStore = create<PwaState>()((set) => ({
  isStandalone: detectStandalone(),
  platform: detectIos() ? 'ios' : 'unsupported',
  deferredPrompt: null,
  updateAvailable: false,
  applyUpdate: null,

  setDeferredPrompt: (deferredPrompt) =>
    set({ deferredPrompt, platform: deferredPrompt ? 'prompt' : detectIos() ? 'ios' : 'unsupported' }),
  setUpdate: (applyUpdate) => set({ updateAvailable: true, applyUpdate }),
  setInstalled: () => set({ isStandalone: true, deferredPrompt: null }),
}));
