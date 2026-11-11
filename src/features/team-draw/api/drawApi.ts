import { http, type Schema } from '@/lib/http';

export type DrawTemplate = Schema<'DrawTemplate'>;
export type DrawTemplateInput = Schema<'DrawTemplateInput'>;
export type TeamDraw = Schema<'TeamDraw'>;
export type DrawMove =
  | { kind: 'swap'; userA: string; userB: string }
  | { kind: 'move'; userId: string; toTeamId: string; asReserve?: boolean };

const g = (groupId: string) => `/groups/${encodeURIComponent(groupId)}/draw-templates`;
const m = (matchId: string) => `/matches/${encodeURIComponent(matchId)}/draw`;

export async function listDrawTemplates(groupId: string): Promise<DrawTemplate[]> {
  const { data } = await http.get<{ items: DrawTemplate[] }>(g(groupId));
  return data.items;
}

export async function createDrawTemplate(groupId: string, body: DrawTemplateInput): Promise<DrawTemplate> {
  const { data } = await http.post<DrawTemplate>(g(groupId), body);
  return data;
}

export async function updateDrawTemplate(
  groupId: string,
  templateId: string,
  body: DrawTemplateInput,
): Promise<DrawTemplate> {
  const { data } = await http.put<DrawTemplate>(`${g(groupId)}/${encodeURIComponent(templateId)}`, body);
  return data;
}

export async function deleteDrawTemplate(groupId: string, templateId: string): Promise<void> {
  await http.delete(`${g(groupId)}/${encodeURIComponent(templateId)}`);
}

export async function getDraw(matchId: string): Promise<TeamDraw> {
  const { data } = await http.get<TeamDraw>(m(matchId));
  return data;
}

export async function drawTeams(matchId: string, templateId?: string): Promise<TeamDraw> {
  const { data } = await http.post<TeamDraw>(m(matchId), templateId ? { templateId } : {});
  return data;
}

export async function moveDrawPlayers(matchId: string, move: DrawMove): Promise<TeamDraw> {
  const { data } = await http.post<TeamDraw>(`${m(matchId)}/moves`, move);
  return data;
}

export async function publishDraw(matchId: string): Promise<TeamDraw> {
  const { data } = await http.post<TeamDraw>(`${m(matchId)}/publish`);
  return data;
}
