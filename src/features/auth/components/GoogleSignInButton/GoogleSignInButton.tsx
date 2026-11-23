import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/Spinner';
import { GOOGLE_CLIENT_ID } from '@/lib/config';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import { useGoogleSignIn } from '../../hooks/useLogin';
import { loadGoogleIdentity } from './googleIdentity';
import styles from './GoogleSignInButton.module.css';

/** Botão oficial do Google (o Google exige o visual dele). Some se não houver Client ID. */
export function GoogleSignInButton() {
  const box = useRef<HTMLDivElement>(null);
  const signIn = useGoogleSignIn();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  // o mutate do TanStack Query é estável: o botão é desenhado uma vez
  const { mutate } = signIn;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let alive = true;
    loadGoogleIdentity()
      .then((gsi) => {
        if (!alive || !box.current) return;
        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          callback: ({ credential }) => {
            if (!credential) return;
            mutate(credential, {
              onError: (e) =>
                toast(isApiError(e) ? messageFor(e.code) : 'Não deu para entrar com o Google. Tente de novo.', {
                  tone: 'error',
                }),
            });
          },
        });
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        gsi.renderButton(box.current, {
          type: 'standard',
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(200, Math.round(box.current.clientWidth))),
          locale: 'pt-BR',
        });
        setState('ready');
      })
      .catch(() => alive && setState('failed'));
    return () => {
      alive = false;
    };
  }, [mutate]);

  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <div className={styles.wrap} aria-busy={state === 'loading' || signIn.isPending}>
      <div ref={box} className={styles.button} hidden={state === 'failed'} />
      {state === 'loading' && <Spinner label="Carregando o Google" />}
      {signIn.isPending && <Spinner label="Entrando" />}
      {state === 'failed' && (
        <p className={styles.error} role="alert">
          Não deu para carregar o Google. Confira a internet e recarregue a página.
        </p>
      )}
    </div>
  );
}
