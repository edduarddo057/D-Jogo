/** Configuração pública do app (variáveis VITE_*). Nada aqui é segredo: vai para o bundle. */

/** Versão vigente dos termos de uso e da política de privacidade (RN-05). */
export const TERMS_VERSION: string = import.meta.env.VITE_TERMS_VERSION ?? '2026-11';

/** Canal de contato do encarregado de dados (LGPD, art. 41). Definir antes da publicação. */
export const PRIVACY_CONTACT: string = import.meta.env.VITE_PRIVACY_CONTACT ?? 'privacidade@dajogo.app';

/** Client ID do Google (OAuth, tipo Web). Sem ele, o botão "Entrar com Google" não aparece. */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

/**
 * Entrar pelo celular com código. Desligado enquanto não houver envio por WhatsApp/SMS na API
 * publicada; aí o celular vira só contato, informado no perfil.
 */
export const PHONE_LOGIN: boolean = import.meta.env.VITE_PHONE_LOGIN !== 'false';

/**
 * Endereço dentro do app, com a base do build: "/" no dev e nos testes, "/D-Jogo/" no GitHub Pages
 * (que publica numa subpasta). Use para imagens de public/ e recarregamentos com window.location.
 */
export const appUrl = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
