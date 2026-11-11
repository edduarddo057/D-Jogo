import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OtpChallenge, OtpChannel } from '../api/authApi';

interface LoginState {
  /** Desafio em andamento (sobrevive a recarregar a página no meio do login). */
  challenge: (OtpChallenge & { phone: string }) | null;
  channel: OtpChannel;
  setChallenge: (challenge: OtpChallenge & { phone: string }) => void;
  setChannel: (channel: OtpChannel) => void;
  clear: () => void;
}

export const useLoginStore = create<LoginState>()(
  persist(
    (set) => ({
      challenge: null,
      channel: 'whatsapp',
      setChallenge: (challenge) => set({ challenge }),
      setChannel: (channel) => set({ channel }),
      clear: () => set({ challenge: null }),
    }),
    { name: 'dajogo:login', storage: createJSONStorage(() => sessionStorage) },
  ),
);
