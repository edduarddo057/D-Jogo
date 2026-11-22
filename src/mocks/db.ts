import type { Schema } from '@/lib/http';
import { shortDate } from './domain/format';

/**
 * "Banco" em memória dos mocks, com o exemplo do manual de usabilidade: a turma **Vôlei de sábado**
 * (16 membros, sábado às 9h no Clube Alto da Lapa, 12 vagas, avulso R$ 25, mensalista R$ 80/mês),
 * organizada pela Marina. Datas relativas a "agora", para os jogos estarem sempre no futuro em dev.
 * Regras de vaga, fila e prazos ficam em ./domain (mesmas regras do back-end, RN-xx).
 */
type MembershipType = Schema<'MembershipType'>;
type ParticipationStatus = Schema<'ParticipationStatus'>;
type MatchStatus = Schema<'MatchStatus'>;
type PaymentStatus = Schema<'PaymentStatus'>;
type NotificationKind = Schema<'Notification'>['kind'];
type NotificationCategory = Schema<'NotificationCategory'>;
type LedgerCategory = Schema<'LedgerCategory'>;

export type Gender = 'male' | 'female';
export interface DbUser {
  id: string;
  phone: string;
  name: string;
  nickname: string;
  photoUrl: string | null;
  profileCompleted: boolean;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  /** Opcional, só para o sorteio misto (RN-03a). */
  gender: Gender | null;
  sportProfile: { sportId: string; positions: string[] } | null;
  notificationSettings: Schema<'NotificationSettings'>;
}
export interface DbGroupRules {
  waitlistAutoPromote: boolean;
  dropInPaymentWindowMinutes: number;
  monthlyResponseDeadline: { daysBefore: number; time: string };
  autoReleaseUnanswered: boolean;
  /** Novo na 2.0 (RN-20b). */
  listOpens: { daysBefore: number; time: string };
  /** Novo na 2.0 (RN-28a). */
  withdrawalDeadlineHours: number;
}
export interface DbGroup {
  id: string;
  name: string;
  sportId: string;
  ownerId: string;
  location: { name: string; address: string | null; mapsUrl: string | null };
  /** Dias fixos, cada um com o seu horário (vazio = a combinar). */
  schedules: Array<{ weekday: number; startTime: string; endTime: string }>;
  defaultCapacity: number;
  monthlyFeeCents: number;
  monthlyFeeDueDay: number;
  dropInFeeCents: number;
  pix: { key: string; holderName: string; bank: string | null } | null;
  timezone: string;
  rules: DbGroupRules;
  archivedAt: string | null;
}
export interface DbMembership {
  id: string;
  groupId: string;
  userId: string;
  type: MembershipType;
  status: 'active' | 'removed' | 'left';
  joinedAt: string;
  /** Nível na turma, definido pelo dono (RN-17). null = 3 no sorteio. */
  level: number | null;
  /** Notas de 1 a 10 nos fundamentos da modalidade, definidas pelo dono (RN-17a). */
  skills: Record<string, number> | null;
}
export interface DbInvite {
  code: string;
  groupId: string;
  matchId: string | null;
  membershipType: MembershipType;
  note: string | null;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
export interface DbMatch {
  id: string;
  groupId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: DbGroup['location'];
  capacity: number;
  dropInFeeCents: number;
  responseDeadline: string;
  /** Quando a lista abre (RN-20b); null = abriu ao publicar. */
  listOpensAt: string | null;
  /** Desistir sem penalidade até aqui (RN-28a). */
  withdrawalDeadline: string | null;
  repeatsWeekly: boolean;
  seriesId: string | null;
  status: MatchStatus;
  cancelReason: string | null;
  /** Aviso "Lista aberta" já enviado. */
  openNotified: boolean;
}
export interface DbParticipation {
  id: string;
  matchId: string;
  userId: string;
  membershipType: MembershipType;
  status: ParticipationStatus;
  source: 'auto' | 'self' | 'organizer' | 'invite';
  waitlistedAt: string | null;
  offeredAt: string | null;
  paymentDeadline: string | null;
  respondedAt: string | null;
  paymentId: string | null;
  /** Desistiu depois do prazo sem penalidade (RN-28a). */
  lateWithdrawal: boolean;
}
export interface DbPayment {
  id: string;
  groupId: string;
  userId: string;
  kind: 'match_fee' | 'monthly_fee';
  matchId: string | null;
  referenceMonth: string | null;
  amountCents: number;
  status: PaymentStatus;
  method: 'pix' | 'cash' | 'other' | null;
  reportedAt: string | null;
  reportNote: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  /** Estado antes da última decisão do dono, para o Desfazer (RN-66). */
  prevStatus: PaymentStatus | null;
}
export interface DbLedgerEntry {
  id: string;
  groupId: string;
  direction: 'in' | 'out';
  amountCents: number;
  description: string;
  occurredOn: string;
  source: 'payment' | 'manual' | 'reversal';
  paymentId: string | null;
  category: LedgerCategory;
  method: 'pix' | 'cash' | 'other' | null;
  reviewedById: string | null;
  reversalOf: string | null;
  reversedBy: string | null;
}
export interface DrawCriteria {
  level: boolean;
  gender: boolean;
  position: boolean;
  /** Com `level`: nível geral (padrão) ou fundamentos (RN-103a). */
  levelBy?: 'overall' | 'skills';
}
export interface DbLiveTeam {
  id: string;
  name: string;
  colorIndex: number;
  memberIds: string[];
}
export interface DbLiveDraw {
  id: string;
  matchId: string;
  createdAt: string;
  teamCount: number;
  playersPerTeam: number;
  criteria: DrawCriteria;
  teams: DbLiveTeam[];
  bench: string[];
  clientId: string | null;
}
export interface DbLiveSession {
  matchId: string;
  startedAt: string;
  arrivedUserIds: string[];
  lastDrawSettings: { teamCount: number; playersPerTeam: number; criteria: DrawCriteria };
}
export interface DbRound {
  id: string;
  matchId: string;
  drawId: string;
  number: number;
  finishedAt: string;
  teams: Array<{ teamId: string; name: string; colorIndex: number; score: number; memberIds: string[] }>;
  winnerTeamId: string;
  scorers: Array<{ userId: string; points: number }>;
  clientId: string | null;
}
export interface DbNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  category: NotificationCategory;
  title: string;
  detail: string;
  createdAt: string;
  readAt: string | null;
  count: number;
  groupId: string | null;
  matchId: string | null;
  paymentId: string | null;
}
export interface DbReminder {
  id: string;
  notificationIds: string[];
}

