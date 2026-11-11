import { PageHeader } from '@/components/PageHeader';
import { OnboardingForm, useMe } from '@/features/profile';
import { useSessionStore } from '@/stores';
import styles from '../PreferencesPage/PreferencesPage.module.css';

/** /cadastro — primeiro acesso. Se veio por convite, entra na turma ao concluir (RN-21). */
export function OnboardingPage() {
  const me = useMe();
  const invite = useSessionStore((s) => s.pendingInviteCode);
  return (
    <div className={styles.page}>
      <PageHeader
        title="Complete seu perfil"
        subtitle={invite ? 'Falta pouco para entrar na turma.' : 'Assim a galera sabe quem você é e onde joga.'}
      />
      <OnboardingForm defaultName={me.data?.name ?? ''} />
    </div>
  );
}
