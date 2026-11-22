import type { Schema } from '@/lib/http';
import {
  activeMembers,
  db,
  findGroup,
  findUser,
  membershipOf,
  participationsOf,
  type DbGroup,
  type DbInvite,
  type DbLedgerEntry,
  type DbMatch,
  type DbMembership,
  type DbParticipation,
  type DbPayment,
  type DbLiveDraw,
  type DbLiveSession,
  type DbRound,
  type DbUser,
} from './db';
import { applyDeadlines, countsOf, waitlist } from './domain/attendance';
import { pendingsOf } from './domain/pendings';

/** Converte as linhas do "banco" no formato do contrato (openapi.yaml). */

const OWNER_PERMISSIONS: Schema<'Permission'>[] = [
  'group.edit',
  'group.invite',
  'group.manage_members',
  'group.view_finance',
  'match.create',
  'match.manage',
  'attendance.manage',
  'payment.review',
  'live.manage',
];

export const isOwner = (groupId: string, userId: string) => findGroup(groupId)?.ownerId === userId;

export function viewerFor(groupId: string, userId: string): Schema<'Viewer'> | null {
  const group = findGroup(groupId);
  const membership = membershipOf(groupId, userId);
  if (!group || !membership) return null;
  const owner = group.ownerId === userId;
  return {
    role: owner ? 'owner' : 'player',
    membershipType: membership.type,
    permissions: owner ? OWNER_PERMISSIONS : [],
  };
}

export function toUserSummary(u: DbUser): Schema<'UserSummary'> {
  return {
    id: u.id,
    name: u.name,
    nickname: u.nickname,
    photoUrl: u.photoUrl,
    primaryPosition: u.sportProfile?.positions[0] ?? null,
    level: null,
  };
}
export const summaryOf = (userId: string) => {
  const u = findUser(userId);
  if (!u) throw new Error(`usuário ${userId} não existe no mock`);
  return toUserSummary(u);
};

export function toMe(u: DbUser): Schema<'Me'> {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    nickname: u.nickname,
    photoUrl: u.photoUrl,
    profileCompleted: u.profileCompleted,
    termsVersion: u.termsVersion,
    termsAcceptedAt: u.termsAcceptedAt,
    gender: u.gender,
    sportProfiles: u.sportProfile ? [u.sportProfile] : [],
  };
}

export function toPayment(p: DbPayment): Schema<'Payment'> {
  return {
    id: p.id,
    groupId: p.groupId,
    user: summaryOf(p.userId),
    kind: p.kind,
    matchId: p.matchId,
    referenceMonth: p.referenceMonth,
    amountCents: p.amountCents,
    status: p.status,
    method: p.method,
    reportedAt: p.reportedAt,
    reportNote: p.reportNote,
    reviewedAt: p.reviewedAt,
    rejectionReason: p.rejectionReason,
    createdAt: p.createdAt,
  };
}

export function toParticipation(p: DbParticipation): Schema<'Participation'> {
  const position = waitlist(p.matchId).findIndex((x) => x.id === p.id);
  const payment = p.paymentId ? db.payments.find((x) => x.id === p.paymentId) : undefined;
  return {
    id: p.id,
    matchId: p.matchId,
    user: summaryOf(p.userId),
    membershipType: p.membershipType,
    status: p.status,
    source: p.source,
    waitlistPosition: position >= 0 ? position + 1 : null,
    paymentDeadline: p.paymentDeadline,
    respondedAt: p.respondedAt,
    lateWithdrawal: p.lateWithdrawal,
    payment: payment ? toPayment(payment) : null,
  };
}

/** Como foi o jogo para a pessoa (Perfil › Jogos). */
export function historyOf(m: DbMatch, userId: string): Schema<'MyHistory'> | null {
  const p = participationsOf(m.id).find((x) => x.userId === userId);
  if (!p) return null;
  const session = db.liveSessions.find((s) => s.matchId === m.id);
  const attended =
    (p.status === 'confirmed' || (p.status === 'awaiting_payment' && !!session)) &&
    (!session || session.arrivedUserIds.includes(userId));
  const rounds = db.rounds.filter((r) => r.matchId === m.id && r.teams.some((t) => t.memberIds.includes(userId)));
  const wins = rounds.filter((r) =>
    r.teams.find((t) => t.teamId === r.winnerTeamId)?.memberIds.includes(userId),
  ).length;
  if (attended)
    return {
      outcome: 'attended',
      wins: rounds.length ? wins : null,
      rounds: rounds.length || null,
      notice: 'none',
      hoursBefore: null,
    };
  if (p.lateWithdrawal) {
    const hours = p.respondedAt
      ? (new Date(m.startsAt).getTime() - new Date(p.respondedAt).getTime()) / 3_600_000
      : null;
    return {
      outcome: 'late_withdrawal',
      wins: null,
      rounds: null,
      notice: 'none',
      hoursBefore: hours === null ? null : Math.max(0, Math.round(hours)),
    };
  }
  if (p.status === 'pending' || p.status === 'awaiting_payment' || p.status === 'waitlisted') return null;
  return {
    outcome: 'absent',
    wins: null,
    rounds: null,
    notice: p.status === 'declined' || p.status === 'left' ? 'in_advance' : 'none',
    hoursBefore: null,
  };
}

