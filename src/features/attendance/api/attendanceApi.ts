import { http, type Schema } from '@/lib/http';

export type Participation = Schema<'Participation'>;
export type ParticipationStatus = Schema<'ParticipationStatus'>;
export type MatchCounts = Schema<'MatchCounts'>;
export type RespondOutcome = 'confirmed' | 'awaiting_payment' | 'waitlisted' | 'declined' | 'left';

const m = (matchId: string) => `/matches/${encodeURIComponent(matchId)}`;

export async function listParticipations(matchId: string): Promise<{ items: Participation[]; counts: MatchCounts }> {
  const { data } = await http.get<{ items: Participation[]; counts: MatchCounts }>(`${m(matchId)}/participations`);
  return data;
}

export async function respondToMatch(
  matchId: string,
  response: 'going' | 'not_going',
): Promise<{ participation: Participation; counts: MatchCounts; outcome?: RespondOutcome }> {
  const { data } = await http.put<{ participation: Participation; counts: MatchCounts; outcome?: RespondOutcome }>(
    `${m(matchId)}/participations/me`,
    { response },
  );
  return data;
}

export async function addParticipation(matchId: string, userId: string): Promise<Participation> {
  const { data } = await http.post<Participation>(`${m(matchId)}/participations`, { userId });
  return data;
}

export async function promoteParticipation(matchId: string, participationId: string): Promise<Participation> {
  const { data } = await http.post<Participation>(
    `${m(matchId)}/participations/${encodeURIComponent(participationId)}/promote`,
  );
  return data;
}

export async function removeParticipation(matchId: string, participationId: string): Promise<void> {
  await http.delete(`${m(matchId)}/participations/${encodeURIComponent(participationId)}`);
}
