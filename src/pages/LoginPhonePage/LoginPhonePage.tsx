import { ClipboardCheck, Shuffle, Wallet } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Dock } from '@/components/Dock';
import { NavBar, PageTitle } from '@/components/NavBar';
import { GoogleSignInButton, LoginPhoneForm } from '@/features/auth';
import { GOOGLE_CLIENT_ID, PHONE_LOGIN } from '@/lib/config';
import { useSessionStore } from '@/stores';
import styles from './LoginPhonePage.module.css';

const HIGHLIGHTS = [
  { icon: ClipboardCheck, title: 'Lista que se organiza', detail: 'Vagas, fila de espera e quem confirmou.' },
  { icon: Wallet, title: 'Pix sem caçar comprovante', detail: 'Cada um avisa que pagou; você confere.' },
  { icon: Shuffle, title: 'Times sorteados na hora', detail: 'Equilibrados, com placar e destaque do dia.' },
];

/**
 * Entrar (manual 3.1, tela 2). Só com o Google (sem envio de código por WhatsApp/SMS), é a tela
 * de boas-vindas: o que o app faz e o botão no polegar. Com o login pelo celular, os dois juntos.
 * Vindo de um convite, o Voltar volta para ele.
 */
export function LoginPhonePage() {
  const invite = useSessionStore((s) => s.pendingInviteCode);
  const google = Boolean(GOOGLE_CLIENT_ID);
  const phone = PHONE_LOGIN || !google;
  const header = invite ? <NavBar back={{ to: `/convite/${invite}`, label: 'Voltar' }} /> : null;

  if (!phone)
    return (
      <>
        {header}
        <div className={styles.welcome}>
          <BrandLogo size="lg" />
          <div className={styles.hero}>
            <h1 className={styles.title}>
              {invite ? 'Falta pouco para entrar na turma.' : 'Seu jogo organizado, do convite ao placar.'}
            </h1>
            <p className={styles.lead}>Para qualquer esporte: vôlei, futebol, beach tennis, basquete…</p>
          </div>
          <ul className={styles.highlights}>
            {HIGHLIGHTS.map(({ icon: Icon, title, detail }) => (
              <li key={title} className={styles.highlight}>
                <span className={styles.icon}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span>
                  <strong className={styles.highlightTitle}>{title}</strong>
                  <span className={styles.highlightDetail}>{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Dock note="Sem senha nova: usamos só nome, e-mail e foto.">
          <GoogleSignInButton />
        </Dock>
      </>
    );

  return (
    <>
      {header ?? <BrandLogo />}
      <PageTitle title="Seu celular" />
      {google && (
        <div className={styles.google}>
          <GoogleSignInButton />
          <p className={styles.divider} aria-hidden="true">
            <span>ou com o celular</span>
          </p>
        </div>
      )}
      <LoginPhoneForm />
    </>
  );
}
