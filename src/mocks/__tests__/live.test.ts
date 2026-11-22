import { http } from '@/lib/http';
import { db } from '../db';
import { liveDraw } from '../domain/draw';
import { pendingsOf } from '../domain/pendings';

/** Regras no "back-end" simulado (RN-17, RN-18, RN-20b, RN-28a, RN-66, RN-70, RN-100 a RN-111). */
const api = async <T>(method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, body?: unknown) =>
  (await http.request<T>({ method, url, data: body })).data;

beforeEach(async () => {
  // sessão da Marina (organiza o Vôlei de sábado)
  const { data } = await http.post<{ accessToken: string }>('/auth/refresh');
  http.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
});

describe('pendências da turma (RN-18)', () => {
  it('soma as 4 pendências do manual no jogo da vez', () => {
    const p = pendingsOf('g_sabado');
    expect(p).toMatchObject({ paymentsToReview: 2, unanswered: 5, toPublish: 1, focusMatchId: 'm_sab' });
    expect(p.overdueFees).toBe(2);
    expect(p.total).toBe(p.paymentsToReview + p.overdueFees + p.unanswered + p.toPublish);
  });

  it('vem na lista de turmas só para o dono', async () => {
    const { items: groups } = await api<{ items: Array<{ id: string; pendings: unknown }> }>('get', '/me/groups');
    expect(groups.find((g) => g.id === 'g_sabado')?.pendings).not.toBeNull();
    expect(groups.find((g) => g.id === 'g_quarta')?.pendings).toBeNull();
  });
});

describe('lista e desistência (RN-20b, RN-28a)', () => {
  it('antes de a lista abrir ninguém responde', async () => {
    await expect(api('put', '/matches/m_sab_2/participations/me', { response: 'going' })).rejects.toMatchObject({
      code: 'LIST_NOT_OPEN_YET',
    });
  });

  it('desistir depois do prazo fica registrado como desistência tardia', async () => {
    const m = db.matches.find((x) => x.id === 'm_sab');
    if (!m) throw new Error('sem jogo');
    await api('put', '/matches/m_sab/participations/me', { response: 'going' });
    m.withdrawalDeadline = new Date(Date.now() - 60_000).toISOString();
    const res = await api<{ participation: { lateWithdrawal: boolean } }>('put', '/matches/m_sab/participations/me', {
      response: 'not_going',
    });
    expect(res.participation.lateWithdrawal).toBe(true);
  });
});

describe('pagamentos, desfazer e estorno (RN-64 a RN-66, RN-70)', () => {
  it('aprovar entra no caixa; desfazer volta o pagamento e estorna, sem apagar', async () => {
    const before = db.ledger.length;
    await api('post', '/payments/pay_samuel_sab/approve');
    expect(db.ledger).toHaveLength(before + 1);
    const undone = await api<{ status: string }>('post', '/payments/pay_samuel_sab/undo');
    expect(undone.status).toBe('reported');
    expect(db.ledger).toHaveLength(before + 2);
    expect(db.ledger.at(-1)).toMatchObject({ source: 'reversal', direction: 'out', amountCents: 2500 });
  });

  it('cobrar avisa a pessoa e o desfazer apaga o aviso não lido', async () => {
    const fee = db.payments.find((p) => p.userId === 'u_carol' && p.kind === 'monthly_fee' && p.status === 'pending');
    if (!fee) throw new Error('sem mensalidade');
    const { reminderId } = await api<{ reminderId: string }>('post', `/payments/${fee.id}/charge`);
    expect(db.notifications.some((n) => n.userId === 'u_carol' && n.kind === 'fee_charge')).toBe(true);
    await api('delete', `/reminders/${reminderId}`);
    expect(db.notifications.some((n) => n.userId === 'u_carol' && n.kind === 'fee_charge')).toBe(false);
  });

  it('estornar um lançamento duas vezes é recusado', async () => {
    const entry = db.ledger.find((e) => e.id === 'led_coletes');
    if (!entry) throw new Error('sem lançamento');
    await api('post', `/groups/g_sabado/finance/entries/${entry.id}/reverse`);
    await expect(api('post', `/groups/g_sabado/finance/entries/${entry.id}/reverse`)).rejects.toMatchObject({
      code: 'LEDGER_ENTRY_ALREADY_REVERSED',
    });
  });
});