// ── Datas (fuso da turma: America/Sao_Paulo, UTC−3)
const BRT = 3;
/** Próximo dia da semana (0 = domingo) às HH:MM em Brasília. */
export function nextWeekdayAt(weekday: number, time: string, weeksAhead = 0, from = new Date()): Date {
  const [h, min] = time.split(':').map(Number) as [number, number];
  const local = new Date(from.getTime() - BRT * 3_600_000);
  const diff = (weekday - local.getUTCDay() + 7) % 7 || 7;
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + diff + weeksAhead * 7));
  d.setUTCHours(h + BRT, min, 0, 0);
  return d;
}
/** Dia local do instante, às HH:MM em Brasília, `daysBefore` dias antes. */
export function localTimeBefore(instant: string, daysBefore: number, time: string): Date {
  const localDay = new Date(new Date(instant).getTime() - BRT * 3_600_000).toISOString().slice(0, 10);
  const base = new Date(`${localDay}T${time}:00-03:00`).getTime();
  return new Date(base - daysBefore * 86_400_000);
}
const iso = (d: Date) => d.toISOString();
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
const monthOf = (d: Date) => new Date(d.getTime() - BRT * 3_600_000).toISOString().slice(0, 7);

// ── Pessoas: [id, nome, apelido, posição, nível no Vôlei de sábado, gênero, tipo no sábado]
type Person = [string, string, string, string, number | null, Gender | null, MembershipType | null];
const PEOPLE: Person[] = [
  ['u_marina', 'Marina Costa', 'marina', 'setter', 4, 'female', 'monthly'],
  ['u_fe', 'Fê Reis', 'fe.reis', 'outside', 4, 'female', 'monthly'],
  ['u_otavio', 'Otávio Prado', 'otavio', 'middle', 4, 'male', 'monthly'],
  ['u_bruno', 'Bruno Teixeira', 'bruninho', 'outside', 5, 'male', 'monthly'],
  ['u_carol', 'Carol Melo', 'carol', 'opposite', 3, 'female', 'monthly'],
  ['u_diego', 'Diego Alves', 'diego', 'setter', 3, 'male', 'monthly'],
  ['u_lia', 'Lia Nogueira', 'lia', 'libero', 3, 'female', 'monthly'],
  ['u_rafa', 'Rafa Souza', 'rafa', 'middle', 3, 'male', 'monthly'],
  ['u_tati', 'Tati Lopes', 'tati', 'outside', 2, 'female', 'monthly'],
  ['u_gui', 'Gui Dias', 'gui', 'opposite', 4, 'male', 'monthly'],
  ['u_hugo', 'Hugo Martins', 'hugo', 'libero', null, 'male', 'monthly'],
  ['u_dudu', 'Eduardo Lima', 'dudu.lima', 'outside', 3, 'male', 'drop_in'],
  ['u_samuel', 'Samuel Rocha', 'samuel', 'middle', 2, 'male', 'drop_in'],
  ['u_pedro', 'Pedro Vieira', 'pedro', 'setter', 3, 'male', 'drop_in'],
  ['u_vini', 'Vini Ramos', 'vini', 'outside', null, null, 'drop_in'],
  ['u_caio', 'Caio Ferreira', 'caio', 'opposite', 3, 'male', 'drop_in'],
  // fora de qualquer turma: para testar convites
  ['u_sofia', 'Sofia Andrade', 'sofia', 'outside', null, 'female', null],
];
export const PHONES: Record<string, string> = {
  u_marina: '+5511987654321',
  u_dudu: '+5511988887777',
  u_vini: '+5511977776666',
  u_otavio: '+5511966665555',
  u_sofia: '+5511955554444',
};

