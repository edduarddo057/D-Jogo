/**
 * Google Identity Services, fluxo de popup: o botão é do app (no visual dele, com o "G" oficial) e
 * o Google devolve um token de acesso que a API confere (tokeninfo + userinfo). O script do Google
 * é baixado assim que a tela de entrar abre, para o popup abrir no mesmo toque (sem bloqueio).
 */
export interface TokenResponse {
  access_token?: string;
  error?: string;
}
export interface TokenClient {
  requestAccessToken(overrides?: { prompt?: '' | 'none' | 'consent' | 'select_account' }): void;
}
interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: 'popup_closed' | 'popup_failed_to_open' | 'unknown' }) => void;
  }): TokenClient;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } };
  }
}

const SRC = 'https://accounts.google.com/gsi/client';
let loading: Promise<GoogleOAuth2> | null = null;

export function loadGoogleOAuth(): Promise<GoogleOAuth2> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  loading ??= new Promise<GoogleOAuth2>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () =>
      window.google?.accounts?.oauth2 ? resolve(window.google.accounts.oauth2) : reject(new Error('gsi'));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('gsi'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
