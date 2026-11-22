/** "Lucas Almeida" → "LA"; "Mariana" → "MA"; ignora "de", "da", "dos"… */
export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => !/^(d[aeo]s?|e)$/i.test(p));
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Índice estável de 1 a 4 para a cor do avatar (color-avatar-N), a partir do id. */
export function avatarTone(id: string): 1 | 2 | 3 | 4 {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ((hash % 4) + 1) as 1 | 2 | 3 | 4;
}
