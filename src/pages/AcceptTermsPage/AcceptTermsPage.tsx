import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Check';
import { Dock } from '@/components/Dock';
import { PageTitle } from '@/components/NavBar';
import { useAcceptTerms } from '@/features/profile';
import { TERMS_VERSION } from '@/lib/config';
import { toast } from '@/stores';

/** /termos/aceitar — novo aceite quando os termos mudam (RN-05). */
export function AcceptTermsPage() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const accept = useAcceptTerms();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    if (!checked) return setError('Marque para continuar.');
    accept.mutate(TERMS_VERSION, {
      onSuccess: () => {
        toast('Tudo certo. Bom jogo!', { tone: 'success' });
        navigate(from ?? '/', { replace: true });
      },
    });
  };

  return (
    <>
      <PageTitle title="Atualizamos os termos" subtitle={`Versão ${TERMS_VERSION}`} />
      <p>
        Para continuar, leia e aceite a nova versão dos <Link to="/termos">termos de uso</Link> e da{' '}
        <Link to="/privacidade">política de privacidade</Link>. Se não concordar, você pode{' '}
        <Link to="/voce/ajustes">baixar seus dados ou excluir sua conta</Link>.
      </p>
      <Checkbox
        checked={checked}
        onChange={(v) => {
          setChecked(v);
          setError(undefined);
        }}
        error={error}
      >
        Li e aceito os termos de uso e a política de privacidade.
      </Checkbox>
      <Dock>
        <Button block loading={accept.isPending} onClick={submit}>
          Aceitar e continuar
        </Button>
      </Dock>
    </>
  );
}
