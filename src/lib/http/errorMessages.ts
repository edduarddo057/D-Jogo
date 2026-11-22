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
  NICKNAME_TAKEN: 'Esse apelido já existe. Escolha outro.',
  USER_NOT_FOUND: 'Nenhum jogador com esse apelido.',
  ALREADY_MEMBER: 'Essa pessoa já está na turma.',
  OWNER_CANNOT_LEAVE: 'Quem organiza não sai da turma. Passe a turma para alguém ou encerre-a.',
  OWNER_HAS_ACTIVE_GROUPS: 'Antes de excluir a conta, passe suas turmas para alguém ou encerre-as.',
  INVITE_INVALID: 'Esse convite não vale mais. Peça um novo link a quem organiza.',
  MATCH_NOT_OPEN: 'A lista deste jogo já fechou. Fale com quem organiza.',
  MATCH_INVALID_TRANSITION: 'Não dá para fazer isso nesta etapa do jogo.',
  DEADLINE_AFTER_START: 'O prazo de resposta precisa terminar antes do jogo começar.',
  CAPACITY_BELOW_OCCUPIED: 'Já há mais gente confirmada do que esse limite. Remova alguém antes.',
  NO_FREE_SPOT: 'Lista cheia. Entre na fila e a gente avisa se abrir vaga.',
  NOT_ON_WAITLIST: 'Essa pessoa não está na fila.',
  PAYMENTS_TO_REVIEW: 'Confira os pagamentos em aberto antes de fechar a lista.',
  PAYMENT_INVALID_TRANSITION: 'Esse pagamento já foi resolvido.',
  PAYMENT_WINDOW_EXPIRED: 'O prazo para pagar acabou e a vaga foi liberada.',
  NOT_ENOUGH_PLAYERS: 'Marque pelo menos 2 pessoas que chegaram para sortear.',
  ROUND_TIED: 'Empate não pode ser encerrado. Jogue o próximo ponto.',
  LIVE_NOT_AVAILABLE: 'Este jogo já terminou ou foi cancelado.',
  LEDGER_ENTRY_NOT_MANUAL: 'Para corrigir, estorne o lançamento.',
  LEDGER_ENTRY_ALREADY_REVERSED: 'Este lançamento já foi estornado.',
  LIST_NOT_OPEN_YET: 'A lista ainda não abriu. A gente avisa quando abrir.',
  ALREADY_ANSWERED: 'Já tem gente que respondeu. Edite o jogo em vez de desfazer.',
  PHONE_IN_USE: 'Esse número já está em outra conta.',
  NOT_A_MEMBER: 'Essa pessoa não está na turma.',
  NETWORK_ERROR: 'Sem conexão. Confira sua internet e tente de novo.',
  TIMEOUT: 'O servidor demorou para responder. Tente de novo.',
  UNKNOWN: 'Algo deu errado. Tente de novo.',
};

export function messageFor(code: ApiErrorCode): string {
  return errorMessages[code];
}
