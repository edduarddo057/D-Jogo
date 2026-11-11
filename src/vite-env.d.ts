/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_MOCK?: string;
  /** Integração gradual: módulos que continuam simulados, ex.: "draws,payments". */
  readonly VITE_API_MOCK_ONLY?: string;
  readonly VITE_APP_URL: string;
  readonly VITE_TERMS_VERSION: string;
  readonly VITE_PRIVACY_CONTACT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