/** Destaque do dia: mais vitórias, desempate por pontos (RN-108). */
export function highlightIdsOf(matchId: string): string[] {
  const rounds = db.rounds.filter((r) => r.matchId === matchId);
  const stats = new Map<string, { wins: number; points: number }>();
  for (const r of rounds) {
    for (const t of r.teams)
      for (const id of t.memberIds) {
        const s = stats.get(id) ?? { wins: 0, points: 0 };
        if (t.teamId === r.winnerTeamId) s.wins += 1;
        stats.set(id, s);
      }
    for (const sc of r.scorers) {
      const s = stats.get(sc.userId) ?? { wins: 0, points: 0 };
      s.points += sc.points;
      stats.set(sc.userId, s);
    }
  }
  const all = [...stats.entries()];
  if (all.length === 0) return [];
  const best = all.reduce((a, b) =>
    b[1].wins > a[1].wins || (b[1].wins === a[1].wins && b[1].points > a[1].points) ? b : a,
  );
  return all.filter(([, s]) => s.wins === best[1].wins && s.points === best[1].points).map(([id]) => id);
}

export function toMatchSummary(m: DbMatch, userId: string, withHistory = false): Schema<'MatchSummary'> {
  applyDeadlines(m);
  const group = findGroup(m.groupId);
  const mine = participationsOf(m.id).find((p) => p.userId === userId);
  return {
    id: m.id,
    groupId: m.groupId,
    groupName: group?.name ?? '',
    title: m.title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    location: m.location,
    dropInFeeCents: m.dropInFeeCents,
    listOpensAt: m.listOpensAt,
    responseDeadline: m.responseDeadline,
    withdrawalDeadline: m.withdrawalDeadline,
    status: m.status,
    counts: countsOf(m, group?.ownerId === userId),
    repeatsWeekly: m.repeatsWeekly,
    myParticipation: mine ? toParticipation(mine) : null,
    myHistory: withHistory ? historyOf(m, userId) : null,
    myStatus: mine?.status ?? null,
  };
}

export function toMatch(m: DbMatch, userId: string): Schema<'Match'> | null {
  const group = findGroup(m.groupId);
  const viewer = viewerFor(m.groupId, userId);
  if (!group || !viewer) return null;
  applyDeadlines(m);
  const ps = participationsOf(m.id);
  const mine = ps.find((p) => p.userId === userId);
  return {
    id: m.id,
    group: { id: group.id, name: group.name, sportId: group.sportId, pix: group.pix },
    title: m.title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    location: m.location,
    capacity: m.capacity,
    dropInFeeCents: m.dropInFeeCents,
    responseDeadline: m.responseDeadline,
    listOpensAt: m.listOpensAt,
    withdrawalDeadline: m.withdrawalDeadline,
    repeatsWeekly: m.repeatsWeekly,
    status: m.status,
    counts: countsOf(m, viewer.role === 'owner'),
    participantsPreview: ps
      .filter((p) => p.status === 'confirmed')
      .slice(0, 5)
      .map((p) => summaryOf(p.userId)),
    myParticipation: mine ? toParticipation(mine) : null,
    viewer,
    cancelReason: m.cancelReason,
  };
}

