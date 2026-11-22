import { Search } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { List, ListItem } from '@/components/List';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Section } from '@/components/Section';
import { ConfirmSheet, Sheet, useSheetParam } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import {
  MEMBERSHIP_LABEL,
  useMembers,
  useRemoveMember,
  useUpdateMember,
  type Group,
  type Member,
  type MembershipType,
} from '@/features/groups';
import { positionLabels, useSports } from '@/features/profile';
import { monthName } from '@/lib/format';
import { toast } from '@/stores';
import styles from './OrganizerGroupPage.module.css';

const levelText = (level: number | null | undefined) => (level ? `Nível ${level}` : 'Sem nível');
const genderText = (g: Member['gender']) =>
  g === 'female' ? 'Feminino' : g === 'male' ? 'Masculino' : 'Não informado';

/**
 * Membros (manual 4.2): mensalistas e avulsos. Cada pessoa abre uma folha com o tipo, o nível de 1 a 5
 * e o botão de remover. Nível e gênero só o organizador vê; sem nível, conta como 3 no sorteio.
 */
export function MembersTab({ group }: { group: Group }) {
  const members = useMembers(group.id);
  const sports = useSports();
  const sheet = useSheetParam('membro');
  const [q, setQ] = useState('');
  if (members.isPending) return <SkeletonList rows={5} />;
  const all = members.data ?? [];
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtered = all.filter((m) => !q || norm(m.user.name).includes(norm(q)) || m.user.nickname.includes(norm(q)));
  const monthly = filtered.filter((m) => m.type === 'monthly');
  const dropIn = filtered.filter((m) => m.type === 'drop_in');
  const selected = all.find((m) => m.id === sheet.param('pessoa'));

  const row = (m: Member) => (
    <ListItem
      key={m.id}
      inline
      leading={<Avatar name={m.user.name} id={m.user.id} src={m.user.photoUrl} decorative />}
      title={m.user.name.split(' ')[0] ?? m.user.name}
      meta={
        positionLabels(sports.data, group.sportId, m.user.primaryPosition ? [m.user.primaryPosition] : []) ||
        (m.role === 'owner' ? 'Organiza' : undefined)
      }
      trailing={<span className={styles.value}>{levelText(m.level)}</span>}
      onClick={() => sheet.open({ pessoa: m.id })}
    />
  );

  return (
    <>
      <div className={styles.search}>
        <Search size={18} aria-hidden="true" className={styles.searchIcon} />
        <TextField
          label="Buscar membro"
          hideLabel
          placeholder={`Buscar entre ${all.length} membros`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
        />
      </div>
      {monthly.length > 0 && (
        <Section title={`Mensalistas · ${monthly.length}`}>
          <List>{monthly.map(row)}</List>
        </Section>
      )}
      <Section
        title={`Avulsos · ${dropIn.length}`}
        footnote="Nível e gênero só você vê. Sem nível, a pessoa conta como 3 no sorteio."
      >
        {dropIn.length ? (
          <List>{dropIn.map(row)}</List>
        ) : (
          <p className={styles.muted}>Nenhum avulso{q ? ' com esse nome' : ''}.</p>
        )}
      </Section>
      {selected && (
        <MemberSheet
          key={selected.id}
          group={group}
          member={selected}
          onClose={() => sheet.close(['pessoa'])}
          positions={positionLabels(
            sports.data,
            group.sportId,
            selected.user.primaryPosition ? [selected.user.primaryPosition] : [],
          )}
        />
      )}
    </>
  );
}

/** Folha do membro: tipo, nível e remover. Salva no OK. */
function MemberSheet({
  group,
  member,
  positions,
  onClose,
}: {
  group: Group;
  member: Member;
  positions: string;
  onClose: () => void;
}) {
  const update = useUpdateMember(group.id);
  const remove = useRemoveMember(group.id);
  const [type, setType] = useState<MembershipType>(member.type);
  const [level, setLevel] = useState<string>(member.level ? String(member.level) : '0');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const owner = member.role === 'owner';
  const [nextMonth] = useState(() => {
    const d = new Date(Date.now() - 3 * 3_600_000);
    d.setUTCMonth(d.getUTCMonth() + 1, 1);
    return d;
  });

  const save = () => {
    const patch: { type?: MembershipType; level?: number | null } = {};
    if (type !== member.type) patch.type = type;
    const lv = level === '0' ? null : Number(level);
    if (lv !== (member.level ?? null)) patch.level = lv;
    if (Object.keys(patch).length === 0) return onClose();
    update.mutate(
      { memberId: member.id, ...patch },
      {
        onSuccess: () => {
          toast('Salvo.', { tone: 'success' });
          onClose();
        },
      },
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={member.user.name.split(' ')[0] ?? member.user.name}
      closeLabel="Fechar"
      action={{ label: 'OK', onClick: save, loading: update.isPending }}
    >
      <div className={styles.who}>
        <Avatar name={member.user.name} id={member.user.id} src={member.user.photoUrl} size="lg" />
        <div>
          <p className={styles.gameTitle}>{member.user.name}</p>
          <p className={styles.muted}>
            {[
              positions,
              member.monthsOnTime
                ? `${member.monthsOnTime} ${member.monthsOnTime === 1 ? 'mês' : 'meses'} em dia`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>Tipo</span>
        <SegmentedControl<MembershipType>
          label="Tipo"
          options={[
            { value: 'monthly', label: MEMBERSHIP_LABEL.monthly },
            { value: 'drop_in', label: MEMBERSHIP_LABEL.drop_in },
          ]}
          value={type}
          onChange={setType}
        />
        <span className={styles.help}>
          Muda a partir da próxima mensalidade ({monthName(nextMonth.toISOString().slice(0, 7))}).
        </span>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>Nível nesta turma</span>
        <SegmentedControl
          label="Nível nesta turma"
          options={[
            { value: '0', label: '–' },
            ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
          ]}
          value={level}
          onChange={setLevel}
        />
        <span className={styles.help}>Só você vê. Usado para equilibrar os times. Sem nível conta como 3.</span>
      </div>
      <List>
        <ListItem inline title="Gênero" trailing={<span className={styles.value}>{genderText(member.gender)}</span>} />
        <ListItem
          inline
          title="Frequência"
          trailing={
            <span className={styles.value}>
              {member.attendanceRate === null || member.attendanceRate === undefined
                ? '—'
                : `${Math.round(member.attendanceRate * 100)}%`}
            </span>
          }
        />
      </List>
      {!owner && (
        <List>
          <ListItem tone="danger" title="Remover da turma" onClick={() => setConfirmRemove(true)} />
        </List>
      )}
      {confirmRemove && (
        <ConfirmSheet
          open
          onClose={() => setConfirmRemove(false)}
          title="Remover da turma?"
          leading={<Avatar name={member.user.name} id={member.user.id} src={member.user.photoUrl} size="lg" />}
          subject={member.user.name}
          consequences={[
            `${member.user.name.split(' ')[0]} sai dos próximos jogos da turma e libera a vaga.`,
            'O histórico de jogos e pagamentos continua guardado.',
            'Para voltar, precisa de um convite novo.',
          ]}
          actionLabel={`Remover ${member.user.name.split(' ')[0]}`}
          loading={remove.isPending}
          onConfirm={() =>
            remove.mutate(member.id, {
              onSuccess: () => {
                toast(`${member.user.name.split(' ')[0]} saiu da turma.`);
                setConfirmRemove(false);
                onClose();
              },
            })
          }
        />
      )}
    </Sheet>
  );
}
