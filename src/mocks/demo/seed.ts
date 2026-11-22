import type { Db, DbGroup, DbMatch, DbMembership, DbParticipation, DbUser, Gender } from '../db';
import { allNotificationsOn, defaultRules } from '../db';

/**
 * Turma da demonstração: quem entra pela /demo é o organizador de uma turma de vôlei pronta, com 13
 * jogadores e um jogo hoje, já com todo mundo confirmado — dá para ir direto ao dia de jogo
 * (chegada, sorteio, placar, resultado, resumo, mural e estatísticas). Para mudar os jogadores, edite
 * DEMO_PLAYERS. Ninguém aqui tem conta: tudo vive no aparelho (src/lib/demo).
 */
export const DEMO_OWNER = { id: 'demo_voce', name: 'Organizador Demo', nickname: 'organizador', position: 'setter' };

/** [nome, posição, nível 1–5 (null = sem nível), gênero, mensalista ou avulso] */
export const DEMO_PLAYERS: Array<[string, string, number | null, Gender, 'monthly' | 'drop_in']> = [
  ['Ana Ribeiro', 'outside', 4, 'female', 'monthly'],
  ['Bruno Lopes', 'middle', 3, 'male', 'monthly'],
  ['Camila Souza', 'opposite', 4, 'female', 'monthly'],
  ['Diego Martins', 'setter', 5, 'male', 'monthly'],
  ['Eduarda Lima', 'libero', 3, 'female', 'monthly'],
  ['Felipe Rocha', 'outside', 3, 'male', 'monthly'],
  ['Gabriela Nunes', 'middle', 2, 'female', 'monthly'],
  ['Henrique Alves', 'opposite', 4, 'male', 'monthly'],
  ['Isabela Costa', 'outside', 3, 'female', 'drop_in'],
  ['João Pedro', 'middle', 2, 'male', 'drop_in'],
  ['Larissa Melo', 'setter', 3, 'female', 'monthly'],
  ['Marcos Vieira', 'outside', null, 'male', 'drop_in'],
  ['Natália Prado', 'libero', 2, 'female', 'monthly'],
];

const iso = (d: Date) => d.toISOString();
const slug = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(' ')[0] ?? 'jogador';

export function createDemoDb(now = new Date()): Db {
  const people: Array<{ id: string; name: string; nickname: string; position: string; gender: Gender | null }> = [
    { ...DEMO_OWNER, gender: null },
    ...DEMO_PLAYERS.map(([name, position, , gender], i) => ({
      id: `demo_p${i + 1}`,
      name,
      nickname: `${slug(name)}${i + 1}`,
      position,
      gender,
    })),
  ];
  const users: DbUser[] = people.map((p, i) => ({
    id: p.id,
    phone: `+5511900000${String(i).padStart(3, '0')}`,
    name: p.name,
    nickname: p.nickname,
    photoUrl: null,
    profileCompleted: true,
    termsVersion: import.meta.env.VITE_TERMS_VERSION ?? null,
    termsAcceptedAt: iso(now),
    gender: p.gender,
    sportProfile: { sportId: 'volleyball', positions: [p.position] },
    notificationSettings: { ...allNotificationsOn },
  }));

  // jogo de hoje: começa na próxima meia hora cheia, 2 h de duração
  const startsAt = new Date(Math.ceil((now.getTime() + 15 * 60_000) / 1_800_000) * 1_800_000);
  const endsAt = new Date(startsAt.getTime() + 2 * 3_600_000);
  const brt = new Date(startsAt.getTime() - 3 * 3_600_000);
  const hhmm = (d: Date) => new Date(d.getTime() - 3 * 3_600_000).toISOString().slice(11, 16);

  const group: DbGroup = {
    id: 'demo_turma',
    name: 'Turma Demo',
    sportId: 'volleyball',
    ownerId: DEMO_OWNER.id,
    location: { name: 'Quadra da demonstração', address: null, mapsUrl: null },
    schedules: [{ weekday: brt.getUTCDay(), startTime: hhmm(startsAt), endTime: hhmm(endsAt) }],
    defaultCapacity: 14,
    monthlyFeeCents: 8000,
    monthlyFeeDueDay: 10,
    dropInFeeCents: 2500,
    pix: null,
    timezone: 'America/Sao_Paulo',
    rules: defaultRules(),
    archivedAt: null,
  };

  const memberships: DbMembership[] = people.map((p, i) => ({
    id: `demo_mb${i}`,
    groupId: group.id,
    userId: p.id,
    type: i === 0 ? 'monthly' : (DEMO_PLAYERS[i - 1]?.[4] ?? 'monthly'),
    status: 'active',
    joinedAt: iso(new Date(now.getTime() - 30 * 86_400_000)),
    level: i === 0 ? 3 : (DEMO_PLAYERS[i - 1]?.[2] ?? null),
  }));

  const match: DbMatch = {
    id: 'demo_jogo',
    groupId: group.id,
    title: group.name,
    startsAt: iso(startsAt),
    endsAt: iso(endsAt),
    location: group.location,
    capacity: group.defaultCapacity,
    dropInFeeCents: group.dropInFeeCents,
    responseDeadline: iso(new Date(startsAt.getTime() - 60 * 60_000)),
    listOpensAt: null,
    withdrawalDeadline: null,
    repeatsWeekly: true,
    seriesId: null,
    status: 'open',
    cancelReason: null,
    openNotified: true,
  };

  // todo mundo confirmado (avulsos já pagos), para ir direto ao dia de jogo
  const participations: DbParticipation[] = memberships.map((m, i) => ({
    id: `demo_pa${i}`,
    matchId: match.id,
    userId: m.userId,
    membershipType: m.type,
    status: 'confirmed',
    source: 'auto',
    waitlistedAt: null,
    offeredAt: null,
    paymentDeadline: null,
    respondedAt: iso(new Date(now.getTime() - (i + 1) * 3_600_000)),
    paymentId: null,
    lateWithdrawal: false,
  }));

  return {
    users,
    groups: [group],
    memberships,
    invites: [],
    matches: [match],
    participations,
    payments: [],
    ledger: [],
    liveSessions: [],
    liveDraws: [],
    rounds: [],
    notifications: [],
    reminders: [],
    session: { userId: DEMO_OWNER.id as string | null },
    otp: new Map<string, { phone: string; code: string }>(),
  };
}
