import { http, type Schema } from '@/lib/http';

export type LiveState = Schema<'LiveState'>;
export type LiveDraw = Schema<'LiveDraw'>;
export type LiveDrawInput = Schema<'LiveDrawInput'>;
export type LivePlayer = Schema<'LivePlayer'>;
export type LiveTeam = Schema<'LiveTeam'>;
export type DrawCriteria = Schema<'DrawCriteria'>;
export type Round = Schema<'Round'>;
export type RoundInput = Schema<'RoundInput'>;
export type DaySummary = Schema<'DaySummary'>;

const m = (matchId: string) => `/matches/${encodeURIComponent(matchId)}`;

export async function getLive(matchId: string): Promise<LiveState> {
  const { data } = await http.get<LiveState>(`${m(matchId)}/live`);
  return data;
}

export async function startLive(matchId: string): Promise<LiveState> {
  const { data } = await http.post<LiveState>(`${m(matchId)}/live`);
  return data;
}

export async function setArrival(matchId: string, userId: string, arrived: boolean): Promise<string[]> {
  const { data } = await http.put<{ arrivedUserIds: string[] }>(
    `${m(matchId)}/live/arrivals/${encodeURIComponent(userId)}`,
    { arrived },
  );
  return data.arrivedUserIds;
}

export async function createLiveDraw(matchId: string, body: LiveDrawInput): Promise<LiveDraw> {
  const { data } = await http.post<LiveDraw>(`${m(matchId)}/live/draws`, body);
  return data;
}

export async function finishRound(matchId: string, body: RoundInput): Promise<Round> {
  const { data } = await http.post<Round>(`${m(matchId)}/live/rounds`, body);
  return data;
}

export async function getDaySummary(matchId: string): Promise<DaySummary> {
  const { data } = await http.get<DaySummary>(`${m(matchId)}/day-summary`);
  return data;
}
