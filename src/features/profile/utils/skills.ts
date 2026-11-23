/** Notas nos fundamentos sendo editadas (null = sem nota). */
export type SkillScores = Record<string, number | null>;

/** Só as notas preenchidas, no formato da API (fundamento → nota); nenhuma = null (RN-17a). */
export function filledSkills(value: SkillScores): Record<string, number> | null {
  const entries = Object.entries(value).filter((e): e is [string, number] => typeof e[1] === 'number');
  return entries.length ? Object.fromEntries(entries) : null;
}
