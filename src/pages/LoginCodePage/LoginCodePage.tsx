import { NavBar, PageTitle } from '@/components/NavBar';
import { LoginCodeForm } from '@/features/auth';

/** Entrar — código (manual 3.1, tela 3). */
export function LoginCodePage() {
  return (
    <>
      <NavBar back={{ to: '/entrar', label: 'Voltar' }} />
      <PageTitle title="Código" />
      <LoginCodeForm />
    </>
  );
}
