import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meKeys } from '@/features/profile';
import { useSessionStore } from '@/stores';
import { requestOtp, signInWithGoogle, verifyOtp, type AuthSession, type OtpChannel } from '../api/authApi';
import { useLoginStore } from '../stores/loginStore';

export function useRequestOtp() {
  const setChallenge = useLoginStore((s) => s.setChallenge);
  return useMutation({
    mutationFn: ({ phone, channel }: { phone: string; channel: OtpChannel }) => requestOtp(phone, channel),
    meta: { silent: true },
    onSuccess: (challenge, { phone }) => setChallenge({ ...challenge, phone }),
  });
}

/**
 * Valida o código e decide para onde ir (RN-02):
 * perfil incompleto → cadastro; convite pendente → aceitar; senão → para onde a pessoa ia.
 * O destino vai para a store antes da sessão, e o GuestOnly faz o redirecionamento.
 */
export function useVerifyOtp() {
  const onSession = useOpenSession();
  return useMutation({
    mutationFn: ({ challengeId, code }: { challengeId: string; code: string }) => verifyOtp(challengeId, code),
    meta: { silent: true },
    onSuccess: onSession,
  });
}

/** Entrar com Google: mesma sessão e mesmos destinos do login pelo código. */
export function useGoogleSignIn() {
  const onSession = useOpenSession();
  return useMutation({
    mutationFn: (accessToken: string) => signInWithGoogle(accessToken),
    meta: { silent: true },
    onSuccess: onSession,
  });
}

function useOpenSession() {
  const queryClient = useQueryClient();
  return (session: AuthSession) => {
    const store = useSessionStore.getState();
    const invite = store.pendingInviteCode;
    // Celular → Código → Perfil (manual 3.1). Com convite e perfil pronto, aceita e cai em Jogos.
    const target = !session.user.profileCompleted
      ? '/entrar/perfil'
      : invite
        ? `/convite/${invite}?aceitar=1`
        : (store.redirectTo ?? '/');
    queryClient.setQueryData(meKeys.me, session.user);
    store.setRedirectTo(target);
    useLoginStore.getState().clear();
    store.setSession(session.accessToken);
  };
}
