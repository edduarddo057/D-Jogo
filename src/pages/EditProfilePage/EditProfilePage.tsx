import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/EmptyState';
import { EditProfileForm, useMe } from '@/features/profile';
import styles from '../PreferencesPage/PreferencesPage.module.css';

/** /perfil/dados */
export function EditProfilePage() {
  const me = useMe();
  return (
    <div className={styles.page}>
      <PageHeader title="Seus dados" back={{ to: '/perfil', label: 'Voltar para o Perfil' }} />
      {me.isPending && <Skeleton shape="card" height="32rem" />}
      {me.isError && <ErrorState onRetry={() => void me.refetch()} />}
      {me.data && <EditProfileForm me={me.data} />}
    </div>
  );
}