const ALL_ON: Schema<'NotificationSettings'> = {
  lists: true,
  payments: true,
  waitlist: true,
  organizer: true,
  day_summary: false,
};

const DEFAULT_RULES: DbGroupRules = {
  // valores atuais da v1 (mantidos)
  waitlistAutoPromote: true,
  dropInPaymentWindowMinutes: 120,
  monthlyResponseDeadline: { daysBefore: 1, time: '18:00' },
  autoReleaseUnanswered: false,
  // novos na 2.0 (manual: lista abre 3 dias antes; desistir sem penalidade até 24h antes)
  listOpens: { daysBefore: 3, time: '09:00' },
  withdrawalDeadlineHours: 24,
};
export const defaultRules = (): DbGroupRules => structuredClone(DEFAULT_RULES);

/**
 * Notas de exemplo nos fundamentos do vôlei (RN-17a), a partir do nível e da posição: levantador
 * levanta melhor, líbero recebe e passa melhor, oposto ataca melhor… Sem nível, sem notas.
 */
const SKILL_BIAS: Record<string, Partial<Record<string, number>>> = {
  setter: { setting: 3, attack: -2, pass: 1 },
  outside: { attack: 1, reception: 1 },
  opposite: { attack: 2, reception: -2, serve: 1 },
  middle: { attack: 1, reception: -2, setting: -1 },
  libero: { reception: 3, pass: 2, attack: -3, setting: -1 },
};
export function sampleSkills(level: number | null, position: string | null, seed = 0): Record<string, number> | null {
  if (!level) return null;
  const base = level * 2;
  const wobble = (k: number) => ((seed * 7 + k * 3) % 3) - 1; // −1, 0 ou +1, sempre igual para a mesma pessoa
  return Object.fromEntries(
    ['serve', 'reception', 'attack', 'setting', 'pass'].map((k, i) => [
      k,
      Math.min(10, Math.max(1, base + (SKILL_BIAS[position ?? '']?.[k] ?? 0) + wobble(i))),
    ]),
  );
}
export { ALL_ON as allNotificationsOn };

