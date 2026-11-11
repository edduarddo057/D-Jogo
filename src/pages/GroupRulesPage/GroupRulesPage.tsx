import { useParams } from 'react-router';
import { ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { RulesForm, useGroup } from '@/features/groups';
import { DrawTemplatesSection } from '@/features/team-draw';
import styles from '../PreferencesPage/PreferencesPage.module.css';

/** /turmas/:groupId/regras — só o dono recebe `rules` da API. */
export function GroupRulesPage() {
  const { groupId = '' } = useParams();
  const group = useGroup(groupId);
  return (
    <div className={styles.page}>
      <PageHeader
        title="Regras da turma"
        subtitle="Valem para as próximas partidas. Cada mudança é salva na hora."
        back={{ to: `/turmas/${groupId}/jogadores`, label: 'Voltar para a turma' }}
      />
      {group.isPending && <Skeleton shape="card" height="32rem" />}
      {group.isError && <ErrorState onRetry={() => void group.refetch()} />}
      {group.data && !group.data.rules && <ErrorState title="Só quem organiza a turma pode ver as regras." />}
      {group.data?.rules && (
        <>
          <RulesForm groupId={groupId} rules={group.data.rules} />
          <DrawTemplatesSection groupId={groupId} />
        </>
      )}
    </div>
  );
}
