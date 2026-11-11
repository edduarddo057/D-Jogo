import { useNavigate, useParams } from 'react-router';
import { ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { GroupForm, useGroup, useUpdateGroup } from '@/features/groups';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from '../PreferencesPage/PreferencesPage.module.css';

/** /turmas/:groupId/editar */
export function EditGroupPage() {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const group = useGroup(groupId);
  const update = useUpdateGroup(groupId);
  const back = `/turmas/${groupId}/jogadores`;

  return (
    <div className={styles.page}>
      <PageHeader title="Editar turma" back={{ to: back, label: 'Voltar para a turma' }} />
      {group.isPending && <Skeleton shape="card" height="40rem" />}
      {group.isError && <ErrorState onRetry={() => void group.refetch()} />}
      {group.data && (
        <GroupForm
          group={group.data}
          submitLabel="Salvar"
          onSubmit={async (values) => {
            try {
              await update.mutateAsync({ ...values, pix: values.pix });
              toast('Turma atualizada.', { tone: 'success' });
              navigate(back);
            } catch (error) {
              toast(isApiError(error) ? messageFor(error.code) : 'Não deu para salvar.', { tone: 'error' });
            }
          }}
        />
      )}
    </div>
  );
}