/** Gerador pseudoaleatório fixo, para os dados de exemplo serem sempre iguais. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function seed() {
  const now = new Date();
  const users: DbUser[] = PEOPLE.map(([id, name, nickname, position, , gender], i) => ({
    id,
    phone: PHONES[id] ?? `+55119${String(90000000 + i * 1111).padStart(8, '0')}`,
    name,
    nickname,
    photoUrl: null,
    profileCompleted: true,
    termsVersion: '2026-11',
    termsAcceptedAt: '2026-11-21T12:00:00Z',
    gender,
    sportProfile: { sportId: 'volleyball', positions: [position] },
    notificationSettings: { ...ALL_ON },
  }));

  const sabado: DbGroup = {
    id: 'g_sabado',
    name: 'Vôlei de sábado',
    sportId: 'volleyball',
    ownerId: 'u_marina',
    location: { name: 'Clube Alto da Lapa', address: 'Quadra coberta · R. Guaicurus, 1500', mapsUrl: null },
    schedules: [{ weekday: 6, startTime: '09:00', endTime: '11:00' }],
    defaultCapacity: 12,
    monthlyFeeCents: 8000,
    monthlyFeeDueDay: 10,
    dropInFeeCents: 2500,
    pix: { key: 'volei.sabado@dajogo.app', holderName: 'Marina Costa', bank: null },
    timezone: 'America/Sao_Paulo',
    // exemplo do manual: lista abre seg, 9h; responda até sex, 9h
    rules: {
      ...defaultRules(),
      listOpens: { daysBefore: 5, time: '09:00' },
      monthlyResponseDeadline: { daysBefore: 1, time: '09:00' },
    },
    archivedAt: null,
  };
  const quarta: DbGroup = {
    id: 'g_quarta',
    name: 'Vôlei de quarta',
    sportId: 'volleyball',
    ownerId: 'u_otavio',
    location: { name: 'Ginásio Pinheiros', address: 'R. Cardeal Arcoverde, 1200', mapsUrl: null },
    schedules: [{ weekday: 3, startTime: '20:00', endTime: '22:00' }],
    defaultCapacity: 12,
    monthlyFeeCents: 9000,
    monthlyFeeDueDay: 10,
    dropInFeeCents: 3000,
    pix: { key: 'otavio.prado@email.com', holderName: 'Otávio Prado', bank: null },
    timezone: 'America/Sao_Paulo',
    rules: defaultRules(),
    archivedAt: null,
  };
  const groups = [sabado, quarta];

  const joinedAt = '2026-03-07T12:00:00Z';
  const memberships: DbMembership[] = PEOPLE.filter((p) => p[6]).map(([userId, , , position, level, , type], i) => ({
    id: `mb_sab_${userId}`,
    groupId: 'g_sabado',
    userId,
    type: type as MembershipType,
    status: 'active' as const,
    joinedAt: userId === 'u_marina' ? '2026-02-01T12:00:00Z' : joinedAt,
    level,
    skills: sampleSkills(level, position, i),
  }));
  const QUARTA: Array<[string, MembershipType]> = [
    ['u_otavio', 'monthly'],
    ['u_marina', 'drop_in'],
    ['u_dudu', 'monthly'],
    ['u_fe', 'monthly'],
    ['u_gui', 'monthly'],
    ['u_lia', 'drop_in'],
    ['u_bruno', 'drop_in'],
  ];
  memberships.push(
    ...QUARTA.map(([userId, type]) => ({
      id: `mb_qua_${userId}`,
      groupId: 'g_quarta',
      userId,
      type,
      status: 'active' as const,
      joinedAt,
      level: null,
      skills: null,
    })),
  );

  // ── Jogos do Vôlei de sábado
  const sat = (weeks: number) => nextWeekdayAt(6, '09:00', weeks, now);
  const baseMatch = (
    id: string,
    g: DbGroup,
    start: Date,
    status: MatchStatus,
    over: Partial<DbMatch> = {},
  ): DbMatch => {
    const startsAt = iso(start);
    const listOpensAt = iso(localTimeBefore(startsAt, g.rules.listOpens.daysBefore, g.rules.listOpens.time));
    return {
      id,
      groupId: g.id,
      title: g.name,
      startsAt,
      endsAt: iso(addHours(start, 2)),
      location: g.location,
      capacity: g.defaultCapacity,
      dropInFeeCents: g.dropInFeeCents,
      responseDeadline: iso(
        localTimeBefore(startsAt, g.rules.monthlyResponseDeadline.daysBefore, g.rules.monthlyResponseDeadline.time),
      ),
      listOpensAt,
      withdrawalDeadline: iso(addHours(start, -g.rules.withdrawalDeadlineHours)),
      repeatsWeekly: true,
      seriesId: `s_${g.id}`,
      status,
      cancelReason: null,
      openNotified: true,
      ...over,
    };
  };
  const next = sat(0);
  const clampOpen = (m: DbMatch) => {
    // o próximo jogo do exemplo já está com a lista aberta
    if (m.listOpensAt && m.listOpensAt > iso(now)) m.listOpensAt = iso(addHours(now, -2));
    return m;
  };
  const matches: DbMatch[] = [
    clampOpen(baseMatch('m_sab', sabado, next, 'open')),
    baseMatch('m_sab_2', sabado, sat(1), 'open', { openNotified: false }),
    baseMatch('m_sab_rascunho', sabado, sat(2), 'draft', { openNotified: false }),
    baseMatch('m_sab_p1', sabado, sat(-1), 'finished'),
    baseMatch('m_sab_p2', sabado, sat(-2), 'finished'),
    baseMatch('m_sab_p3', sabado, sat(-3), 'finished'),
    baseMatch('m_sab_p4', sabado, sat(-4), 'finished'),
    clampOpen(baseMatch('m_qua', quarta, nextWeekdayAt(3, '20:00', 0, now), 'open')),
    baseMatch('m_qua_p1', quarta, nextWeekdayAt(3, '20:00', -1, now), 'finished'),
  ];
  // o 2º sábado abre na segunda às 9h, só se ainda estiver no futuro
  const second = matches[1];
  if (second?.listOpensAt && second.listOpensAt < iso(now)) second.openNotified = true;

  const part = (
    matchId: string,
    userId: string,
    type: MembershipType,
    status: ParticipationStatus,
    over: Partial<DbParticipation> = {},
  ): DbParticipation => ({
    id: `p_${matchId}_${userId}`,
    matchId,
    userId,
    membershipType: type,
    status,
    source: type === 'monthly' ? 'auto' : 'self',
    waitlistedAt: null,
    offeredAt: null,
    paymentDeadline: null,
    respondedAt: status === 'pending' ? null : iso(addHours(now, -20)),
    paymentId: null,
    lateWithdrawal: false,
    ...over,
  });
  const typeIn = (groupId: string, userId: string) =>
    memberships.find((m) => m.groupId === groupId && m.userId === userId)?.type ?? 'drop_in';

  // Próximo sábado (12 vagas, cheio): 5 vão, 5 sem resposta, Gui não vai, Dudu e Samuel avulsos
  // ocupando vaga (Dudu precisa pagar; Samuel mandou o Pix), Pedro e Vini na fila.
  const NEXT: Record<string, ParticipationStatus> = {
    u_fe: 'confirmed',
    u_otavio: 'confirmed',
    u_bruno: 'confirmed',
    u_diego: 'confirmed',
    u_rafa: 'confirmed',
    u_marina: 'pending',
    u_carol: 'pending',
    u_tati: 'pending',
    u_hugo: 'pending',
    u_lia: 'pending',
    u_gui: 'declined',
    u_dudu: 'awaiting_payment',
    u_samuel: 'awaiting_payment',
    u_pedro: 'waitlisted',
    u_vini: 'waitlisted',
  };
  const participations: DbParticipation[] = Object.entries(NEXT).map(([userId, status], i) =>
    part('m_sab', userId, typeIn('g_sabado', userId), status, {
      ...(status === 'waitlisted' && { waitlistedAt: iso(addHours(now, -10 + i * 0.1)) }),
    }),
  );
  // 2º sábado: lista ainda fechada; mensalistas já têm a vaga reservada
  participations.push(
    ...memberships
      .filter((m) => m.groupId === 'g_sabado' && m.type === 'monthly')
      .map((m) => part('m_sab_2', m.userId, 'monthly', 'pending')),
  );

  const payments: DbPayment[] = [];
  const pay = (over: Partial<DbPayment> & Pick<DbPayment, 'id' | 'groupId' | 'userId' | 'kind' | 'amountCents'>) => {
    const p: DbPayment = {
      matchId: null,
      referenceMonth: null,
      status: 'pending',
      method: null,
      reportedAt: null,
      reportNote: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: iso(addHours(now, -30)),
      prevStatus: null,
      ...over,
    };
    payments.push(p);
    return p;
  };
  const dudu = participations.find((p) => p.matchId === 'm_sab' && p.userId === 'u_dudu');
  if (dudu) {
    // "Pague R$ 25 até sex, 21h"
    dudu.offeredAt = iso(addHours(now, -3));
    dudu.paymentDeadline = iso(localTimeBefore(iso(next), 1, '21:00'));
    dudu.paymentId = pay({
      id: 'pay_dudu_sab',
      groupId: 'g_sabado',
      userId: 'u_dudu',
      kind: 'match_fee',
      matchId: 'm_sab',
      amountCents: 2500,
    }).id;
  }
  const samuel = participations.find((p) => p.matchId === 'm_sab' && p.userId === 'u_samuel');
  if (samuel) {
    samuel.offeredAt = iso(addHours(now, -6));
    samuel.paymentDeadline = iso(addHours(now, -4));
    samuel.paymentId = pay({
      id: 'pay_samuel_sab',
      groupId: 'g_sabado',
      userId: 'u_samuel',
      kind: 'match_fee',
      matchId: 'm_sab',
      amountCents: 2500,
      status: 'reported',
      method: 'pix',
      reportedAt: iso(addHours(now, -5)),
      reportNote: 'comprovante.png',
    }).id;
  }

  // Quarta: Marina é avulsa e precisa pagar R$ 30; Dudu (mensalista) ainda não respondeu
  const marinaQua = part('m_qua', 'u_marina', 'drop_in', 'awaiting_payment', {
    offeredAt: iso(addHours(now, -0.2)),
    paymentDeadline: iso(addHours(now, 1.8)),
  });
  marinaQua.paymentId = pay({
    id: 'pay_marina_qua',
    groupId: 'g_quarta',
    userId: 'u_marina',
    kind: 'match_fee',
    matchId: 'm_qua',
    amountCents: 3000,
  }).id;
  participations.push(
    part('m_qua', 'u_otavio', 'monthly', 'confirmed'),
    part('m_qua', 'u_fe', 'monthly', 'confirmed'),
    part('m_qua', 'u_gui', 'monthly', 'confirmed'),
    part('m_qua', 'u_dudu', 'monthly', 'pending'),
    part('m_qua', 'u_lia', 'drop_in', 'confirmed'),
    marinaQua,
    part('m_qua_p1', 'u_marina', 'drop_in', 'confirmed'),
    part('m_qua_p1', 'u_otavio', 'monthly', 'confirmed'),
    part('m_qua_p1', 'u_fe', 'monthly', 'confirmed'),
  );
  pay({
    id: 'pay_marina_qua_p1',
    groupId: 'g_quarta',
    userId: 'u_marina',
    kind: 'match_fee',
    matchId: 'm_qua_p1',
    amountCents: 3000,
    status: 'paid',
    method: 'pix',
    reportedAt: iso(addHours(now, -24 * 8)),
    reviewedAt: iso(addHours(now, -24 * 7.9)),
    rejectionReason: 'Valor diferente',
    createdAt: iso(addHours(now, -24 * 9)),
  });

  // ── Sábados passados: quem foi, quem avisou antes e a desistência tardia
  const saturdayMembers = memberships.filter((m) => m.groupId === 'g_sabado').map((m) => m.userId);
  const PAST: Record<string, { absent: string[]; late: string[] }> = {
    m_sab_p1: { absent: ['u_gui', 'u_hugo', 'u_vini'], late: [] },
    m_sab_p2: { absent: ['u_carol', 'u_caio', 'u_samuel'], late: [] },
    m_sab_p3: { absent: ['u_marina', 'u_tati', 'u_pedro'], late: [] },
    m_sab_p4: { absent: ['u_lia', 'u_diego'], late: ['u_marina'] },
  };
  for (const [matchId, { absent, late }] of Object.entries(PAST)) {
    const m = matches.find((x) => x.id === matchId);
    const going = saturdayMembers.filter((id) => !absent.includes(id) && !late.includes(id)).slice(0, 12);
    for (const userId of saturdayMembers) {
      const type = typeIn('g_sabado', userId);
      if (going.includes(userId)) participations.push(part(matchId, userId, type, 'confirmed'));
      else if (late.includes(userId) && m)
        participations.push(
          part(matchId, userId, type, type === 'monthly' ? 'declined' : 'left', {
            lateWithdrawal: true,
            respondedAt: iso(addHours(new Date(m.startsAt), -3)),
          }),
        );
      else if (absent.includes(userId) && type === 'monthly')
        participations.push(
          part(matchId, userId, type, 'declined', { respondedAt: m ? iso(addHours(new Date(m.startsAt), -72)) : null }),
        );
    }
  }

  // ── Mensalidades (o dono não se cobra). Atrasada = pendente depois do dia 10.
  const localNow = new Date(now.getTime() - BRT * 3_600_000);
  const currentMonth = monthOf(now);
  const pastDue = localNow.getUTCDate() > sabado.monthlyFeeDueDay;
  const overdueMonth = pastDue
    ? currentMonth
    : monthOf(new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() - 1, 15)));
  const monthlyIds = memberships
    .filter((m) => m.groupId === 'g_sabado' && m.type === 'monthly' && m.userId !== 'u_marina')
    .map((m) => m.userId);
  const GAPS: Record<string, number[]> = { u_carol: [3], u_tati: [2], u_hugo: [4] };
  const ledger: DbLedgerEntry[] = [];
  const entry = (
    e: Partial<DbLedgerEntry> &
      Pick<DbLedgerEntry, 'id' | 'direction' | 'amountCents' | 'description' | 'occurredOn' | 'category'>,
  ) => {
    ledger.push({
      groupId: 'g_sabado',
      source: 'manual',
      paymentId: null,
      method: null,
      reviewedById: null,
      reversalOf: null,
      reversedBy: null,
      ...e,
    });
  };
  const firstName = (id: string) => users.find((u) => u.id === id)?.name.split(' ')[0] ?? '';
  for (let back = 6; back >= 0; back -= 1) {
    const d = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() - back, 8, 15));
    const ref = monthOf(d);
    for (const userId of monthlyIds) {
      const late = ref === overdueMonth && ['u_carol', 'u_tati'].includes(userId);
      // furos antigos: pagos, mas depois do vencimento (quebram a sequência de "mais pontuais")
      const paidLate = GAPS[userId]?.includes(back) ?? false;
      const reported = back === 0 && userId === 'u_gui';
      if (back === 0 && !pastDue && !reported && !late) {
        // mês atual antes do vencimento: quem já pagou, pagou
        if (['u_hugo', 'u_lia'].includes(userId)) {
          pay({
            id: `pay_mes_${ref}_${userId}`,
            groupId: 'g_sabado',
            userId,
            kind: 'monthly_fee',
            referenceMonth: ref,
            amountCents: 8000,
            createdAt: iso(d),
          });
          continue;
        }
      }
      const status: PaymentStatus = reported ? 'reported' : late ? 'pending' : 'paid';
      const p = pay({
        id: `pay_mes_${ref}_${userId}`,
        groupId: 'g_sabado',
        userId,
        kind: 'monthly_fee',
        referenceMonth: ref,
        amountCents: 8000,
        status,
        method: status === 'pending' ? null : 'pix',
        reportedAt: reported ? iso(addHours(now, -8)) : null,
        reportNote: reported ? 'pix-gui.pdf' : null,
        reviewedAt: status === 'paid' ? iso(paidLate ? addHours(d, 24 * 20) : d) : null,
        createdAt: iso(d),
      });
      if (p.status === 'paid')
        entry({
          id: `led_${p.id}`,
          direction: 'in',
          amountCents: p.amountCents,
          description: `Mensalidade · ${firstName(userId)}`,
          occurredOn: (p.reviewedAt ?? iso(d)).slice(0, 10),
          source: 'payment',
          paymentId: p.id,
          category: 'fee',
          method: 'pix',
          reviewedById: 'u_marina',
        });
    }
    // aluguel da quadra no começo de cada mês
    const rentDay = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() - back, 2, 15));
    if (rentDay <= now)
      entry({
        id: `led_rent_${ref}`,
        direction: 'out',
        amountCents: 64000,
        description: 'Aluguel da quadra',
        occurredOn: iso(rentDay).slice(0, 10),
        category: 'rent',
      });
  }
  // avulsos dos sábados passados (um em dinheiro) e compras
  ['m_sab_p1', 'm_sab_p2', 'm_sab_p3'].forEach((matchId, k) => {
    const m = matches.find((x) => x.id === matchId);
    if (!m) return;
    const day = m.startsAt.slice(0, 10);
    for (const userId of ['u_samuel', 'u_pedro', 'u_caio', 'u_dudu', 'u_vini']) {
      const went = participations.some((p) => p.matchId === matchId && p.userId === userId && p.status === 'confirmed');
      if (!went) continue;
      const cash = k === 0 && userId === 'u_samuel';
      const p = pay({
        id: `pay_${matchId}_${userId}`,
        groupId: 'g_sabado',
        userId,
        kind: 'match_fee',
        matchId,
        amountCents: 2500,
        status: 'paid',
        method: cash ? 'cash' : 'pix',
        reviewedAt: `${day}T15:00:00Z`,
        createdAt: `${day}T10:00:00Z`,
        rejectionReason: userId === 'u_dudu' && k === 1 ? 'Valor diferente' : null,
      });
      entry({
        id: `led_${p.id}`,
        direction: 'in',
        amountCents: 2500,
        description: `Avulso · ${firstName(userId)}`,
        occurredOn: day,
        source: 'payment',
        paymentId: p.id,
        category: 'fee',
        method: p.method,
        reviewedById: 'u_marina',
      });
    }
  });
  entry({
    id: 'led_bola',
    direction: 'out',
    amountCents: 28990,
    description: 'Bola Mikasa V200W',
    occurredOn: iso(addHours(now, -24 * 40)).slice(0, 10),
    category: 'ball',
  });
  entry({
    id: 'led_coletes',
    direction: 'out',
    amountCents: 15000,
    description: 'Coletes',
    occurredOn: iso(addHours(now, -24 * 12)).slice(0, 10),
    category: 'bibs',
  });

  // ── Dia de jogo dos sábados passados: rodadas para o Resumo do dia
  const liveSessions: DbLiveSession[] = [];
  const liveDraws: DbLiveDraw[] = [];
  const rounds: DbRound[] = [];
  const random = seeded(42);
  const SCORES: Array<[number, number]> = [
    [25, 19],
    [21, 25],
    [25, 22],
    [25, 17],
    [23, 25],
    [25, 20],
  ];
  ['m_sab_p1', 'm_sab_p2'].forEach((matchId, k) => {
    const m = matches.find((x) => x.id === matchId);
    if (!m) return;
    const present = participations
      .filter((p) => p.matchId === matchId && p.status === 'confirmed')
      .map((p) => p.userId);
    liveSessions.push({
      matchId,
      startedAt: m.startsAt,
      arrivedUserIds: present,
      lastDrawSettings: { teamCount: 2, playersPerTeam: 6, criteria: { level: true, gender: true, position: false } },
    });
    // "Vencedor fica": o time A continua junto enquanto vence; quando perde, é desfeito e sorteado de novo
    let keep: string[] | null = null;
    for (let r = 0; r < (k === 0 ? 6 : 5); r += 1) {
      const kept: string[] | null = keep;
      const shuffled: string[] = kept
        ? [...kept, ...present.filter((id) => !kept.includes(id)).sort(() => random() - 0.5)]
        : present.slice().sort(() => random() - 0.5);
      const a: string[] = shuffled.slice(0, 6);
      const b = shuffled.slice(6, 12);
      // a Marina é destaque no 2º sábado passado; o Bruninho no último
      const star = k === 0 ? 'u_bruno' : 'u_marina';
      if (!a.includes(star) && present.includes(star)) {
        const i = b.indexOf(star);
        if (i >= 0) [a[0], b[i]] = [star, a[0] as string];
      }
      const drawId = `ld_${matchId}_${r}`;
      const teams = [
        { id: `lt_${drawId}_a`, name: 'Time A', colorIndex: 0, memberIds: a },
        { id: `lt_${drawId}_b`, name: 'Time B', colorIndex: 1, memberIds: b },
      ];
      liveDraws.push({
        id: drawId,
        matchId,
        createdAt: m.startsAt,
        teamCount: 2,
        playersPerTeam: 6,
        criteria: { level: true, gender: true, position: false },
        teams,
        bench: shuffled.slice(12),
        clientId: null,
      });
      const [sa, sb] = SCORES[r] ?? [25, 20];
      const aWins = r === 1 || r === 4 ? sa > sb : true;
      const scoreA = aWins ? Math.max(sa, sb) : Math.min(sa, sb);
      const scoreB = aWins ? Math.min(sa, sb) : Math.max(sa, sb);
      rounds.push({
        id: `rd_${matchId}_${r}`,
        matchId,
        drawId,
        number: r + 1,
        finishedAt: iso(addHours(new Date(m.startsAt), 0.3 * (r + 1))),
        teams: teams.map((t, i) => ({
          teamId: t.id,
          name: t.name,
          colorIndex: t.colorIndex,
          score: i === 0 ? scoreA : scoreB,
          memberIds: t.memberIds,
        })),
        winnerTeamId: aWins ? (teams[0]?.id ?? '') : (teams[1]?.id ?? ''),
        scorers: r % 2 === 0 ? [{ userId: star, points: 4 + r }] : [],
        clientId: null,
      });
      keep = aWins ? a : null;
    }
  });

  const invites: DbInvite[] = [
    {
      code: 'SABADO25',
      groupId: 'g_sabado',
      matchId: null,
      membershipType: 'drop_in',
      note: null,
      uses: 5,
      maxUses: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: '2026-03-07T12:00:00Z',
    },
  ];

  // ── Avisos de exemplo
  const notifications: DbNotification[] = [];
  const notif = (
    userId: string,
    n: Omit<DbNotification, 'id' | 'userId' | 'count' | 'readAt'> & { read?: boolean },
  ) => {
    const { read, ...rest } = n;
    notifications.push({
      id: `n_${notifications.length + 1}`,
      userId,
      count: 1,
      readAt: read ? rest.createdAt : null,
      ...rest,
    });
  };
  notif('u_marina', {
    kind: 'list_opened',
    category: 'lists',
    title: 'Lista aberta: Vôlei de sábado',
    detail: `${shortDate(iso(next))} · responda até sex, 9h`,
    createdAt: iso(addHours(now, -2)),
    groupId: 'g_sabado',
    matchId: 'm_sab',
    paymentId: null,
  });
  notif('u_marina', {
    kind: 'payment_due',
    category: 'payments',
    title: 'Pague para garantir a vaga',
    detail: 'Vôlei de quarta · R$ 30',
    createdAt: iso(addHours(now, -0.2)),
    groupId: 'g_quarta',
    matchId: 'm_qua',
    paymentId: 'pay_marina_qua',
  });
  notif('u_marina', {
    kind: 'payments_to_review',
    category: 'organizer',
    title: '2 pagamentos para conferir',
    detail: 'Vôlei de sábado · resolva na aba Organizar',
    createdAt: iso(addHours(now, -5)),
    groupId: 'g_sabado',
    matchId: null,
    paymentId: null,
  });
  notif('u_marina', {
    kind: 'day_summary_ready',
    category: 'day_summary',
    title: 'Resumo do dia pronto',
    detail: 'Vôlei de sábado',
    createdAt: iso(addHours(new Date(matches[3]?.startsAt ?? iso(now)), 3)),
    groupId: 'g_sabado',
    matchId: 'm_sab_p1',
    paymentId: null,
    read: true,
  });
  notif('u_marina', {
    kind: 'payment_approved',
    category: 'payments',
    title: 'Pagamento aprovado',
    detail: 'Vôlei de quarta',
    createdAt: iso(addHours(now, -24 * 7.9)),
    groupId: 'g_quarta',
    matchId: 'm_qua_p1',
    paymentId: 'pay_marina_qua_p1',
    read: true,
  });
  notif('u_marina', {
    kind: 'payment_rejected',
    category: 'payments',
    title: 'Pagamento recusado: valor diferente',
    detail: 'Vôlei de quarta · envie de novo',
    createdAt: iso(addHours(now, -24 * 8.1)),
    groupId: 'g_quarta',
    matchId: 'm_qua_p1',
    paymentId: 'pay_marina_qua_p1',
    read: true,
  });
  notif('u_dudu', {
    kind: 'payment_due',
    category: 'payments',
    title: 'Pague para garantir a vaga',
    detail: 'Vôlei de sábado · R$ 25 até sex, 21h',
    createdAt: iso(addHours(now, -3)),
    groupId: 'g_sabado',
    matchId: 'm_sab',
    paymentId: 'pay_dudu_sab',
  });
  notif('u_dudu', {
    kind: 'list_opened',
    category: 'lists',
    title: 'Lista aberta: Vôlei de quarta',
    detail: `${shortDate(matches.find((x) => x.id === 'm_qua')?.startsAt ?? iso(now))} · responda até ter, 18h`,
    createdAt: iso(addHours(now, -4)),
    groupId: 'g_quarta',
    matchId: 'm_qua',
    paymentId: null,
  });

  return {
    users,
    groups,
    memberships,
    invites,
    matches,
    participations,
    payments,
    ledger,
    liveSessions,
    liveDraws,
    rounds,
    notifications,
    reminders: [] as DbReminder[],
    /** Sessão simulada: quem está logado (null = deslogado). */
    session: { userId: 'u_marina' as string | null },
    otp: new Map<string, { phone: string; code: string }>(),
  };
}

