import { ArrowLeft, Presentation, Settings } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { List, ListItem } from '@/components/List';
import { fromState, PageTitle } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ConfirmSheet, Sheet, useSheetParam } from '@/components/Sheet';
import { Skeleton, SkeletonList } from '@/components/Skeleton';
import { Stats } from '@/components/Stats';
import { useMyGroups } from '@/features/groups';
import { gameState, useMyMatches, type MatchSummary } from '@/features/matches';
import { useMyPayments, type Payment } from '@/features/payments';
import { ProfileForm, positionLabels, useMe, useMyStats, useSports } from '@/features/profile';
import { demoConfigured, enterDemo, exitDemoToApp, isDemoActive } from '@/lib/demo';
import { formatDay, formatMoneyShort, formatWhen, monthName } from '@/lib/format';
import { APP_BUILD, APP_BUILT_AT, APP_VERSION } from '@/lib/config';
import { toast, usePwaStore } from '@/stores';
import { historyLine } from '../shared/history';
import { InstallRow } from '../shared/InstallApp';
import styles from './YouPage.module.css';

const FROM = fromState('/voce', 'Perfil');
const SIX_MONTHS = 183 * 86_400_000;

/** Perfil (manual 3.7, antes "Você"): perfil, 3 números, histórico com Jogos / Pagamentos e os Ajustes num lugar só. */
export function YouPage() {
  const me = useMe();
  const stats = useMyStats();
  const sports = useSports();
  const [tab, setTab] = useState<'jogos' | 'pagamentos'>('jogos');
  const edit = useSheetParam('editar-perfil');
  const [saving, setSaving] = useState(false);
  const m = me.data;
  const sport = m?.sportProfiles[0];

  return (
    <>
      <PageTitle title="Perfil" />
      {m ? (
        <Card padding="md" row>
          <Avatar name={m.name} id={m.id} src={m.photoUrl} size="lg" />
          <div className={styles.who}>
            <span className={styles.name}>{m.name}</span>
            <span className={styles.muted}>
              @{m.nickname}
              {sport ? ` · ${positionLabels(sports.data, sport.sportId, sport.positions, ', ')}` : ''}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => edit.open()}>
            Editar
          </Button>
        </Card>
      ) : (
        <Skeleton shape="card" height="9rem" />
      )}

      {stats.data ? (
        <Stats
          label="Seus números"
          items={[
            { value: stats.data.matches, label: stats.data.matches === 1 ? 'jogo' : 'jogos' },
            { value: `${Math.round(stats.data.attendanceRate * 100)}%`, label: 'frequência' },
            { value: stats.data.highlights, label: stats.data.highlights === 1 ? 'vez destaque' : 'vezes destaque' },
          ]}
        />
      ) : (
        <Skeleton shape="card" height="7rem" />
      )}

      <SegmentedControl
        label="Histórico"
        options={[
          { value: 'jogos', label: 'Jogos' },
          { value: 'pagamentos', label: 'Pagamentos' },
        ]}
        value={tab}
        onChange={setTab}
        panelIdBase="historico"
      />
      <div id={`historico-${tab}`} role="tabpanel">
        {tab === 'jogos' ? <GamesHistory /> : <PaymentsHistory />}
      </div>

      <List>
        <ListItem
          leading={<Settings size={22} aria-hidden="true" />}
          title="Ajustes"
          meta="Tema, avisos, privacidade e conta"
          to="/voce/ajustes"
          linkState={FROM}
        />
        <InstallRow />
        <DemoRow />
      </List>
      <AppVersion />

      <Sheet
        open={edit.isOpen}
        onClose={() => edit.close()}
        title="Editar perfil"
        action={{ label: 'Salvar', form: 'editar-perfil', loading: saving }}
      >
        {m && (
          <ProfileForm
            mode="edit"
            me={m}
            formId="editar-perfil"
            onBusyChange={setSaving}
            onDone={() => {
              toast('Perfil salvo.', { tone: 'success' });
              edit.close();
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function GamesHistory() {
  const history = useMyMatches('history');
  const [now] = useState(() => Date.now());
  if (history.isPending) return <SkeletonList rows={3} />;
  const items = (history.data?.items ?? []).filter((g) => now - new Date(g.startsAt).getTime() < SIX_MONTHS);
  if (items.length === 0) return <p className={styles.muted}>Seus jogos aparecem aqui depois que acontecerem.</p>;
  return (
    <Section footnote="Todas as turmas · últimos 6 meses">
      <List label="Jogos">
        {items.map((g) => {
          const h = g.myHistory;
          const badge =
            h?.outcome === 'attended' ? (
              <Badge tone="success">Foi</Badge>
            ) : h?.outcome === 'late_withdrawal' ? (
              <Badge tone="danger">Desistência tardia</Badge>
            ) : (
              <Badge tone="neutral">Não foi</Badge>
            );
          const meta = `${g.groupName} · ${h?.outcome === 'attended' && h.wins !== null ? `${h.wins} ${h.wins === 1 ? 'vitória' : 'vitórias'}` : historyLine(h)}`;
          const common = { inline: true, title: formatDay(g.startsAt, { capital: true }), meta, trailing: badge };
          return h?.outcome === 'attended' ? (
            <ListItem key={g.id} {...common} to={`/jogos/${g.id}/resumo`} linkState={FROM} />
          ) : (
            <ListItem key={g.id} {...common} />
          );
        })}
      </List>
    </Section>
  );
}

function PaymentsHistory() {
  const payments = useMyPayments();
  const groups = useMyGroups();
  const upcoming = useMyMatches('upcoming');
  const history = useMyMatches('history');
  const pay = useSheetParam('pagar');
  if (payments.isPending) return <SkeletonList rows={3} />;
  const games = new Map<string, MatchSummary>(
    [...(upcoming.data?.items ?? []), ...(history.data?.items ?? [])].map((g) => [g.id, g]),
  );
  const groupName = (id: string) => groups.data?.find((g) => g.id === id)?.name ?? '';
  const owned = groups.data?.filter((g) => g.viewer.role === 'owner') ?? [];
  const items = (payments.data?.items ?? []).filter((p) => p.status !== 'cancelled');

  const describe = (p: Payment) => {
    const game = p.matchId ? games.get(p.matchId) : undefined;
    const what =
      p.kind === 'monthly_fee' && p.referenceMonth
        ? `mensalidade de ${monthName(p.referenceMonth)}`
        : game
          ? formatDay(game.startsAt)
          : '';
    return `${formatMoneyShort(p.amountCents)} · ${groupName(p.groupId)}${what ? `, ${what}` : ''}`;
  };
  const status = (p: Payment) => {
    const game = p.matchId ? games.get(p.matchId) : undefined;
    const st = game ? gameState(game) : null;
    switch (p.status) {
      case 'paid':
        return {
          badge: <Badge tone="success">Pago</Badge>,
          meta: p.rejectionReason
            ? `Recusado (${p.rejectionReason.toLowerCase()}) e reenviado`
            : p.reviewedAt
              ? `Pago em ${formatDay(p.reviewedAt).split(', ')[1]}`
              : 'Pago',
        };
      case 'reported':
        return { badge: <Badge tone="info">Conferindo</Badge>, meta: 'Quem organiza vai conferir' };
      case 'rejected':
        return {
          badge: <Badge tone="danger">Recusado</Badge>,
          meta: `${p.rejectionReason ?? 'Recusado'}. Envie de novo.`,
        };
      default:
        return {
          badge: <Badge tone="warning">{st?.kind === 'pay' || p.kind === 'monthly_fee' ? 'Pagar' : 'Pendente'}</Badge>,
          meta: st?.kind === 'pay' && st.deadline ? `Vence ${formatWhen(st.deadline)}` : 'Pendente',
        };
    }
  };

  return (
    <Section
      footnote={
        owned.length ? `Na ${owned.map((g) => g.name).join(' e na ')} você é quem organiza e não é cobrado.` : undefined
      }
    >
      {items.length === 0 ? (
        <p className={styles.muted}>Nenhum pagamento ainda.</p>
      ) : (
        <List label="Pagamentos">
          {items.map((p) => {
            const s = status(p);
            const payable = p.status === 'pending' || p.status === 'rejected';
            const open = () => pay.open(p.matchId ? { jogo: p.matchId } : { pagamento: p.id });
            return payable ? (
              <ListItem key={p.id} inline title={describe(p)} meta={s.meta} trailing={s.badge} onClick={open} />
            ) : (
              <ListItem key={p.id} inline title={describe(p)} meta={s.meta} trailing={s.badge} />
            );
          })}
        </List>
      )}
    </Section>
  );
}

/**
 * Demonstração a partir do Perfil: quem tem conta entra sem a senha de /demo. Dentro da demo, o
 * mesmo lugar volta ao app oficial (como a faixa do topo).
 */
function DemoRow() {
  const sheet = useSheetParam('demonstracao');
  if (isDemoActive())
    return (
      <ListItem
        leading={<ArrowLeft size={22} aria-hidden="true" />}
        title="Voltar ao app"
        meta="Sai da demonstração; ela fica salva na sua conta"
        onClick={exitDemoToApp}
      />
    );
  if (!demoConfigured()) return null;
  return (
    <>
      <ListItem
        leading={<Presentation size={22} aria-hidden="true" />}
        title="Ver a demonstração"
        meta="Turma de exemplo para testar à vontade"
        onClick={() => sheet.open()}
      />
      <ConfirmSheet
        open={sheet.isOpen}
        onClose={() => sheet.close()}
        title="Abrir a demonstração?"
        tone="primary"
        consequences={[
          'Abre uma turma de exemplo, com jogadores e um jogo hoje, para testar tudo.',
          'Seus dados reais não mudam: a demonstração fica separada, salva na sua conta, até você apagar.',
          'Em outro celular com a mesma conta, ela continua de onde parou.',
          'Para voltar, toque em “Voltar ao app” na faixa do topo.',
        ]}
        actionLabel="Abrir a demonstração"
        onConfirm={enterDemo}
      />
    </>
  );
}

/** Versão instalada neste aparelho (package.json + commit do build); com versão nova esperando, atualiza. */
function AppVersion() {
  const update = usePwaStore((s) => (s.updateAvailable ? s.applyUpdate : null));
  const built = new Date(APP_BUILT_AT).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <footer className={styles.version}>
      <p>
        Dá Jogo {APP_VERSION} · versão {APP_BUILD} · {built}
      </p>
      {update && (
        <Button size="sm" variant="tint" onClick={() => void update()}>
          Atualizar agora
        </Button>
      )}
    </footer>
  );
}
