import { WifiOff } from 'lucide-react';
import styles from './OfflineBanner.module.css';
import { useOnline } from './useOnline';

/** Faixa fixa "Sem conexão" (architecture.md § 9). As consultas pausam sozinhas (networkMode: online). */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className={styles.banner} role="status">
      <WifiOff size={18} aria-hidden="true" />
      Sem conexão — mostrando o que já foi carregado.
    </div>
  );
}
