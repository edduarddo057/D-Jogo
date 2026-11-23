import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, LogIn, Presentation } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Banner } from '@/components/Banner';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageTitle } from '@/components/NavBar';
import { ConfirmSheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { appUrl } from '@/lib/config';
import { checkDemoPassword, demoConfigured, isDemoActive, startDemo } from '@/lib/demo';
import { deleteDemo, getDemoStatus } from '@/lib/demo/api';
import { formatDay } from '@/lib/format';
import { toast, useSessionStore } from '@/stores';
import styles from './DemoPage.module.css';

const PERKS = [
  'Uma turma pronta, com 13 jogadores e um jogo, para testar tudo.',
  'Rode a partida completa: chegada, sorteio, placar, resultado e resumo.',
  'Fica salva na sua conta, separada dos seus dados reais, até você apagar. Em outro celular, continua de onde parou.',
];

/**
 * /demo: entrada do modo demonstração, com senha. A demo é da conta (fica na API, separada dos dados
 * reais): é preciso entrar antes. Quem já tem demo continua de onde parou; apagar é só pelo botão.
 */
export function DemoPage() {
  const navigate = useNavigate();
  const status = useSessionStore((s) => s.status);
  const authenticated = status === 'authenticated';
  const queryClient = useQueryClient();
  const saved = useQuery({ queryKey: ['demo', 'status'], queryFn: getDemoStatus, enabled: authenticated });
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!demoConfigured())
    return (
      <EmptyState
        icon={Lock}
        title="Demonstração fechada"
        description="A senha da demonstração ainda não foi configurada neste ambiente."
      />
    );

  if (isDemoActive())
    return (
      <div className={styles.page}>
        <BrandLogo />
        <PageTitle title="Você já está na demonstração" />
        <Button block onClick={() => window.location.assign(appUrl(''))}>
          Ir para a demonstração
        </Button>
      </div>
    );

  if (!authenticated)
    return (
      <div className={styles.page}>
        <BrandLogo />
        <PageTitle title="Modo demonstração" />
        <ul className={styles.perks}>
          {PERKS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <Banner tone="info" icon={<LogIn size={20} aria-hidden="true" />}>
          A demonstração fica guardada na sua conta. Entre primeiro e volte aqui.
        </Banner>
        <Button
          block
          loading={status === 'unknown'}
          onClick={() => {
            useSessionStore.getState().setRedirectTo('/demo');
            navigate('/entrar');
          }}
        >
          Entrar na minha conta
        </Button>
      </div>
    );

  const exists = saved.data?.exists === true;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return setError('Digite a senha da demonstração.');
    setChecking(true);
    const ok = await checkDemoPassword(password);
    if (!ok) {
      // um pequeno atraso a cada erro deixa tentativas em série mais lentas
      await new Promise((r) => setTimeout(r, 900));
      setChecking(false);
      return setError('Senha incorreta.');
    }
    startDemo();
    window.location.assign(appUrl('')); // recarrega: o app abre já na demo da conta
  };

  const reset = async () => {
    setDeleting(true);
    try {
      await deleteDemo();
      await queryClient.invalidateQueries({ queryKey: ['demo', 'status'] });
      setConfirmReset(false);
      toast('Demonstração apagada. A próxima começa do zero.', { tone: 'success' });
    } catch {
      toast('Não deu para apagar. Tente de novo.', { tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <BrandLogo />
      <PageTitle title="Modo demonstração" />
      <ul className={styles.perks}>
        {PERKS.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      {exists && (
        <Banner tone="info" icon={<Presentation size={20} aria-hidden="true" />}>
          Você tem uma demonstração salva na sua conta
          {saved.data?.updatedAt ? `, usada por último em ${formatDay(saved.data.updatedAt)}` : ''}. Entre para
          continuar de onde parou.
        </Banner>
      )}

      <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
        <TextField
          label="Senha da demonstração"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <Button type="submit" block loading={checking}>
          {exists ? 'Continuar a demonstração' : 'Entrar na demonstração'}
        </Button>
      </form>

      {exists && (
        <Button variant="ghost" block onClick={() => setConfirmReset(true)}>
          Apagar e começar do zero
        </Button>
      )}

      <ConfirmSheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Apagar a demonstração?"
        leading={
          <span className={styles.icon} aria-hidden="true">
            <Presentation size={28} />
          </span>
        }
        consequences={[
          'Turma, pessoas, partidas, rodadas e estatísticas da demonstração são apagadas da sua conta, em todos os celulares.',
          'Seus dados reais não mudam.',
          'Na próxima entrada, a turma volta ao começo, com todo mundo confirmado.',
        ]}
        actionLabel="Apagar a demonstração"
        loading={deleting}
        onConfirm={() => void reset()}
      />
    </div>
  );
}
