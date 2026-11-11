import { MapPin, Pencil, SearchX, SlidersHorizontal, UserPlus } from 'lucide-react';
import { Link, Outlet, useParams } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedNav } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { can, useGroup } from '@/features/groups';
import { isApiError } from '@/lib/http';
import styles from './GroupPage.module.css';
import type { GroupOutletContext } from './groupContext';

/** /turmas/:groupId/* — cabeçalho da turma + abas Jogadores, Partidas e Financeiro. */
export function GroupPage() {
  const { groupId = '' } = useParams();
  const query = useGroup(groupId);

  if (query.isPending) {
    return (
      <div className={styles.page}>
        <Skeleton width="60%" height="3.2rem" />
        <Skeleton shape="card" height="20rem" />
      </div>
    );
  }
  if (query.isError) {
    if (isApiError(query.error) && (query.error.status === 404 || query.error.status === 403)) {
      return (
        <div className={styles.page}>
          <PageHeader title="Turma não encontrada" back={{ to: '/turmas', label: 'Voltar para Turmas' }} />
          <EmptyState
            icon={SearchX}
            title="Não achamos essa turma"
            description="Ela pode ter sido arquivada ou você não faz mais parte dela."
            action={<ButtonLink to="/turmas">Ver minhas turmas</ButtonLink>}
          />
        </div>
      );
    }
    return <ErrorState onRetry={() => void query.refetch()} retrying={query.isRefetching} />;
  }

  const group = query.data;
  const base = `/turmas/${group.id}`;
  const tabs = [
    { to: `${base}/jogadores`, label: 'Jogadores' },
    { to: `${base}/partidas`, label: 'Partidas' },
    ...(can(group.viewer, 'group.view_finance') ? [{ to: `${base}/financeiro`, label: 'Financeiro' }] : []),
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={group.name}
        back={{ to: '/turmas', label: 'Voltar para Turmas' }}
        subtitle={
          <span className={styles.location}>
            <MapPin size={16} aria-hidden="true" />
            {group.location.name}
          </span>
        }
      />

      {can(group.viewer, 'group.invite') && (
        <div className={styles.ownerActions}>
          <ButtonLink to={`${base}/convidar`} icon={<UserPlus size={20} aria-hidden="true" />} size="sm">
            Convidar
          </ButtonLink>
          {can(group.viewer, 'group.edit') && (
            <>
              <ButtonLink
                to={`${base}/regras`}
                variant="outline"
                size="sm"
                icon={<SlidersHorizontal size={18} aria-hidden="true" />}
              >
                Regras
              </ButtonLink>
              <Link to={`${base}/editar`} className={styles.iconLink} aria-label="Editar turma">
                <Pencil size={20} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      )}

      <SegmentedNav label="Seções da turma" items={tabs} />
      <Outlet context={{ group } satisfies GroupOutletContext} />
    </div>
  );
}
