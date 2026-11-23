import { BrandLogo } from '@/components/BrandLogo';
import { NavBar, PageTitle } from '@/components/NavBar';
import { GoogleSignInButton, LoginPhoneForm } from '@/features/auth';
import { GOOGLE_CLIENT_ID, PHONE_LOGIN } from '@/lib/config';
import { useSessionStore } from '@/stores';
import styles from './LoginPhonePage.module.css';

/**
 * Entrar (manual 3.1, tela 2): pelo Google e/ou pelo celular com código. Sem envio de código por
 * WhatsApp/SMS (PHONE_LOGIN desligado), só o Google; o celular é pedido depois, no perfil.
 * Vindo de um convite, o Voltar volta para ele.
 */
export function LoginPhonePage() {
  const invite = useSessionStore((s) => s.pendingInviteCode);
  const google = Boolean(GOOGLE_CLIENT_ID);
  const phone = PHONE_LOGIN || !google;
  return (
    <>
      {invite ? <NavBar back={{ to: `/convite/${invite}`, label: 'Voltar' }} /> : <BrandLogo />}
      <PageTitle title={phone ? 'Seu celular' : 'Entrar'} />
      {google && (
        <div className={styles.google}>
          {!phone && <p className={styles.muted}>Entre com a sua conta Google. Sem senha nova.</p>}
          <GoogleSignInButton />
          {phone && (
            <p className={styles.divider} aria-hidden="true">
              <span>ou com o celular</span>
            </p>
          )}
        </div>
      )}
      {phone && <LoginPhoneForm />}
    </>
  );
}
