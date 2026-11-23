/**
 * Tira o código de um link de convite. Aceita o formato atual ("…/D-Jogo/?convite=SABADO25"), o
 * antigo ("…/convite/SABADO25") ou só o código ("SABADO25").
 */
export function inviteCodeFrom(text: string): string | null {
  const m =
    /[?&]convite=([A-Za-z0-9]{6,10})\b/.exec(text) ??
    /(?:convite|c)\/([A-Za-z0-9]{6,10})/.exec(text) ??
    /^\s*([A-Za-z0-9]{6,10})\s*$/.exec(text);
  return m?.[1]?.toUpperCase() ?? null;
}

/**
 * Link de convite no formato atual: abre a raiz do app (o GitHub Pages responde 200, sem passar
 * pelo 404.html) e o app leva para /convite/CÓDIGO. Ver openInviteFromQuery.
 */
export const inviteLink = (code: string) =>
  `${window.location.origin}${import.meta.env.BASE_URL}?convite=${encodeURIComponent(code)}`;

/**
 * Chegou por um link "?convite=CÓDIGO": troca o endereço por /convite/CÓDIGO antes de o roteador
 * montar, sem criar uma entrada a mais no histórico.
 */
export function openInviteFromQuery() {
  const code = new URLSearchParams(window.location.search).get('convite');
  if (!code || !/^[A-Za-z0-9]{6,10}$/.test(code)) return;
  window.history.replaceState(null, '', `${import.meta.env.BASE_URL}convite/${code.toUpperCase()}`);
}
