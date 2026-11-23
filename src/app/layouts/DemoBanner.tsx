import { ArrowLeft, Presentation } from 'lucide-react';
import { exitDemoToApp, getDemo } from '@/lib/demo';
import { demoMode } from '../enableMocks';
import styles from './DemoBanner.module.css';

/**
 * Faixa fixa do modo demonstração: deixa claro que é uma demo (salva na conta) e volta ao app oficial
 * com um toque (não apaga nada: dá para voltar pelo Perfil, em qualquer celular).
 */
export function DemoBanner() {
  const demo = getDemo();
  if (!demoMode || !demo) return null;
  return (
    <div className={styles.banner} role="status">
      <Presentation size={18} aria-hidden="true" />
      <span className={styles.text}>
        <b>Demonstração</b> · salva na sua conta
      </span>
      <button type="button" className={styles.exit} onClick={exitDemoToApp}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar ao app
      </button>
    </div>
  );
}
