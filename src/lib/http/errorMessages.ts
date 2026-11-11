import type { ApiErrorCode } from './apiError';

/**
 * Mensagem em pt-BR para cada código de erro do contrato.
 * O tipo `Record<ApiErrorCode, string>` faz o TypeScript falhar se um código novo
 * entrar no openapi.yaml sem mensagem aqui.
 */
export const errorMessages: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: 'Confira os campos destacados.',
  UNAUTHENTICATED: 'Sua sessão expirou. Entre de novo.',
  FORBIDDEN: 'Você não tem permissão para fazer isso.',
  NOT_FOUND: 'Não encontramos o que você procurou.',
  RATE_LIMITED: 'Muitas tentativas. Espere um pouco e tente de novo.',
  OTP_INVALID: 'Código incorreto. Confira e tente de novo.',
  OTP_EXPIRED: 'O código expirou. Peça um novo.',
  OTP_TOO_MANY_ATTEMPTS: 'Muitas tentativas com esse código. Peça um novo.',
  TERMS_UPDATE_REQUIRED: 'Os termos de uso mudaram. Aceite a nova versão para continuar.',
  PROFILE_INCOMPLETE: 'Complete seu perfil para continuar.',
  NICKNAME_TAKEN: 'Esse nickname já está em uso.',
  USER_NOT_FOUND: 'Nenhum jogador com esse nickname.',
  ALREADY_MEMBER: 'Essa pessoa já está na turma.',
  OWNER_CANNOT_LEAVE: 'Quem organiza a turma não pode sair dela. Arquive a turma se quiser encerrá-la.',
  OWNER_HAS_ACTIVE_GROUPS: 'Arquive as turmas que você organiza antes de excluir a conta.',
  INVITE_INVALID: 'Esse convite não vale mais. Peça um novo link a quem organiza.',
  MATCH_NOT_OPEN: 'A lista desta partida já está fechada.',
  MATCH_INVALID_TRANSITION: 'Essa ação não é possível nesta etapa da partida.',
  DEADLINE_AFTER_START: 'O prazo de resposta precisa terminar antes do início da partida.',
  CAPACITY_BELOW_OCCUPIED: 'Já há mais gente confirmada do que esse limite. Remova alguém antes.',
  NO_FREE_SPOT: 'Não há vaga livre nesta partida.',
  NOT_ON_WAITLIST: 'Essa pessoa não está na lista de espera.',
  PAYMENTS_TO_REVIEW: 'Valide os pagamentos pendentes antes de fechar a lista.',
  PAYMENT_INVALID_TRANSITION: 'Esse pagamento já foi resolvido.',
  PAYMENT_WINDOW_EXPIRED: 'O prazo para pagar acabou e a vaga foi liberada.',
  LIST_NOT_CLOSED: 'Feche a lista antes de sortear os times.',
  NOT_ENOUGH_PLAYERS: 'Não há jogadores confirmados suficientes para formar os times.',
  DRAW_ALREADY_PUBLISHED: 'Os times já foram publicados. Refaça o sorteio para mudar.',
  LEDGER_ENTRY_NOT_MANUAL: 'Lançamentos de pagamentos não podem ser excluídos.',
  NETWORK_ERROR: 'Sem conexão. Confira sua internet e tente de novo.',
  TIMEOUT: 'O servidor demorou para responder. Tente de novo.',
  UNKNOWN: 'Algo deu errado. Tente de novo.',
};

export function messageFor(code: ApiErrorCode): string {
  return errorMessages[code];
}
