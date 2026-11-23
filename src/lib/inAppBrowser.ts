/**
 * Navegadores embutidos em apps (WhatsApp, Instagram, Facebook, TikTok…): o Google não deixa
 * entrar com a conta neles ("disallowed_useragent"). Detecta para oferecer "Abrir no navegador".
 */
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|TikTok|musical_ly|Snapchat|Twitter|LinkedInApp|; wv\)/i;

export function isInAppBrowser(ua: string = navigator.userAgent): boolean {
  return IN_APP.test(ua);
}

export const isAndroid = (ua: string = navigator.userAgent) => /Android/i.test(ua);

/**
 * Endereço para abrir fora do app de mensagens. No Android, um link intent:// pede para o Chrome
 * abrir (se não houver Chrome, cai no navegador padrão pelo browser_fallback_url).
 */
export function openInBrowserUrl(url: string, ua: string = navigator.userAgent): string {
  if (!isAndroid(ua)) return url;
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}
