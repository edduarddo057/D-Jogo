/**
 * Google Identity Services (botão "Entrar com Google"). O script do Google só é baixado na tela
 * de entrar; o botão entrega um ID token (`credential`) que a API confere.
 */
interface CredentialResponse {
  credential?: string;
}
interface GoogleId {
  initialize(options: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_button?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    },
  ): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SRC = 'https://accounts.google.com/gsi/client';
let loading: Promise<GoogleId> | null = null;

export function loadGoogleIdentity(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('gsi')));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('gsi'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
