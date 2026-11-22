import { CalendarPlus, ChevronRight, MapPin, Share2 } from 'lucide-react';
import { useParams } from 'react-router';
import { Avatar, AvatarStack } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { List, ListItem } from '@/components/List';
import { NavBar, NavIconButton, PageTitle } from '@/components/NavBar';
import { ProgressBar } from '@/components/ProgressBar';
import { Section } from '@/components/Section';
import { Sheet, useSheetParam } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { Rsvp, useParticipations } from '@/features/attendance';
import { MEMBERSHIP_LABEL } from '@/features/groups';
import { useMatch } from '@/features/matches';
import { buildIcs, mapsLink } from '@/lib/calendar';
import { formatDay, formatHourRange, formatMoneyShort, formatWhen } from '@/lib/format';
import { toast } from '@/stores';
import styles from './GamePage.module.css';

const names = (people: Array<{ name: string }>, total: number) => {
  const first = people.slice(0, 3).map((p) => p.name.split(' ')[0]);
  const rest = total - first.length;
  if (first.length === 0) return 'Ninguém ainda';
  if (rest <= 0) return first.length === 1 ? first[0] : `${first.slice(0, -1).join(', ')} e ${first.at(-1)}`;
  return `${first.join(', ')} e mais ${rest}`;
};

/**
 * Detalhe do jogo (manual 3.4): data e horário, a mesma resposta do card, local (abre no mapa),
 * calendário, quem vai com a fila e as regras em linguagem simples.
 */
export function GamePage() {
  const { matchId = '' } = useParams();
  const match = useMatch(matchId);
  const list = useParticipations(matchId);
  const pay = useSheetParam('pagar');
  const whoSheet = useSheetParam('quem-vai');

  if (match.isPending) return <SkeletonList rows={4} />;
  const m = match.data;
  if (!m)
    return <EmptyState title="Jogo não encontrado" description="Ele pode ter sido cancelado ou você saiu da turma." />;

  const going = (list.data?.items ?? []).filter((p) => p.status === 'confirmed' || p.status === 'awaiting_payment');
  const queue = (list.data?.items ?? []).filter((p) => p.status === 'waitlisted');
  const taken = m.capacity - m.counts.freeSpots;
  const reserved = m.counts.pending;
  const owner = m.viewer.role === 'owner';

  const share = async () => {
    const url = window.location.href.split('?')[0] ?? '';
    const text = `${m.group.name} · ${formatDay(m.startsAt)}, ${formatHourRange(m.startsAt, m.endsAt)}`;
    try {
      if (navigator.share) await navigator.share({ title: m.group.name, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast('Link copiado.', { tone: 'success' });
      }
    } catch {
      /* a pessoa cancelou o compartilhamento */
    }
  };

  const addToCalendar = () => {
    const ics = buildIcs({
      uid: m.id,
      title: m.group.name,
      start: m.startsAt,
      end: m.endsAt,
      location: [m.location.name, m.location.address].filter(Boolean).join(', '),
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${m.group.name}.ics`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <NavBar
        back={{ to: '/', label: 'Jogos' }}
        actions={
          <NavIconButton
            label="Compartilhar"
            icon={<Share2 size={22} aria-hidden="true" />}
            onClick={() => void share()}
          />
        }
      />
      <PageTitle
        eyebrow={m.group.name}
        title={formatDay(m.startsAt, { capital: true })}
        subtitle={formatHourRange(m.startsAt, m.endsAt)}
      />

      <Card padding="md">
        <Rsvp
          matchId={m.id}
          game={m}
          onPay={(id) => pay.open({ jogo: id })}
          organizerName={m.group.pix?.holderName.split(' ')[0]}
        />
      </Card>

      <List label="Local e calendário">
        <ListItem
          inline
          leading={<MapPin size={22} aria-hidden="true" />}
          title={m.location.name}
          meta={m.location.address ?? undefined}
          trailing={
            <a className={styles.link} href={mapsLink(m.location)} target="_blank" rel="noreferrer">
              Mapa
            </a>
          }
        />
        <ListItem
          leading={<CalendarPlus size={22} aria-hidden="true" />}
          title="Adicionar ao calendário"
          onClick={addToCalendar}
        />
      </List>

      <Section
        title={`Quem vai · ${taken} de ${m.capacity}`}
        aside={m.counts.waitlisted ? `${m.counts.waitlisted} na fila` : undefined}
        footnote={
          reserved > 0 && new Date(m.responseDeadline) > new Date()
            ? `${reserved} ${reserved === 1 ? 'vaga fica' : 'vagas ficam'} com mensalistas até ${formatWhen(m.responseDeadline)}. Depois ${reserved === 1 ? 'abre' : 'abrem'} para avulsos.`
            : undefined
        }
      >
        <Card padding="md" className={styles.who}>
          <ProgressBar value={taken} max={m.capacity} label={`${taken} de ${m.capacity} vagas`} />
          <button
            type="button"
            className={styles.people}
            onClick={() => whoSheet.open()}
            aria-label={`Ver quem vai: ${taken} de ${m.capacity}${queue.length ? `, ${queue.length} na fila` : ''}`}
          >
            <AvatarStack people={going.map((p) => p.user)} total={going.length} max={3} />
            <span className={styles.peopleText}>
              <span>
                {names(
                  going.map((p) => p.user),
                  going.length,
                )}
              </span>
              {queue.length > 0 && (
                <span>
                  Na fila: {queue.map((p) => `${p.waitlistPosition}º ${p.user.name.split(' ')[0]}`).join(', ')}
                </span>
              )}
            </span>
            <ChevronRight className={styles.chevron} size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </Card>
      </Section>

      <Sheet
        open={whoSheet.isOpen}
        onClose={() => whoSheet.close()}
        title={`Quem vai · ${taken} de ${m.capacity}`}
        closeLabel="Fechar"
      >
        {going.length > 0 ? (
          <List label="Confirmados">
            {going.map((p) => (
              <ListItem
                key={p.id}
                leading={<Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} decorative />}
                title={p.user.name}
                meta={[MEMBERSHIP_LABEL[p.membershipType], p.status === 'awaiting_payment' ? 'Falta pagar' : null]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </List>
        ) : (
          <p className={styles.muted}>Ninguém confirmou ainda.</p>
        )}
        {queue.length > 0 && (
          <Section title={`Na fila · ${queue.length}`}>
            <List label="Na fila">
              {queue.map((p) => (
                <ListItem
                  key={p.id}
                  leading={<Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} decorative />}
                  title={p.user.name}
                  meta={`${p.waitlistPosition}º na fila · ${MEMBERSHIP_LABEL[p.membershipType]}`}
                />
              ))}
            </List>
          </Section>
        )}
      </Sheet>

      <Section
        title="Regras"
        footnote={owner ? 'Você organiza esta turma. Para mudar o jogo, use a aba Organizar.' : undefined}
      >
        <List>
          {m.withdrawalDeadline && (
            <ListItem title="Desistir sem penalidade" meta={`até ${formatWhen(m.withdrawalDeadline)}`} />
          )}
          <ListItem title="Valor" meta={`Mensalista: incluso · Avulso: ${formatMoneyShort(m.dropInFeeCents)}`} />
        </List>
      </Section>
    </>
  );
}
