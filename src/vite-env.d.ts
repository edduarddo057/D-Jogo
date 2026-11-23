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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
