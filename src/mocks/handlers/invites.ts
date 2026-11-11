import { http } from 'msw';
import { activeMembers, db, findGroup, findMatch, findUser, membershipOf, newId, nowIso, type DbInvite } from '../db';
import { respond, RuleError, freeSpots } from '../domain/attendance';
import { isOwner, toInvite, toParticipation } from '../serializers';
import { api, APP_URL, authed, fail, json, noContent, problem } from '../utils';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

function validity(i: DbInvite): 'revoked' | 'expired' | 'exhausted' | null {
  if (i.revokedAt) return 'revoked';
  if (i.expiresAt && new Date(i.expiresAt) < new Date()) return 'expired';
  if (i.maxUses !== null && i.uses >= i.maxUses) return 'exhausted';
  return null;
}

/** Aceite (RN-12, RN-13): cria o vínculo e, se o convite é de partida, entra nela como avulso. */
export function acceptInviteFor(code: string, userId: string) {
  const invite = db.invites.find((i) => i.code === code.toUpperCase());
  if (!invite || validity(invite) || !findGroup(invite.groupId)) throw new RuleError('INVITE_INVALID', 'RN-12');
  const already = membershipOf(invite.groupId, userId);
  if (!already) {
    const old = db.memberships.find((m) => m.groupId === invite.groupId && m.userId === userId);
    if (old) {
      old.status = 'active';
      old.type = invite.membershipType;
    } else {
      db.memberships.push({
        id: newId('mb'),
        groupId: invite.groupId,
        userId,
        type: invite.membershipType,
        status: 'active',
        joinedAt: nowIso(),
      });
    }
    invite.uses += 1;
  }
  let participation = null;
  if (invite.matchId) {
    const m = findMatch(invite.matchId);
    if (m?.status === 'open') participation = respond(m.id, userId, true).participation;
  }
  return { groupId: invite.groupId, alreadyMember: Boolean(already), participation };
}

export const inviteHandlers = [
  http.get(
    api('/groups/:groupId/invites'),
    authed(({ params }, user) => {
      const groupId = String(params.groupId);
      if (!isOwner(groupId, user.id)) fail('FORBIDDEN');
      const items = db.invites.filter((i) => i.groupId === groupId && !validity(i)).map((i) => toInvite(i, APP_URL));
      return json({ items });
    }),
  ),

  http.post(
    api('/groups/:groupId/invites'),
    authed(async ({ params, request }, user) => {
      const groupId = String(params.groupId);
      if (!isOwner(groupId, user.id)) fail('FORBIDDEN');
      const body = (await request.json()) as {
        membershipType: 'monthly' | 'drop_in';
        matchId?: string;
        note?: string;
        maxUses?: number;
        expiresAt?: string;
      };
      const invite: DbInvite = {
        code: newCode(),
        groupId,
        matchId: body.matchId ?? null,
        membershipType: body.membershipType,
        note: body.note ?? null,
        uses: 0,
        maxUses: body.maxUses ?? null,
        expiresAt: body.expiresAt ?? null,
        revokedAt: null,
        createdAt: nowIso(),
      };
      db.invites.push(invite);
      return json(toInvite(invite, APP_URL), 201);
    }),
  ),

  // prévia pública: sem login
  http.get(api('/invites/:code'), ({ params }) => {
    const invite = db.invites.find((i) => i.code === String(params.code).toUpperCase());
    const group = invite ? findGroup(invite.groupId) : undefined;
    if (!invite || !group) return problem(404, 'NOT_FOUND');
    const owner = findUser(group.ownerId);
    const match = invite.matchId
      ? findMatch(invite.matchId)
      : db.matches
          .filter((m) => m.groupId === group.id && m.status === 'open')
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
    const invalidReason = validity(invite);
    return json({
      valid: !invalidReason,
      invalidReason,
      membershipType: invite.membershipType,
      invitedBy: owner?.name ?? '',
      group: {
        name: group.name,
        sportId: group.sportId,
        location: group.location,
        memberCount: activeMembers(group.id).length,
      },
      match: match
        ? {
            title: match.title,
            startsAt: match.startsAt,
            freeSpots: freeSpots(match),
            dropInFeeCents: match.dropInFeeCents,
          }
        : null,
    });
  }),

  http.delete(
    api('/invites/:code'),
    authed(({ params }, user) => {
      const invite = db.invites.find((i) => i.code === String(params.code).toUpperCase());
      if (!invite) fail('NOT_FOUND');
      if (!invite || !isOwner(invite.groupId, user.id)) fail('FORBIDDEN');
      if (invite) invite.revokedAt = nowIso();
      return noContent();
    }),
  ),

  http.post(
    api('/invites/:code/accept'),
    authed(({ params }, user) => {
      const result = acceptInviteFor(String(params.code), user.id);
      return json({ ...result, participation: result.participation ? toParticipation(result.participation) : null });
    }),
  ),
];
