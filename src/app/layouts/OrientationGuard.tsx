import { Smartphone } from 'lucide-react';
import { useEffect } from 'react';
import { lockPortrait } from '@/lib/orientation';
import styles from './OrientationGuard.module.css';

/**
 * O app é feito para o celular em pé (manual 1.2). Deitado, fora do placar ao vivo, aparece uma tela
 * pedindo para girar no lugar de um layout espremido. Só em celular (toque e pouca altura): no
 * computador e no tablet nada muda.
 */
export function OrientationGuard() {
  useEffect(() => {
    lockPortrait();
  }, []);
  return (
    <div className={styles.guard} role="alert" aria-live="polite">
      <Smartphone className={styles.icon} size={48} strokeWidth={1.8} aria-hidden="true" />
      <p className={styles.title}>Gire o celular para a vertical</p>
      <p className={styles.text}>O Dá Jogo funciona em pé. Só o placar do dia de jogo pode ficar deitado.</p>
    </div>
  );
}
