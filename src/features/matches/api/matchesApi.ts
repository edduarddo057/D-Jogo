import { http, type Page, type Schema } from '@/lib/http';

export type Match = Schema<'Match'>;
export type MatchSummary = Schema<'MatchSummary'>;
export type MatchStatus = Schema<'MatchStatus'>;
export type MyMatchesScope = 'upcoming' | 'history';

export async function listMyMatches(scope: MyMatchesScope, cursor?: string): Promise<Page<MatchSummary>> {
  const { data } = await http.get<Page<MatchSummary>>('/me/matches', { params: { scope, cursor } });
  return data;
}

export async function getMatch(matchId: string): Promise<Match> {
  const { data } = await http.get<Match>(`/matches/${encodeURIComponent(matchId)}`);
  return data;
}

export type MatchInput = Schema<'MatchInput'>;
export type MatchPatch = Schema<'MatchPatch'>;
export type MatchAction = 'publish' | 'close' | 'reopen' | 'start' | 'finish';

const m = (matchId: string) => `/matches/${encodeURIComponent(matchId)}`;

export async function listGroupMatches(groupId: string, scope: 'upcoming' | 'past'): Promise<Page<MatchSummary>> {
  const { data } = await http.get<Page<MatchSummary>>(`/groups/${encodeURIComponent(groupId)}/matches`, {
    params: { scope },
  });
  return data;
}

export async function createMatch(groupId: string, body: MatchInput): Promise<Match> {
  const { data } = await http.post<Match>(`/groups/${encodeURIComponent(groupId)}/matches`, body);
  return data;
}

export async function updateMatch(matchId: string, body: MatchPatch): Promise<Match> {
  const { data } = await http.patch<Match>(m(matchId), body);
  return data;
}

export async function runMatchAction(matchId: string, action: MatchAction): Promise<Match> {
  const { data } = await http.post<Match>(`${m(matchId)}/${action}`);
  return data;
}

export async function cancelMatch(matchId: string, reason: string): Promise<Match> {
  const { data } = await http.post<Match>(`${m(matchId)}/cancel`, { reason });
  return data;
}
