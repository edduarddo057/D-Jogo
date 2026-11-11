import type { Schema } from '@/lib/http';

/**
 * "Banco" em memória dos mocks, com os dados do protótipo.
 * Datas relativas a "agora", para as partidas estarem sempre no futuro em dev.
 * Regras de vaga, fila e prazos ficam em ./domain (mesmas regras do back-end, RN-xx).
 */
type MembershipType = Schema<'MembershipType'>;
type ParticipationStatus = Schema<'ParticipationStatus'>;
type MatchStatus = Schema<'MatchStatus'>;
type PaymentStatus = Schema<'PaymentStatus'>;

export interface DbUser {
  id: string;
  phone: string;
  name: string;
  nickname: string;
  photoUrl: string | null;
  profileCompleted: boolean;
  termsVersion: string | null;
  sportProfile: { sportId: string; positions: string[]; level: number } | null;
}
export interface DbGroupRules {
  waitlistAutoPromote: boolean;
  dropInPaymentWindowMinutes: number;
  monthlyResponseDeadline: { daysBefore: number; time: string };
  autoReleaseUnanswered: boolean;
  defaultDrawTemplateId: string | null;
}
export interface DbGroup {
  id: string;
  name: string;
  sportId: string;
  ownerId: string;
  location: { name: string; address: string | null; mapsUrl: string | null };
  defaultCapacity: number;
  monthlyFeeCents: number;
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
  status: MatchStatus;
  cancelReason: string | null;
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
}
export interface DbLedgerEntry {
  id: string;
  groupId: string;
  direction: 'in' | 'out';
  amountCents: number;
  description: string;
  occurredOn: string;
  source: 'payment' | 'manual';
  paymentId: string | null;
}
export interface DbDrawTemplate {
  id: string;
  groupId: string;
  name: string;
  teamCount: number;
  playersPerTeam: number;
  balanceByLevel: boolean;
  distributePositions: boolean;
  extraPlayers: 'bench' | 'spread';
  createdAt: string;
}
export interface DbDraw {
  id: string;
  matchId: string;
  status: 'draft' | 'published';
  template: Omit<DbDrawTemplate, 'id' | 'groupId' | 'createdAt'>;
  teams: Array<{
    id: string;
    name: string;
    members: Array<{ userId: string; position: string | null; isReserve: boolean }>;
  }>;
  warnings: Array<'fewer_players_than_template' | 'positions_unbalanced'>;
  publishedAt: string | null;
}

