import { clsx } from 'clsx';
import styles from './Button.module.css';
import type { ButtonStyleProps } from './Button';

/** Classes do botão, para casos raros em que outro elemento precisa da mesma aparência. */
export function buttonClassName({ variant = 'primary', size = 'md', block = false }: ButtonStyleProps, extra?: string) {
  return clsx(styles.button, styles[variant], styles[size], block && styles.block, extra);
}
