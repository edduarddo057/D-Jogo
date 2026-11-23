import { Lock, Presentation } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Banner } from '@/components/Banner';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageTitle } from '@/components/NavBar';
import { ConfirmSheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import {
  checkDemoPassword,
  clearDemo,
  DEMO_DAYS,
  demoConfigured,
  getDemo,
  hasSavedDemo,
  isDemoActive,
  startDemo,
} from '@/lib/demo';
import { formatDay } from '@/lib/format';
import styles from './DemoPage.module.css';

/**
 * /demo: entrada do modo demonstração, com senha. Sem cadastro: entra como organizador de uma turma
 * pronta e roda uma partida completa. Os dados ficam salvos neste aparelho por DEMO_DAYS dias; quem já
 * tem uma demo salva continua de onde parou (src/lib/demo).
 */
export function DemoPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saved, setSaved] = useState(() => hasSavedDemo());
  const demo = getDemo();

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
        <Button block onClick={() => window.location.assign('/')}>
          Ir para a demonstração
        </Button>
      </div>
    );

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
    window.location.assign('/'); // recarrega: o app abre já na demo, com a turma pronta
  };

  return (
    <div className={styles.page}>
      <BrandLogo />
      <PageTitle title="Modo demonstração" />
      <ul className={styles.perks}>
        <li>Uma turma pronta, com 13 jogadores e um jogo hoje.</li>
        <li>Rode a partida completa: chegada, sorteio, placar, resultado e resumo.</li>
        <li>Sem cadastro. O que você fizer fica salvo neste aparelho por {DEMO_DAYS} dias.</li>
      </ul>

      {saved && demo && (
        <Banner tone="info" icon={<Presentation size={20} aria-hidden="true" />}>
          Você tem uma demonstração salva até {formatDay(demo.expiresAt)}. Entre para continuar de onde parou.
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
          {saved ? 'Continuar a demonstração' : 'Entrar na demonstração'}
        </Button>
      </form>

      {saved && (
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
          'As partidas, rodadas e estatísticas da demonstração deste aparelho são apagadas.',
          'Na próxima entrada, a turma volta ao começo, com todo mundo confirmado.',
        ]}
        actionLabel="Apagar a demonstração"
        onConfirm={() => {
          clearDemo();
          setSaved(false);
          setConfirmReset(false);
        }}
      />
    </div>
  );
}