export type Db = ReturnType<typeof seed>;
export let db: Db = seed();

/** Recria os dados (usado entre testes). */
export function resetDb(overrides: Partial<Pick<Db, 'session'>> = {}): Db {
  db = seed();
  Object.assign(db, overrides);
  return db;
}

/**
 * Troca o banco inteiro (modo demonstração: o banco da demo, carregado do aparelho ou novo).
 * `nextSeq` continua a numeração dos ids de onde parou, para não repetir id depois de recarregar.
 */
export function replaceDb(next: Db, nextSeq?: number): Db {
  db = next;
  if (nextSeq !== undefined) seq = Math.max(seq, nextSeq);
  return db;
}

let seq = 1000;
export const currentSeq = () => seq;
export const newId = (prefix: string) => `${prefix}_${++seq}`;
export const nowIso = () => new Date().toISOString();

// ── consultas simples
export const findUser = (id: string) => db.users.find((u) => u.id === id);
export const findGroup = (id: string) => db.groups.find((g) => g.id === id && !g.archivedAt);
export const findMatch = (id: string) => db.matches.find((m) => m.id === id);
export const membershipOf = (groupId: string, userId: string) =>
  db.memberships.find((m) => m.groupId === groupId && m.userId === userId && m.status === 'active');
export const activeMembers = (groupId: string) =>
  db.memberships.filter((m) => m.groupId === groupId && m.status === 'active');
export const participationsOf = (matchId: string) => db.participations.filter((p) => p.matchId === matchId);
export const firstNameOf = (userId: string) => findUser(userId)?.name.split(' ')[0] ?? '';
