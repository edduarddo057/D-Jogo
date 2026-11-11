import type { Invite } from '../api/invitesApi';

/** Texto pronto para WhatsApp e compartilhar. */
export function inviteMessage(groupName: string, invite: Pick<Invite, 'membershipType' | 'url'>) {
  const as = invite.membershipType === 'monthly' ? 'mensalista' : 'avulso';
  return `Bora jogar com a gente? Entre na turma ${groupName} como ${as} no Dá Jogo: ${invite.url}`;
}
