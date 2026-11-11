import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useThemeStore, type ThemePreference } from '@/stores';
import styles from './ThemeSelector.module.css';

const OPTIONS: Array<{ value: ThemePreference; label: string; hint: string; icon: LucideIcon }> = [
  { value: 'system', label: 'Automático', hint: 'Segue o tema do celular', icon: Monitor },
  { value: 'light', label: 'Claro', hint: 'Sempre claro', icon: Sun },
  { value: 'dark', label: 'Escuro', hint: 'Sempre escuro', icon: Moon },
];

/** Escolha do tema (Automático, Claro, Escuro). Aplica na hora e fica salvo neste aparelho. */
export function ThemeSelector() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Tema</legend>
      <div className={styles.options}>
        {OPTIONS.map(({ value, label, hint, icon: Icon }) => (
          <label key={value} className={styles.option}>
            <input
              className={styles.radio}
              type="radio"
              name="theme"
              value={value}
              checked={preference === value}
              onChange={() => setPreference(value)}
            />
            <Icon className={styles.icon} size={22} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
            <span className={styles.hint}>{hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
