import { Send, Shuffle, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SelectField } from '@/components/SelectField';
import { Skeleton } from '@/components/Skeleton';
import { can } from '@/features/groups';
import { useMatch } from '@/features/matches';
import {
  describeTemplate,
  TeamsBoard,
  useDraw,
  useDrawTeams,
  useDrawTemplates,
  useMoveDrawPlayers,
  usePublishDraw,
} from '@/features/team-draw';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from './TeamDrawPage.module.css';

const WARNINGS = {
  fewer_players_than_template: 'Há menos confirmados que o padrão pede: os times ficaram o mais iguais possível.',
  positions_unbalanced: 'Não deu para separar todas as posições. Ajuste trocando jogadores.',
} as const;

const fail = (e: unknown) => toast(isApiError(e) ? messageFor(e.code) : 'Não deu para fazer isso.', { tone: 'error' });

/** /partidas/:matchId/sorteio — dono sorteia, ajusta e publica (RN-51 a RN-55). */
export function TeamDrawPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();
  const match = useMatch(matchId);
  const groupId = match.data?.group.id ?? '';
  const templates = useDrawTemplates(groupId, Boolean(groupId));
  const draw = useDraw(matchId);
  const drawTeams = useDrawTeams(matchId);
  const move = useMoveDrawPlayers(matchId);
  const publish = usePublishDraw(matchId);
  const [templateId, setTemplateId] = useState<string>('');

  const chosen = templateId || templates.data?.find((t) => t.isDefault)?.id || templates.data?.[0]?.id || '';
  const chosenTemplate = templates.data?.find((t) => t.id === chosen);
  const current = draw.data;
  const published = current?.status === 'published';
  const back = `/partidas/${matchId}`;

  if (match.data && !can(match.data.viewer, 'draw.manage'))
    return <ErrorState title="Só quem organiza a turma sorteia os times." />;

  const run = () =>
    drawTeams.mutate(chosen || undefined, {
      onSuccess: () => toast(current ? 'Times sorteados de novo.' : 'Times sorteados!', { tone: 'success' }),
      onError: fail,
    });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Sorteio de times"
        subtitle={match.data?.title}
        back={{ to: back, label: 'Voltar para a partida' }}
      />

      {(match.isPending || templates.isPending || draw.isPending) && <Skeleton shape="card" height="24rem" />}

      {match.data && match.data.status !== 'closed' && !published && (
        <p className={styles.notice} role="status">
          Feche a lista da partida antes de sortear.
        </p>
      )}

      {templates.data && draw.data !== undefined && (
        <section className={styles.controls} aria-label="Como sortear">
          <SelectField
            label="Padrão"
            options={templates.data.map((t) => ({ value: t.id, label: `${t.name}${t.isDefault ? ' (padrão)' : ''}` }))}
            value={chosen}
            onChange={(e) => setTemplateId(e.target.value)}
            hint={chosenTemplate ? describeTemplate(chosenTemplate) : undefined}
          />
          <Button
            variant={current ? 'outline' : 'primary'}
            icon={<Shuffle size={20} aria-hidden="true" />}
            loading={drawTeams.isPending}
            disabled={match.data?.status !== 'closed' && !published}
            onClick={run}
          >
            {current ? 'Sortear de novo' : 'Sortear times'}
          </Button>
        </section>
      )}

      {current && (
        <>
          {current.warnings.map((w) => (
            <p key={w} className={styles.warning}>
              <TriangleAlert size={18} aria-hidden="true" /> {WARNINGS[w]}
            </p>
          ))}
          <p className={styles.spread}>
            Diferença de nível entre os times: <strong>{current.levelSpread.toLocaleString('pt-BR')}</strong>
            {current.levelSpread <= 0.3 ? ' (bem equilibrado)' : ''}
          </p>
          <TeamsBoard
            draw={current}
            onSwap={
              published ? undefined : (userA, userB) => move.mutate({ kind: 'swap', userA, userB }, { onError: fail })
            }
          />
          {!published && (
            <Button
              block
              icon={<Send size={20} aria-hidden="true" />}
              loading={publish.isPending}
              onClick={() =>
                publish.mutate(undefined, {
                  onSuccess: () => {
                    toast('Times publicados! Cada jogador já vê o próprio time.', { tone: 'success' });
                    navigate(`/partidas/${matchId}/times`);
                  },
                  onError: fail,
                })
              }
            >
              Publicar times
            </Button>
          )}
        </>
      )}
    </div>
  );
}
