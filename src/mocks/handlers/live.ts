import { http } from 'msw';
import { db, findMatch, membershipOf, newId, nowIso, participationsOf, type DbMatch, type DrawCriteria } from '../db';
import { addConfirmed, RuleError, startForLive } from '../domain/attendance';
import { liveDraw } from '../domain/draw';
import { isOwner, toDaySummary, toLiveDraw, toLiveState, toRound } from '../serializers';
import { api, authed, fail, json, problem } from '../utils';

/** Modo ao vivo (RN-100 a RN-108). Só o dono, exceto o histórico do dia. */
function ownedMatch(matchId: string, userId: string): DbMatch {
  const m = findMatch(matchId);
  if (!m || !membershipOf(m.groupId, userId)) return fail('NOT_FOUND');
  if (!isOwner(m.groupId, userId)) fail('FORBIDDEN');
  return m;
}
const sessionOf = (matchId: string) => db.liveSessions.find((s) => s.matchId === matchId);
/** Quem está na lista do dia: confirmados e avulsos que ainda devem (aparecem com "Deve R$ 25"). */
const confirmedIds = (matchId: string) =>
  participationsOf(matchId)
    .filter((p) => p.status === 'confirmed' || p.status === 'awaiting_payment')
    .map((p) => p.userId);

export const liveHandlers = [
  http.get(
    api('/matches/:matchId/live'),
    authed(({ params }, user) => {
      const m = ownedMatch(String(params.matchId), user.id);
      return json(toLiveState(m, sessionOf(m.id)));
    }),
  ),

  http.post(
    api('/matches/:matchId/live'),
    authed(({ params }, user) => {
      const m = ownedMatch(String(params.matchId), user.id);
      startForLive(m);
      if (!sessionOf(m.id)) {
        const n = confirmedIds(m.id).length;
        db.liveSessions.push({
          matchId: m.id,
          startedAt: nowIso(),
          arrivedUserIds: [],
          lastDrawSettings: {
            teamCount: 2,
            playersPerTeam: Math.max(1, Math.min(6, Math.floor(n / 2))),
            criteria: { level: true, gender: false, position: false },
          },
        });
      }
      return json(toLiveState(m, sessionOf(m.id)));
    }),
  ),

  http.put(
    api('/matches/:matchId/live/arrivals/:userId'),
    authed(async ({ params, request }, user) => {
      const m = ownedMatch(String(params.matchId), user.id);
      const session = sessionOf(m.id);
      if (!session) throw new RuleError('LIVE_NOT_AVAILABLE', 'RN-100');
      const target = String(params.userId);
      if (!confirmedIds(m.id).includes(target)) {
        // quem não estava na lista entra como confirmado ao chegar (RN-101a)
        if (!membershipOf(m.groupId, target)) return problem(404, 'NOT_FOUND');
        addConfirmed(m, target);
      }
      const { arrived } = (await request.json()) as { arrived: boolean };
      session.arrivedUserIds = arrived
        ? [...new Set([...session.arrivedUserIds, target])]
        : session.arrivedUserIds.filter((id) => id !== target);
      return json({ arrivedUserIds: session.arrivedUserIds });
    }),
  ),

  http.post(
    api('/matches/:matchId/live/draws'),
    authed(async ({ params, request }, user) => {
      const m = ownedMatch(String(params.matchId), user.id);
      const session = sessionOf(m.id);
      if (!session) throw new RuleError('LIVE_NOT_AVAILABLE', 'RN-100');
      const body = (await request.json()) as {
        teamCount: number;
        playersPerTeam: number;
        criteria: DrawCriteria;
        clientId?: string;
        teams?: Array<{ memberIds: string[] }>;
        bench?: string[];
      };
      // mesmo id do aparelho = mesmo sorteio (sincronização depois de ficar sem internet)
      const same = body.clientId
        ? db.liveDraws.find((d) => d.clientId === body.clientId && d.matchId === m.id)
        : undefined;
      if (same) return json(toLiveDraw(same, m.groupId), 201);
      if (!(body.teamCount >= 2 && body.teamCount <= 8 && body.playersPerTeam >= 1 && body.playersPerTeam <= 12))
        return problem(400, 'VALIDATION_ERROR', { fields: { teamCount: 'De 2 a 8 times, 1 a 12 por time' } });
      const present = session.arrivedUserIds.filter((id) => confirmedIds(m.id).includes(id));
      let draw;
      if (body.teams) {
        // sorteio feito no aparelho (RN-109): o servidor confere que são confirmados e guarda
        const all = [...body.teams.flatMap((t) => t.memberIds), ...(body.bench ?? [])];
        if (body.teams.length < 2 || all.some((id) => !confirmedIds(m.id).includes(id)))
          return problem(400, 'VALIDATION_ERROR', { fields: { teams: 'Só confirmados' } });
        draw = {
          id: newId('ld'),
          matchId: m.id,
          createdAt: nowIso(),
          teamCount: body.teams.length,
          playersPerTeam: body.playersPerTeam,
          criteria: body.criteria,
          teams: body.teams.map((t, i) => ({
            id: newId('lt'),
            name: `Time ${String.fromCharCode(65 + i)}`,
            colorIndex: i,
            memberIds: t.memberIds,
          })),
          bench: body.bench ?? [],
          clientId: body.clientId ?? null,
        };
        session.arrivedUserIds = [...new Set([...session.arrivedUserIds, ...all])];
      } else {
        if (present.length < 2) throw new RuleError('NOT_ENOUGH_PLAYERS', 'RN-102');
        draw = {
          ...liveDraw({ matchId: m.id, groupId: m.groupId, playerIds: present, ...body }),
          clientId: body.clientId ?? null,
        };
      }
      db.liveDraws.push(draw);
      session.lastDrawSettings = {
        teamCount: body.teamCount,
        playersPerTeam: body.playersPerTeam,
        criteria: body.criteria,
      };
      return json(toLiveDraw(draw, m.groupId), 201);
    }),
  ),

  http.post(
    api('/matches/:matchId/live/rounds'),
    authed(async ({ params, request }, user) => {
      const m = ownedMatch(String(params.matchId), user.id);
      const body = (await request.json()) as {
        drawId: string;
        clientId?: string;
        teams: Array<{ teamId: string; score: number }>;
        scorers?: Array<{ userId: string; points: number }>;
      };
      const same = body.clientId
        ? db.rounds.find((r) => r.clientId === body.clientId && r.matchId === m.id)
        : undefined;
      if (same) return json(toRound(same), 201);
      const draw = db.liveDraws.find((d) => d.id === body.drawId && d.matchId === m.id);
      if (!draw) return problem(404, 'NOT_FOUND');
      const [a, b] = body.teams;
      const ta = draw.teams.find((t) => t.id === a?.teamId);
      const tb = draw.teams.find((t) => t.id === b?.teamId);
      if (!a || !b || !ta || !tb || ta === tb)
        return problem(400, 'VALIDATION_ERROR', { fields: { teams: 'Dois times do sorteio' } });
      if (a.score === b.score) throw new RuleError('ROUND_TIED', 'RN-105');
      const round = {
        id: newId('rd'),
        matchId: m.id,
        drawId: draw.id,
        number: db.rounds.filter((r) => r.matchId === m.id).length + 1,
        finishedAt: nowIso(),
        teams: [
          { teamId: ta.id, name: ta.name, colorIndex: ta.colorIndex, score: a.score, memberIds: [...ta.memberIds] },
          { teamId: tb.id, name: tb.name, colorIndex: tb.colorIndex, score: b.score, memberIds: [...tb.memberIds] },
        ],
        winnerTeamId: a.score > b.score ? ta.id : tb.id,
        scorers: (body.scorers ?? []).filter((s) => s.points > 0),
        clientId: body.clientId ?? null,
      };
      db.rounds.push(round);
      return json(toRound(round), 201);
    }),
  ),

  http.get(
    api('/matches/:matchId/day-summary'),
    authed(({ params }, user) => {
      const m = findMatch(String(params.matchId));
      if (!m || !membershipOf(m.groupId, user.id)) return problem(404, 'NOT_FOUND');
      return json(toDaySummary(m));
    }),
  ),
];
