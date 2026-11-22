/** Cor do time: tokens color-team-1 a 8 (azul × laranja primeiro, seguro para daltonismo). */
export const teamColor = (index: number) => `var(--color-team-${(index % 8) + 1})`;

const NAMES = ['Azul', 'Laranja', 'Roxo', 'Verde', 'Rosa', 'Oliva', 'Cinza', 'Âmbar'];
/** Nome do time pela cor ("Azul"). */
export const teamName = (index: number) => NAMES[index % 8] ?? `Time ${index + 1}`;
/** Letra do time (manual 4.3: nada depende só da cor): A, B, C… */
export const teamLetter = (index: number) => String.fromCharCode(65 + (index % 26));
