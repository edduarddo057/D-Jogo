import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface SessionState {
  /** Token de acesso: só em memória, nunca persistido (docs/frontend/architecture.md § 7). */
  accessToken: string | null;
  status: SessionStatus;
  /** Convite aberto antes do login, aceito ao terminar o login/cadastro. */
  pendingInviteCode: string | null;
  /** Rota para voltar depois do login. */
  redirectTo: string | null;
  /** A API respondeu TERMS_UPDATE_REQUIRED: o app pede o novo aceite antes de seguir (RN-05). */
  termsUpdateRequired: boolean;

  setSession: (accessToken: string) => void;
  setAnonymous: () => void;
  clear: () => void;
  setPendingInvite: (code: string | null) => void;
  setRedirectTo: (path: string | null) => void;
  setTermsUpdateRequired: (required: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      status: 'unknown',
      pendingInviteCode: null,
      redirectTo: null,
      termsUpdateRequired: false,

      setSession: (accessToken) => set({ accessToken, status: 'authenticated' }),
      setAnonymous: () => set({ accessToken: null, status: 'anonymous' }),
      clear: () => set({ accessToken: null, status: 'anonymous', termsUpdateRequired: false }),
      setPendingInvite: (pendingInviteCode) => set({ pendingInviteCode }),
      setRedirectTo: (redirectTo) => set({ redirectTo }),
      setTermsUpdateRequired: (termsUpdateRequired) => set({ termsUpdateRequired }),
    }),
    {
      name: 'dajogo:session',
      storage: createJSONStorage(() => sessionStorage),
      // só o que precisa sobreviver a um recarregamento no meio do login
      partialize: (s) => ({ pendingInviteCode: s.pendingInviteCode, redirectTo: s.redirectTo }),
    },
  ),
);
