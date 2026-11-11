import { format, nextDay } from 'date-fns';
import { useNavigate, useParams } from 'react-router';
import { ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { useGroup } from '@/features/groups';
import { MatchForm, useCreateMatch } from '@/features/matches';
import { isoToZoned, weekdayName, zonedToIso } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from '../PreferencesPage/PreferencesPage.module.css';

/** Sugestão inicial: a próxima quarta-feira, 20h (dá para trocar no formulário). */
const suggestedDate = () => format(nextDay(new Date(), 3), 'yyyy-MM-dd');

/** /turmas/:groupId/partidas/nova */
export function CreateMatchPage() {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const group = useGroup(groupId);
  const create = useCreateMatch(groupId);
  const date = suggestedDate();
  const startIso = zonedToIso(date, '20:00');

  return (
    <div className={styles.page}>
      <PageHeader
        title="Nova partida"
        subtitle={group.data?.name}
        back={{ to: `/turmas/${groupId}/partidas`, label: 'Voltar para a turma' }}
      />
      {group.isPending && <Skeleton shape="card" height="40rem" />}
      {group.isError && <ErrorState onRetry={() => void group.refetch()} />}
      {group.data && (
        <MatchForm
          defaults={{
            title: `Partida de ${weekdayName(startIso)}`,
            date: isoToZoned(startIso).date,
            start: '20:00',
            end: '22:00',
            locationName: group.data.location.name,
            capacity: group.data.defaultCapacity,
            dropInFeeCents: group.data.dropInFeeCents,
          }}
          submitLabel="Criar partida"
          onSubmit={async (values) => {
            try {
              const match = await create.mutateAsync({
                ...values,
                location: {
                  name: values.location?.name ?? group.data.location.name,
                  address: group.data.location.address ?? null,
                },
              });
              toast(values.publish === false ? 'Rascunho salvo.' : 'Partida publicada!', { tone: 'success' });
              navigate(`/partidas/${match.id}`, { replace: true });
            } catch (error) {
              toast(isApiError(error) ? messageFor(error.code) : 'Não deu para criar a partida.', { tone: 'error' });
            }
          }}
        />
      )}
    </div>
  );
}
