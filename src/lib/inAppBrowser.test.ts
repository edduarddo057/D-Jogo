import { isInAppBrowser, openInBrowserUrl } from './inAppBrowser';

const ANDROID_WHATSAPP =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0 Mobile Safari/537.36 WhatsApp/2.24';
const IOS_INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';

describe('navegador embutido', () => {
  it('reconhece WhatsApp/Instagram e deixa Chrome e Safari de fora', () => {
    expect(isInAppBrowser(ANDROID_WHATSAPP)).toBe(true);
    expect(isInAppBrowser(IOS_INSTAGRAM)).toBe(true);
    expect(isInAppBrowser(ANDROID_CHROME)).toBe(false);
    expect(isInAppBrowser(IOS_SAFARI)).toBe(false);
  });

  it('no Android abre no Chrome com o convite junto; no iPhone devolve o próprio link', () => {
    const url = 'https://edduarddo057.github.io/D-Jogo/?convite=QZTYW69R';
    expect(openInBrowserUrl(url, ANDROID_WHATSAPP)).toBe(
      'intent://edduarddo057.github.io/D-Jogo/?convite=QZTYW69R#Intent;scheme=https;package=com.android.chrome;' +
        `S.browser_fallback_url=${encodeURIComponent(url)};end`,
    );
    expect(openInBrowserUrl(url, IOS_INSTAGRAM)).toBe(url);
  });
});
