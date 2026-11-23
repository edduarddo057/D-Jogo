import { ArrowLeft, Presentation } from 'lucide-react';
import { formatDay } from '@/lib/format';
import { exitDemoToApp, getDemo } from '@/lib/demo';
import { demoMode } from '../enableMocks';
import styles from './DemoBanner.module.css';

/**
 * Faixa fixa do modo demonstração: deixa claro que é uma demo, até quando os dados ficam salvos neste
 * aparelho, e volta ao app oficial com um toque (não apaga nada: dá para voltar pelo Perfil).
 */
export function DemoBanner() {
  const demo = getDemo();
  if (!demoMode || !demo) return null;
  return (
    <div className={styles.banner} role="status">
      <Presentation size={18} aria-hidden="true" />
      <span className={styles.text}>
        <b>Demonstração</b> · salva até {formatDay(demo.expiresAt)}
      </span>
      <button type="button" className={styles.exit} onClick={exitDemoToApp}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar ao app
      </button>
    </div>
  );
}
