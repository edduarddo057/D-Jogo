import { useNavigate, useParams } from 'react-router';
import { ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { MatchForm, useMatch, useMatchAction, useUpdateMatch } from '@/features/matches';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from '../PreferencesPage/PreferencesPage.module.css';

/** /partidas/:matchId/editar — mudar capacidade respeita quem já ocupa vaga (RN-27). */
export function EditMatchPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();
  const match = useMatch(matchId);
  const update = useUpdateMatch(matchId);
  const action = useMatchAction(matchId);
  const back = `/partidas/${matchId}`;

  return (
    <div className={styles.page}>
      <PageHeader title="Editar partida" back={{ to: back, label: 'Voltar para a partida' }} />
      {match.isPending && <Skeleton shape="card" height="40rem" />}
      {match.isError && <ErrorState onRetry={() => void match.refetch()} />}
      {match.data && (
        <MatchForm
          match={match.data}
          defaults={{ title: '', date: '', start: '', end: '', locationName: '', capacity: 12, dropInFeeCents: 0 }}
          submitLabel="Salvar"
          onSubmit={async ({ publish, ...patch }) => {
            try {
              await update.mutateAsync(patch);
              if (publish && match.data.status === 'draft') await action.mutateAsync('publish');
              toast('Partida atualizada.', { tone: 'success' });
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
