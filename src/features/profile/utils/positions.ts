import type { Sport } from '../api/meApi';

/** "Meia · Atacante" a partir dos ids de posição. */
export function positionLabels(
  sports: Sport[] | undefined,
  sportId: string,
  ids: string[] | null | undefined,
  sep = ' · ',
) {
  const sport = sports?.find((s) => s.id === sportId);
  return (ids ?? [])
    .map((id) => sport?.positions.find((p) => p.id === id)?.label.replace(/\(a\)$/, '') ?? id)
    .join(sep);
}
