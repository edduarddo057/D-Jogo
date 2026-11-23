import { Presentation } from 'lucide-react';
import { useState } from 'react';
import { ConfirmSheet } from '@/components/Sheet';
import { formatDay } from '@/lib/format';
import { getDemo, leaveDemo } from '@/lib/demo';
import { demoMode } from '../enableMocks';
import styles from './DemoBanner.module.css';

/** Sai da demonstração sem apagar nada e volta para /demo (o app recarrega sem os mocks). */
function exitDemo() {
  leaveDemo();
  window.location.assign('/demo');
}

/**
 * Faixa fixa do modo demonstração: deixa claro que é uma demo, até quando os dados ficam salvos neste
 * aparelho, e dá a saída (que não apaga nada: dá para voltar por /demo e consultar).
 */
export function DemoBanner() {
  const [confirm, setConfirm] = useState(false);
  const demo = getDemo();
  if (!demoMode || !demo) return null;
  const until = formatDay(demo.expiresAt);
  return (
    <>
      <div className={styles.banner} role="status">
        <Presentation size={18} aria-hidden="true" />
        <span className={styles.text}>
          <b>Demonstração</b> · salva até {until}
        </span>
        <button type="button" className={styles.exit} onClick={() => setConfirm(true)}>
          Sair
        </button>
      </div>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Sair da demonstração?"
        tone="primary"
        leading={
          <span className={styles.icon} aria-hidden="true">
            <Presentation size={28} />
          </span>
        }
        consequences={[
          `O que você fez continua salvo neste aparelho até ${until}.`,
          'Para voltar e consultar, entre de novo em /demo com a senha.',
        ]}
        actionLabel="Sair da demonstração"
        onConfirm={exitDemo}
      />
    </>
  );
}
