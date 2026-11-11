import type { Schema } from '@/lib/http';
import {
  activeMembers,
  db,
  findGroup,
  findUser,
  membershipOf,
  participationsOf,
  type DbDraw,
  type DbDrawTemplate,
  type DbGroup,
  type DbInvite,
  type DbLedgerEntry,
  type DbMatch,
  type DbMembership,
  type DbParticipation,
  type DbPayment,
  type DbUser,
} from './db';
import { applyDeadlines, countsOf, waitlist } from './domain/attendance';

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
  'draw.manage',
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
    level: u.sportProfile?.level ?? null,
  };
}
const summaryOf = (userId: string) => {
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
    payment: payment ? toPayment(payment) : null,
  };
}

export function toMatchSummary(m: DbMatch, userId: string): Schema<'MatchSummary'> {
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
    status: m.status,
    counts: countsOf(m, group?.ownerId === userId),
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
  const draw = db.draws.find((d) => d.matchId === m.id && d.status === 'published');
  const myTeam = draw?.teams.find((t) => t.members.some((x) => x.userId === userId));
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
    status: m.status,
    counts: countsOf(m, viewer.role === 'owner'),
    participantsPreview: ps
      .filter((p) => p.status === 'confirmed')
      .slice(0, 5)
      .map((p) => summaryOf(p.userId)),
    myParticipation: mine ? toParticipation(mine) : null,
    myTeamId: myTeam?.id ?? null,
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
    nextMatch: nextMatchOf(groupId, userId),
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
    defaultCapacity: g.defaultCapacity,
    monthlyFeeCents: g.monthlyFeeCents,
    dropInFeeCents: g.dropInFeeCents,
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
    monthlyFeeStatus: m.type === 'monthly' && (owner || viewerId === m.userId) ? (fee?.status ?? null) : null,
  };
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

export const toLedger = (e: DbLedgerEntry): Schema<'LedgerEntry'> => ({
  id: e.id,
  direction: e.direction,
  amountCents: e.amountCents,
  description: e.description,
  occurredOn: e.occurredOn,
  source: e.source,
  paymentId: e.paymentId,
});

export function toTemplate(t: DbDrawTemplate): Schema<'DrawTemplate'> {
  const group = findGroup(t.groupId);
  return {
    id: t.id,
    name: t.name,
    teamCount: t.teamCount,
    playersPerTeam: t.playersPerTeam,
    balanceByLevel: t.balanceByLevel,
    distributePositions: t.distributePositions,
    extraPlayers: t.extraPlayers,
    isDefault: group?.rules.defaultDrawTemplateId === t.id,
  };
}

export function toDraw(d: DbDraw): Schema<'TeamDraw'> {
  const teams = d.teams.map((t) => {
    const levels = t.members.filter((x) => !x.isReserve).map((x) => findUser(x.userId)?.sportProfile?.level ?? 3);
    const averageLevel = levels.length ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10 : 0;
    return {
      id: t.id,
      name: t.name,
      averageLevel,
      members: t.members.map((x) => ({ user: summaryOf(x.userId), position: x.position, isReserve: x.isReserve })),
    };
  });
  const avgs = teams.filter((t) => t.members.some((x) => !x.isReserve)).map((t) => t.averageLevel);
  const levelSpread = avgs.length ? Math.round((Math.max(...avgs) - Math.min(...avgs)) * 10) / 10 : 0;
  return {
    id: d.id,
    matchId: d.matchId,
    status: d.status,
    template: { ...d.template, isDefault: false },
    levelSpread,
    warnings: d.warnings,
    teams,
    publishedAt: d.publishedAt,
  };
}
