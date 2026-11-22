/** Tira o código de um link de convite ("dajogo.app/convite/SABADO25" ou só "SABADO25"). */
export function inviteCodeFrom(text: string): string | null {
  const m = /(?:convite|c)\/([A-Za-z0-9]{6,10})/.exec(text) ?? /^\s*([A-Za-z0-9]{6,10})\s*$/.exec(text);
  return m?.[1]?.toUpperCase() ?? null;
}
