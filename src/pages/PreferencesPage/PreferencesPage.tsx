import { PageHeader } from '@/components/PageHeader';
import { InstallAppCard } from '@/features/app-install';
import { ThemeSelector } from '@/features/profile';
import styles from './PreferencesPage.module.css';

/** Perfil › Preferências: tema e instalação do app. Notificações entram na fase 2. */
export function PreferencesPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="Preferências" back={{ to: '/perfil', label: 'Voltar para o Perfil' }} />
      <ThemeSelector />
      <InstallAppCard />
    </div>
  );
}