const nextMatchOf = (groupId: string, userId: string) => {
  const next = db.matches
    .filter(
      (m) =>
        m.groupId === groupId &&
        m.status !== 'draft' &&
        m.status !== 'cancelled' &&
        m.status !== 'finished' &&
        new Date(m.endsAt) > new Date(),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  return next ? toMatchSummary(next, userId) : null;
};

export function toGroupSummary(groupId: string, userId: string): Schema<'GroupSummary'> | null {
  const group = findGroup(groupId);
  const viewer = viewerFor(groupId, userId);
  if (!group || !viewer) return null;
  return {
    id: group.id,
    name: group.name,
    sportId: group.sportId,
    memberCount: activeMembers(groupId).length,
    defaultCapacity: group.defaultCapacity,
    location: group.location,
    schedules: group.schedules,
    nextMatch: nextMatchOf(groupId, userId),
    pendings: viewer.role === 'owner' ? pendingsOf(groupId) : null,
    viewer,
  };
}

export function toGroup(g: DbGroup, userId: string): Schema<'Group'> | null {
  const viewer = viewerFor(g.id, userId);
  if (!viewer) return null;
  const members = activeMembers(g.id);
  return {
    id: g.id,
    name: g.name,
    sportId: g.sportId,
    owner: summaryOf(g.ownerId),
    location: g.location,
    schedules: g.schedules,
    defaultCapacity: g.defaultCapacity,
    monthlyFeeCents: g.monthlyFeeCents,
    monthlyFeeDueDay: g.monthlyFeeDueDay,
    dropInFeeCents: g.dropInFeeCents,
    publicRules: {
      listOpens: g.rules.listOpens,
      monthlyResponseDeadline: g.rules.monthlyResponseDeadline,
      withdrawalDeadlineHours: g.rules.withdrawalDeadlineHours,
      dropInPaymentWindowMinutes: g.rules.dropInPaymentWindowMinutes,
    },
    pix: g.pix,
    timezone: g.timezone,
    memberCount: members.length,
    monthlyCount: members.filter((m) => m.type === 'monthly').length,
    dropInCount: members.filter((m) => m.type === 'drop_in').length,
    rules: viewer.role === 'owner' ? g.rules : null,
    viewer,
    archivedAt: g.archivedAt,
  };
}

export function toMember(m: DbMembership, viewerId: string): Schema<'Member'> {
  const owner = isOwner(m.groupId, viewerId);
  const user = findUser(m.userId);
  const month = new Date().toISOString().slice(0, 7);
  const fee = db.payments.find(
    (p) => p.groupId === m.groupId && p.userId === m.userId && p.kind === 'monthly_fee' && p.referenceMonth === month,
  );
  return {
    id: m.id,
    user: summaryOf(m.userId),
    phone: owner && user ? user.phone : null,
    role: isOwner(m.groupId, m.userId) ? 'owner' : 'player',
    type: m.type,
    joinedAt: m.joinedAt,
    level: owner ? m.level : null,
    gender: owner || viewerId === m.userId ? (user?.gender ?? null) : null,
    monthlyFeeStatus: m.type === 'monthly' && (owner || viewerId === m.userId) ? (fee?.status ?? null) : null,
    attendanceRate: owner ? attendanceRateIn(m.groupId, m.userId) : null,
    monthsOnTime: owner && m.type === 'monthly' ? monthsOnTimeOf(m.groupId, m.userId) : null,
  };
}

/** Frequência: foi / jogos finalizados em que estava na lista. */
export function attendanceRateIn(groupId: string | null, userId: string): number | null {
  const finished = db.matches.filter((x) => x.status === 'finished' && (!groupId || x.groupId === groupId));
  const hist = finished.map((x) => historyOf(x, userId)).filter((h) => h !== null);
  if (hist.length === 0) return null;
  return hist.filter((h) => h.outcome === 'attended').length / hist.length;
}

/** Meses seguidos com a mensalidade paga, do mais recente para trás. */
export function monthsOnTimeOf(groupId: string, userId: string): number {
  const fees = db.payments
    .filter((p) => p.groupId === groupId && p.userId === userId && p.kind === 'monthly_fee' && p.referenceMonth)
    .sort((a, b) => (b.referenceMonth ?? '').localeCompare(a.referenceMonth ?? ''));
  const dueDay = findGroup(groupId)?.monthlyFeeDueDay ?? 10;
  const onTime = (f: (typeof fees)[number]) =>
    f.status === 'paid' &&
    !!f.reviewedAt &&
    f.reviewedAt.slice(0, 10) <= `${f.referenceMonth}-${String(dueDay).padStart(2, '0')}`;
  let n = 0;
  for (const f of fees) {
    if (onTime(f)) n += 1;
    else if (f.status === 'pending' && n === 0)
      continue; // mês atual ainda em aberto
    else break;
  }
  return n;
}

export function toInvite(i: DbInvite, appUrl: string): Schema<'Invite'> {
  return {
    code: i.code,
    url: `${appUrl}/convite/${i.code}`,
    groupId: i.groupId,
    matchId: i.matchId,
    membershipType: i.membershipType,
    note: i.note,
    uses: i.uses,
    maxUses: i.maxUses,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
  };
}

export const toLedger = (e: DbLedgerEntry, viewerId?: string): Schema<'LedgerEntry'> => ({
  id: e.id,
  direction: e.direction,
  amountCents: e.amountCents,
  description: e.description,
  occurredOn: e.occurredOn,
  source: e.source,
  paymentId: e.paymentId,
  category: e.category,
  method: e.method,
  reviewedByName: e.reviewedById
    ? e.reviewedById === viewerId
      ? 'você'
      : (findUser(e.reviewedById)?.name ?? null)
    : null,
  reversalOf: e.reversalOf,
  reversedBy: e.reversedBy,
});

// ── Modo ao vivo (só o dono vê; inclui gênero para o sorteio)

export function toLivePlayer(userId: string, groupId: string, matchId?: string): Schema<'LivePlayer'> {
  const u = findUser(userId);
  const mb = membershipOf(groupId, userId);
  const p = matchId ? participationsOf(matchId).find((x) => x.userId === userId) : undefined;
  const pay = p?.paymentId ? db.payments.find((x) => x.id === p.paymentId) : undefined;
  return {
    ...summaryOf(userId),
    level: mb?.level ?? null,
    gender: u?.gender ?? null,
    membershipType: p?.membershipType ?? mb?.type ?? 'drop_in',
    owesCents: pay && pay.status !== 'paid' && pay.status !== 'cancelled' ? pay.amountCents : null,
  };
}

export function toLiveDraw(d: DbLiveDraw, groupId: string): Schema<'LiveDraw'> {
  return {
    id: d.id,
    createdAt: d.createdAt,
    teamCount: d.teamCount,
    playersPerTeam: d.playersPerTeam,
    criteria: d.criteria,
    teams: d.teams.map((t) => ({
      id: t.id,
      name: t.name,
      colorIndex: t.colorIndex,
      members: t.memberIds.map((id) => toLivePlayer(id, groupId)),
    })),
    bench: d.bench.map((id) => toLivePlayer(id, groupId)),
  };
}

export function toRound(r: DbRound): Schema<'Round'> {
  return {
    id: r.id,
    drawId: r.drawId,
    number: r.number,
    finishedAt: r.finishedAt,
    teams: r.teams.map((t) => ({
      teamId: t.teamId,
      name: t.name,
      colorIndex: t.colorIndex,
      score: t.score,
      members: t.memberIds.map(summaryOf),
    })),
    winnerTeamId: r.winnerTeamId,
    scorers: r.scorers,
  };
}

export function toLiveState(m: DbMatch, session: DbLiveSession | undefined): Schema<'LiveState'> {
  const draws = db.liveDraws.filter((d) => d.matchId === m.id);
  const current = draws[draws.length - 1];
  const confirmed = participationsOf(m.id).filter((p) => p.status === 'confirmed' || p.status === 'awaiting_payment');
  return {
    matchId: m.id,
    startedAt: session?.startedAt ?? null,
    players: confirmed.map((p) => toLivePlayer(p.userId, m.groupId, m.id)),
    arrivedUserIds: session?.arrivedUserIds ?? [],
    lastDrawSettings: session?.lastDrawSettings ?? {
      teamCount: 2,
      playersPerTeam: Math.max(1, Math.min(6, Math.floor(confirmed.length / 2))),
      criteria: { level: true, gender: false, position: false },
    },
    currentDraw: current ? toLiveDraw(current, m.groupId) : null,
    rounds: db.rounds.filter((r) => r.matchId === m.id).map(toRound),
  };
}

/** Histórico do dia (RN-107, RN-108). */
export function toDaySummary(m: DbMatch): Schema<'DaySummary'> {
  const rounds = db.rounds.filter((r) => r.matchId === m.id).sort((a, b) => a.number - b.number);
  const groups = new Map<string, { memberIds: string[]; wins: number; rounds: number }>();
  const players = new Map<string, { wins: number; rounds: number; points: number }>();
  const player = (id: string) => {
    const p = players.get(id) ?? { wins: 0, rounds: 0, points: 0 };
    players.set(id, p);
    return p;
  };
  for (const r of rounds) {
    for (const t of r.teams) {
      const key = [...t.memberIds].sort().join('+');
      const g = groups.get(key) ?? { memberIds: [...t.memberIds].sort(), wins: 0, rounds: 0 };
      g.rounds += 1;
      if (t.teamId === r.winnerTeamId) g.wins += 1;
      groups.set(key, g);
      for (const id of t.memberIds) {
        const p = player(id);
        p.rounds += 1;
        if (t.teamId === r.winnerTeamId) p.wins += 1;
      }
    }
    for (const sc of r.scorers) player(sc.userId).points += sc.points;
  }
  return {
    matchId: m.id,
    rounds: rounds.map(toRound),
    groups: [...groups.entries()]
      .map(([key, g]) => ({ key, members: g.memberIds.map(summaryOf), wins: g.wins, rounds: g.rounds }))
      .sort((a, b) => b.wins - a.wins || a.rounds - b.rounds),
    players: [...players.entries()]
      .map(([id, p]) => ({ user: summaryOf(id), ...p }))
      .sort((a, b) => b.wins - a.wins || b.points - a.points || a.user.name.localeCompare(b.user.name)),
    mvp: highlightIdsOf(m.id).map(summaryOf),
  };
}
