import { BrandLogo } from '@/components/BrandLogo';
import { NavBar, PageTitle } from '@/components/NavBar';
import { LoginPhoneForm } from '@/features/auth';
import { useSessionStore } from '@/stores';

/** Entrar — celular (manual 3.1, tela 2). Vindo de um convite, o Voltar volta para ele. */
export function LoginPhonePage() {
  const invite = useSessionStore((s) => s.pendingInviteCode);
  return (
    <>
      {invite ? <NavBar back={{ to: `/convite/${invite}`, label: 'Voltar' }} /> : <BrandLogo />}
      <PageTitle title="Seu celular" />
      <LoginPhoneForm />
    </>
  );
}
