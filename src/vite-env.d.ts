/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_MOCK?: string;
  /** Integração gradual: módulos que continuam simulados, ex.: "draws,payments". */
  readonly VITE_API_MOCK_ONLY?: string;
  readonly VITE_APP_URL: string;
  readonly VITE_TERMS_VERSION: string;
  readonly VITE_PRIVACY_CONTACT?: string;
  /** Modo demonstração: SHA-256 (hex) da senha de /demo. Sem ela, a demo fica fechada. */
  readonly VITE_DEMO_PASSWORD_HASH?: string;
  /** Modo demonstração: por quantos dias os dados ficam salvos no aparelho (padrão 30). */
  readonly VITE_DEMO_DAYS?: string;
  /** Client ID do Google para "Entrar com Google" (vazio = sem o botão). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** "false" esconde o login pelo celular (sem envio de código por WhatsApp/SMS). */
  readonly VITE_PHONE_LOGIN?: string;
}

/** Versão do app (package.json), commit do build e quando foi gerado (vite.config.ts). */
declare const __APP_VERSION__: string;
declare const __APP_BUILD__: string;
declare const __APP_BUILT_AT__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
