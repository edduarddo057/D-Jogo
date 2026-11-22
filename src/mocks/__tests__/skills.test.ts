import { db } from '../db';
import { toLivePlayer, toMember } from '../serializers';

describe('fundamentos (RN-17a)', () => {
  it('só o dono da turma vê as notas; o jogador não vê nem as próprias', () => {
    const bruno = db.memberships.find((m) => m.id === 'mb_sab_u_bruno');
    if (!bruno) throw new Error('sem membro');
    expect(Object.keys(toMember(bruno, 'u_marina').skills ?? {})).toEqual([
      'serve',
      'reception',
      'attack',
      'setting',
      'pass',
    ]);
    expect(toMember(bruno, 'u_dudu').skills).toBeNull();
    expect(toMember(bruno, 'u_bruno').skills).toBeNull();
  });

  it('o dia de jogo (só do dono) recebe as notas para o sorteio', () => {
    expect(toLivePlayer('u_bruno', 'g_sabado').skills).not.toBeNull();
  });
});
