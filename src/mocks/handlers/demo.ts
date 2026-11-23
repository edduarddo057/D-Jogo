import { http } from 'msw';
import { allNotificationsOn, db, findGroup, newId, nowIso, type DbUser, type Gender } from '../db';
import { addConfirmed } from '../domain/attendance';
import { isOwner, toMember } from '../serializers';
import { api, authed, fail, json, noContent, problem } from '../utils';

/**
 * Só do modo demonstração (não existe na API real): o organizador adiciona uma pessoa só pelo nome,
 * sem conta nem cadastro. Ela vira membro da turma e, se houver jogo por vir (ou em andamento), já entra
 * confirmada nele — antes do jogo, abre uma vaga a mais se a lista estiver cheia.
 */
export const demoHandlers = [
  http.post(
    api('/demo/groups/:groupId/players'),
    authed(async ({ params, request }, owner) => {
      const group = findGroup(String(params.groupId));
      if (!group) return fail('NOT_FOUND');
      if (!isOwner(group.id, owner.id)) return fail('FORBIDDEN');
      const body = (await request.json()) as {
        name?: string;
        position?: string | null;
        level?: number | null;
        gender?: Gender | null;
        type?: 'monthly' | 'drop_in';
        skills?: Record<string, number> | null;
      };
      const name = body.name?.trim() ?? '';
      if (name.length < 2) return problem(400, 'VALIDATION_ERROR', { fields: { name: 'Digite o nome' } });

      const user: DbUser = {
        id: newId('demo_u'),
        phone: `+55119${String(Date.now()).slice(-8)}`,
        name,
        nickname: name.split(' ')[0]?.toLowerCase() ?? 'jogador',
        photoUrl: null,
        profileCompleted: true,
        termsVersion: null,
        termsAcceptedAt: null,
        gender: body.gender ?? null,
        sportProfile: body.position ? { sportId: group.sportId, positions: [body.position] } : null,
        notificationSettings: { ...allNotificationsOn },
      };
      db.users.push(user);
      const membership = {
        id: newId('mb'),
        groupId: group.id,
        userId: user.id,
        type: body.type ?? 'drop_in',
        status: 'active' as const,
        joinedAt: nowIso(),
        level: body.level ?? null,
        skills: body.skills && Object.keys(body.skills).length ? body.skills : null,
      };
      db.memberships.push(membership);

      // já confirmada no próximo jogo da turma (ou no que está acontecendo)
      const match = db.matches
        .filter((m) => m.groupId === group.id && ['open', 'closed', 'in_progress'].includes(m.status))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
      if (match) {
        const occupied = db.participations.filter(
          (p) => p.matchId === match.id && (p.status === 'confirmed' || p.status === 'awaiting_payment'),
        ).length;
        if (match.status !== 'in_progress' && occupied >= match.capacity) match.capacity = occupied + 1;
        addConfirmed(match, user.id);
      }
      return json({ member: toMember(membership, owner.id), matchId: match?.id ?? null }, 201);
    }),
  ),

  // A demo da conta (na API real fica em demo_worlds). Nos mocks, sempre "existe" e apagar recomeça.
  http.get(
    api('/demo'),
    authed(() => json({ exists: true, createdAt: null, updatedAt: null })),
  ),
  http.put(
    api('/demo'),
    authed(() => noContent()),
  ),
  http.delete(
    api('/demo'),
    authed(() => noContent()),
  ),
];
