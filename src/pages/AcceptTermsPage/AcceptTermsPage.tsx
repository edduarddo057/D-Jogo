import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { useAcceptTerms } from '@/features/profile';
import { TERMS_VERSION } from '@/lib/config';
import { toast } from '@/stores';
import styles from '../PreferencesPage/PreferencesPage.module.css';
import local from './AcceptTermsPage.module.css';

/** /termos/aceitar — novo aceite quando os termos mudam (RN-05). */
export function AcceptTermsPage() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const accept = useAcceptTerms();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);

  const submit = () => {
    if (!checked) return setError(true);
    accept.mutate(TERMS_VERSION, {
      onSuccess: () => {
        toast('Obrigado! Tudo certo para continuar.', { tone: 'success' });
        navigate(from ?? '/', { replace: true });
      },
    });
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Atualizamos nossos termos" subtitle={`Versão ${TERMS_VERSION}`} />
      <p>
        Para continuar usando o Dá Jogo, leia e aceite a nova versão dos <Link to="/termos">termos de uso</Link> e da{' '}
        <Link to="/privacidade">política de privacidade</Link>. Se não concordar, você pode{' '}
        <Link to="/perfil/privacidade">baixar seus dados ou excluir sua conta</Link>.
      </p>
      <div className={local.check}>
        <label>
          <input
            type="checkbox"
            checked={checked}
            aria-invalid={error || undefined}
            aria-describedby={error ? 'aceite-erro' : undefined}
            onChange={(e) => {
              setChecked(e.target.checked);
              setError(false);
            }}
          />
          <span>Li e aceito os termos de uso e a política de privacidade.</span>
        </label>
        {error && (
          <span id="aceite-erro" role="alert" className={local.error}>
            Marque a caixa para continuar.
          </span>
        )}
      </div>
      <Button block loading={accept.isPending} onClick={submit}>
        Aceitar e continuar
      </Button>
    </div>
  );
}