describe('nível na turma (RN-17)', () => {
  it('o dono define e só ele vê', async () => {
    const m = await api<{ level: number | null }>('patch', '/groups/g_sabado/members/mb_sab_u_hugo', { level: 5 });
    expect(m.level).toBe(5);
    expect(db.memberships.find((x) => x.id === 'mb_sab_u_hugo')?.level).toBe(5);
  });
});

describe('sorteio (RN-102, RN-103)', () => {
  const players = ['u_marina', 'u_fe', 'u_carol', 'u_lia', 'u_otavio', 'u_bruno', 'u_diego', 'u_rafa'];
  const crit = { level: true, gender: true, position: false };

  it('time misto: cada time recebe o mesmo número de mulheres', () => {
    for (let i = 0; i < 20; i += 1) {
      const d = liveDraw({
        matchId: 'm_sab',
        groupId: 'g_sabado',
        playerIds: players,
        teamCount: 2,
        playersPerTeam: 4,
        criteria: crit,
      });
      const women = d.teams.map(
        (t) => t.memberIds.filter((id) => db.users.find((u) => u.id === id)?.gender === 'female').length,
      );
      expect(women).toEqual([2, 2]);
    }
  });

  it('quem passa das vagas fica de fora', () => {
    const d = liveDraw({
      matchId: 'm_sab',
      groupId: 'g_sabado',
      playerIds: players,
      teamCount: 2,
      playersPerTeam: 3,
      criteria: crit,
    });
    expect(d.teams.flatMap((t) => t.memberIds)).toHaveLength(6);
    expect(d.bench).toHaveLength(2);
  });
});

describe('dia de jogo de ponta a ponta (RN-100 a RN-109)', () => {
  it('sorteio feito no aparelho, rodadas sem empate, sincronização sem duplicar e destaque por vitórias', async () => {
    const state = await api<{ players: Array<{ id: string }> }>('post', '/matches/m_sab/live');
    expect(db.matches.find((m) => m.id === 'm_sab')?.status).toBe('in_progress');
    const ids = state.players.map((p) => p.id).slice(0, 4);
    for (const id of ids) await api('put', `/matches/m_sab/live/arrivals/${id}`, { arrived: true });

    // times montados no celular, sem internet; reenviar o mesmo clientId não cria outro sorteio
    const body = {
      teamCount: 2,
      playersPerTeam: 2,
      criteria: { level: true, gender: false, position: false },
      clientId: 'draw-1',
      teams: [{ memberIds: ids.slice(0, 2) }, { memberIds: ids.slice(2, 4) }],
      bench: [],
    };
    const draw = await api<{ id: string; teams: Array<{ id: string; members: Array<{ id: string }> }> }>(
      'post',
      '/matches/m_sab/live/draws',
      body,
    );
    const again = await api<{ id: string }>('post', '/matches/m_sab/live/draws', body);
    expect(again.id).toBe(draw.id);
    const [a, b] = draw.teams;
    if (!a || !b) throw new Error('sem times');

    await expect(
      api('post', '/matches/m_sab/live/rounds', {
        drawId: draw.id,
        teams: [
          { teamId: a.id, score: 10 },
          { teamId: b.id, score: 10 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'ROUND_TIED' });

    const round = (sa: number, sb: number, clientId: string, scorers?: Array<{ userId: string; points: number }>) =>
      api('post', '/matches/m_sab/live/rounds', {
        drawId: draw.id,
        clientId,
        teams: [
          { teamId: a.id, score: sa },
          { teamId: b.id, score: sb },
        ],
        scorers,
      });
    const scorer = a.members[0]?.id ?? '';
    await round(25, 20, 'r1', [{ userId: scorer, points: 6 }]);
    await round(25, 20, 'r1'); // mesma rodada reenviada
    await round(25, 18, 'r2');
    await round(19, 25, 'r3');

    const day = await api<{
      rounds: unknown[];
      groups: Array<{ wins: number; rounds: number }>;
      players: Array<{ user: { id: string }; wins: number }>;
      mvp: Array<{ id: string }>;
    }>('get', '/matches/m_sab/day-summary');
    expect(day.rounds).toHaveLength(3);
    expect(day.groups[0]).toMatchObject({ wins: 2, rounds: 3 });
    // destaque: mais vitórias (2), desempate por pontos (6)
    expect(day.mvp.map((u) => u.id)).toEqual([scorer]);
  });
});