/** Próximo dia da semana (0 = domingo) às HH:00 no horário de Brasília (UTC-3). */
function nextWeekdayAt(weekday: number, hour: number, weeksAhead = 0): Date {
  const now = new Date();
  const d = new Date(now);
  const diff = (weekday - now.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(now.getUTCDate() + diff + weeksAhead * 7);
  d.setUTCHours(hour + 3, 0, 0, 0);
  return d;
}
const iso = (d: Date) => d.toISOString();
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
const monthOf = (d: Date) => d.toISOString().slice(0, 7);

const PEOPLE: Array<[string, string, string, string, number]> = [
  ['u_lucas', 'Lucas Almeida', 'lucas', 'outside', 4],
  ['u_mariana', 'Mariana Costa', 'mari.costa', 'setter', 4],
  ['u_rafael', 'Rafael Lima', 'rafa', 'middle', 3],
  ['u_beatriz', 'Beatriz Souza', 'bia', 'opposite', 3],
  ['u_diego', 'Diego Ferreira', 'diegof', 'setter', 3],
  ['u_camila', 'Camila Rocha', 'cami', 'setter', 3],
  ['u_tiago', 'Tiago Santos', 'tiago', 'opposite', 4],
  ['u_paulo', 'Paulo Araújo', 'paulo', 'libero', 3],
  ['u_gabi', 'Gabriela Vieira', 'gabi', 'opposite', 4],
  ['u_joao', 'João Nunes', 'joaon', 'outside', 2],
  ['u_bruno', 'Bruno Martins', 'brunom', 'middle', 3],
  ['u_laura', 'Laura Silva', 'laura', 'setter', 3],
  ['u_felipe', 'Felipe Ramos', 'felipe', 'outside', 4],
  ['u_ana', 'Ana Nogueira', 'ana', 'libero', 2],
  ['u_carla', 'Carla Dias', 'carla', 'setter', 3],
  ['u_pedro', 'Pedro Lopes', 'pedro', 'middle', 2],
  ['u_julia', 'Júlia Melo', 'ju', 'outside', 3],
  ['u_marcos', 'Marcos Reis', 'marcos', 'opposite', 3],
  // fora de qualquer turma: para testar "adicionar por nickname" e convites
  ['u_sofia', 'Sofia Andrade', 'sofia', 'outside', 3],
];

const DEFAULT_RULES: DbGroupRules = {
  waitlistAutoPromote: true,
  dropInPaymentWindowMinutes: 120,
  monthlyResponseDeadline: { daysBefore: 1, time: '18:00' },
  autoReleaseUnanswered: false,
  defaultDrawTemplateId: null,
};
export const defaultRules = (): DbGroupRules => structuredClone(DEFAULT_RULES);

function seed() {
  const now = new Date();
  const users: DbUser[] = PEOPLE.map(([id, name, nickname, position, level], i) => ({
    id,
    phone: `+55219${String(80000000 + i * 1111).padStart(8, '0')}`,
    name,
    nickname,
    photoUrl: null,
    profileCompleted: true,
    termsVersion: '2026-11',
    sportProfile: { sportId: 'volleyball', positions: [position], level },
  }));
  const lucas = users[0];
  if (lucas) lucas.phone = '+5521998765432';

  const groups: DbGroup[] = [
    {
      id: 'g_laranjeiras',
      name: 'Vôlei — Laranjeiras',
      sportId: 'volleyball',
      ownerId: 'u_lucas',
      location: { name: 'Quadra das Laranjeiras', address: 'Rua das Laranjeiras, 100 — Rio de Janeiro', mapsUrl: null },
      defaultCapacity: 16,
      monthlyFeeCents: 12000,
      dropInFeeCents: 2500,
      pix: { key: 'lucas.almeida@email.com', holderName: 'Lucas Almeida', bank: 'Banco Inter' },
      timezone: 'America/Sao_Paulo',
      rules: { ...defaultRules(), defaultDrawTemplateId: 'dt_44' },
      archivedAt: null,
    },
    {
      id: 'g_centro',
      name: 'Vôlei — Centro',
      sportId: 'volleyball',
      ownerId: 'u_tiago',
      location: { name: 'Ginásio do Centro', address: null, mapsUrl: null },
      defaultCapacity: 12,
      monthlyFeeCents: 10000,
      dropInFeeCents: 2000,
      pix: { key: 'tiago@email.com', holderName: 'Tiago Santos', bank: null },
      timezone: 'America/Sao_Paulo',
      rules: { ...defaultRules(), defaultDrawTemplateId: 'dt_cen_66' },
      archivedAt: null,
    },
  ];

  const joinedAt = '2026-08-01T12:00:00Z';
  const DROP_INS = ['u_rafael', 'u_bruno', 'u_carla', 'u_pedro'];
  const memberships: DbMembership[] = [
    ...users
      .filter((u) => u.id !== 'u_sofia')
      .map((u) => ({
        id: `mb_lar_${u.id}`,
        groupId: 'g_laranjeiras',
        userId: u.id,
        type: (DROP_INS.includes(u.id) ? 'drop_in' : 'monthly') as MembershipType,
        status: 'active' as const,
        joinedAt: u.id === 'u_lucas' ? '2026-07-01T12:00:00Z' : joinedAt,
      })),
    ...['u_tiago', 'u_lucas', 'u_gabi', 'u_joao'].map((userId) => ({
      id: `mb_cen_${userId}`,
      groupId: 'g_centro',
      userId,
      type: 'monthly' as MembershipType,
      status: 'active' as const,
      joinedAt,
    })),
  ];

  const wed = nextWeekdayAt(3, 20);
  const sun = nextWeekdayAt(0, 18);
  const wedNext = nextWeekdayAt(3, 20, 1);
  const lastWed = addHours(wed, -24 * 7);
  const lar = groups[0]?.location ?? { name: '', address: null, mapsUrl: null };
  const cen = groups[1]?.location ?? lar;
  const matches: DbMatch[] = [
    {
      id: 'm_quarta',
      groupId: 'g_laranjeiras',
      title: 'Partida de quarta',
      startsAt: iso(wed),
      endsAt: iso(addHours(wed, 2)),
      location: lar,
      capacity: 16,
      dropInFeeCents: 2500,
      responseDeadline: iso(addHours(wed, -26)),
      status: 'open',
      cancelReason: null,
    },
    {
      id: 'm_centro',
      groupId: 'g_centro',
      title: 'Vôlei — Centro',
      startsAt: iso(sun),
      endsAt: iso(addHours(sun, 2)),
      location: cen,
      capacity: 12,
      dropInFeeCents: 2000,
      responseDeadline: iso(addHours(sun, -24)),
      status: 'open',
      cancelReason: null,
    },
    {
      id: 'm_quarta_2',
      groupId: 'g_laranjeiras',
      title: 'Partida da semana que vem',
      startsAt: iso(wedNext),
      endsAt: iso(addHours(wedNext, 2)),
      location: lar,
      capacity: 16,
      dropInFeeCents: 2500,
      responseDeadline: iso(addHours(wedNext, -26)),
      status: 'draft',
      cancelReason: null,
    },
    {
      id: 'm_passada',
      groupId: 'g_laranjeiras',
      title: 'Partida da quarta passada',
      startsAt: iso(lastWed),
      endsAt: iso(addHours(lastWed, 2)),
      location: lar,
      capacity: 16,
      dropInFeeCents: 2500,
      responseDeadline: iso(addHours(lastWed, -26)),
      status: 'finished',
      cancelReason: null,
    },
  ];

  // Partida de quarta: 13 confirmados, 2 sem resposta, 1 recusou, 2 na fila (protótipo, tela 05)
  const statusByUser: Record<string, ParticipationStatus> = {
    u_lucas: 'pending',
    u_camila: 'pending',
    u_joao: 'declined',
    u_carla: 'waitlisted',
    u_pedro: 'waitlisted',
  };
  const base = (
    matchId: string,
    userId: string,
    type: MembershipType,
    status: ParticipationStatus,
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
  });
  const participations: DbParticipation[] = memberships
    .filter((m) => m.groupId === 'g_laranjeiras')
    .map((m, i) => {
      const p = base('m_quarta', m.userId, m.type, statusByUser[m.userId] ?? 'confirmed');
      if (p.status === 'waitlisted') p.waitlistedAt = iso(new Date(now.getTime() - (30 - i) * 60_000));
      return p;
    });
  participations.push(
    base('m_centro', 'u_tiago', 'monthly', 'confirmed'),
    base('m_centro', 'u_gabi', 'monthly', 'confirmed'),
    base('m_centro', 'u_lucas', 'monthly', 'confirmed'),
    ...memberships
      .filter((m) => m.groupId === 'g_laranjeiras')
      .slice(0, 14)
      .map((m) => base('m_passada', m.userId, m.type, 'confirmed')),
  );

  // Bruno (avulso) entrou numa vaga, pagou por Pix e aguarda validação: confirmados ficam 12 + ele em awaiting_payment
  const bruno = participations.find((p) => p.matchId === 'm_quarta' && p.userId === 'u_bruno');
  const payments: DbPayment[] = [];
  if (bruno) {
    bruno.status = 'awaiting_payment';
    bruno.offeredAt = iso(addHours(now, -1));
    bruno.paymentDeadline = iso(addHours(now, 1));
    bruno.paymentId = 'pay_bruno_quarta';
    payments.push({
      id: 'pay_bruno_quarta',
      groupId: 'g_laranjeiras',
      userId: 'u_bruno',
      kind: 'match_fee',
      matchId: 'm_quarta',
      referenceMonth: null,
      amountCents: 2500,
      status: 'reported',
      method: 'pix',
      reportedAt: iso(addHours(now, -0.1)),
      reportNote: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: iso(addHours(now, -1)),
    });
  }

  // Mensalidades do mês: a maioria paga; Camila e Diego pendentes
  const month = monthOf(now);
  memberships
    .filter((m) => m.groupId === 'g_laranjeiras' && m.type === 'monthly')
    .forEach((m, i) => {
      const pending = m.userId === 'u_camila' || m.userId === 'u_diego';
      payments.push({
        id: `pay_mes_${m.userId}`,
        groupId: 'g_laranjeiras',
        userId: m.userId,
        kind: 'monthly_fee',
        matchId: null,
        referenceMonth: month,
        amountCents: 12000,
        status: pending ? 'pending' : 'paid',
        method: pending ? null : 'pix',
        reportedAt: null,
        reportNote: null,
        reviewedAt: pending ? null : iso(addHours(now, -24 * (i + 1))),
        rejectionReason: null,
        createdAt: iso(addHours(now, -24 * 10)),
      });
    });

  // Caixa: entradas dos últimos meses + aluguel da quadra
  const ledger: DbLedgerEntry[] = [];
  const monthlyIn = [52000, 66000, 81600, 60000, 91200];
  monthlyIn.forEach((cents, k) => {
    const d = new Date(now);
    d.setUTCDate(10);
    d.setUTCMonth(now.getUTCMonth() - (5 - k));
    ledger.push({
      id: `led_in_${k}`,
      groupId: 'g_laranjeiras',
      direction: 'in',
      amountCents: cents,
      description: 'Mensalidades',
      occurredOn: d.toISOString().slice(0, 10),
      source: 'manual',
      paymentId: null,
    });
    ledger.push({
      id: `led_out_${k}`,
      groupId: 'g_laranjeiras',
      direction: 'out',
      amountCents: 64000,
      description: 'Aluguel da quadra',
      occurredOn: d.toISOString().slice(0, 10),
      source: 'manual',
      paymentId: null,
    });
  });
  payments
    .filter((p) => p.status === 'paid')
    .forEach((p) =>
      ledger.push({
        id: `led_${p.id}`,
        groupId: p.groupId,
        direction: 'in',
        amountCents: p.amountCents,
        description: `Mensalidade — ${users.find((u) => u.id === p.userId)?.name ?? ''}`,
        occurredOn: (p.reviewedAt ?? iso(now)).slice(0, 10),
        source: 'payment',
        paymentId: p.id,
      }),
    );
  ledger.push({
    id: 'led_quadra_atual',
    groupId: 'g_laranjeiras',
    direction: 'out',
    amountCents: 64000,
    description: 'Aluguel da quadra',
    occurredOn: iso(addHours(now, -48)).slice(0, 10),
    source: 'manual',
    paymentId: null,
  });

  const drawTemplates: DbDrawTemplate[] = [
    {
      id: 'dt_44',
      groupId: 'g_laranjeiras',
      name: '4×4',
      teamCount: 4,
      playersPerTeam: 4,
      balanceByLevel: true,
      distributePositions: true,
      extraPlayers: 'bench',
      createdAt: '2026-08-01T12:00:00Z',
    },
    {
      id: 'dt_66',
      groupId: 'g_laranjeiras',
      name: '6×6',
      teamCount: 2,
      playersPerTeam: 6,
      balanceByLevel: true,
      distributePositions: true,
      extraPlayers: 'bench',
      createdAt: '2026-08-02T12:00:00Z',
    },
    {
      id: 'dt_cen_66',
      groupId: 'g_centro',
      name: '6×6',
      teamCount: 2,
      playersPerTeam: 6,
      balanceByLevel: true,
      distributePositions: true,
      extraPlayers: 'bench',
      createdAt: '2026-08-01T12:00:00Z',
    },
  ];

  const invites: DbInvite[] = [
    {
      code: 'LARANJA7',
      groupId: 'g_laranjeiras',
      matchId: null,
      membershipType: 'drop_in',
      note: null,
      uses: 3,
      maxUses: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: '2026-08-01T12:00:00Z',
    },
  ];

  return {
    users,
    groups,
    memberships,
    invites,
    matches,
    participations,
    payments,
    ledger,
    drawTemplates,
    draws: [] as DbDraw[],
    /** Sessão simulada: quem está logado (null = deslogado). */
    session: { userId: 'u_lucas' as string | null },
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

let seq = 1000;
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
