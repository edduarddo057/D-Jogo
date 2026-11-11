import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { LoginPhoneForm } from '@/features/auth';
import { useSessionStore } from '@/stores';
import styles from '../LoginCodePage/AuthPage.module.css';

/** /entrar — guarda para onde a pessoa ia (?voltar) e o convite (?convite) antes do login. */
export function LoginPhonePage() {
  const [params] = useSearchParams();

  useEffect(() => {
    const store = useSessionStore.getState();
    const back = params.get('voltar');
    const invite = params.get('convite');
    if (back?.startsWith('/')) store.setRedirectTo(back);
    if (invite) store.setPendingInvite(invite);
  }, [params]);

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.subtitle}>Use seu celular. Mandamos um código para confirmar que é você.</p>
      </header>
      <LoginPhoneForm />
    </>
  );
}
