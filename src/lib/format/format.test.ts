import { formatCents, parseMoneyToCents } from './money';
import { formatDayOfMonth, formatMatchLong, formatMatchShort, formatRemaining, formatTimeRange } from './dates';
import { formatE164Brazil, maskBrazilianPhone, toE164Brazil } from './phone';
import { avatarTone, initials } from './initials';

describe('dinheiro', () => {
  it('formata centavos em reais', () => {
    expect(formatCents(2500)).toBe('R$ 25,00');
    expect(formatCents(126000)).toBe('R$ 1.260,00');
  });

  it.each([
    ['25,00', 2500],
    ['R$ 1.260,5', 126050],
    ['25', 2500],
    ['0,99', 99],
  ])('converte "%s" em %i centavos', (input, cents) => {
    expect(parseMoneyToCents(input)).toBe(cents);
  });

  it('recusa valores inválidos', () => {
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('abc')).toBeNull();
    expect(parseMoneyToCents('1,234')).toBeNull();
  });
});

describe('datas no fuso da turma', () => {
  const start = '2026-09-24T23:00:00Z'; // 20:00 em São Paulo
  const end = '2026-09-25T01:00:00Z';

  it('formata o card e o detalhe', () => {
    expect(formatMatchShort(start)).toBe('Qui, 24 set · 20:00');
    expect(formatMatchLong(start)).toBe('Quinta-feira, 24 de setembro de 2026');
    expect(formatTimeRange(start, end)).toBe('20:00 às 22:00');
    expect(formatDayOfMonth(start)).toBe('24');
  });

  it('calcula o tempo restante', () => {
    const now = new Date('2026-09-24T22:00:00Z');
    expect(formatRemaining('2026-09-24T23:52:00Z', now)).toBe('1h 52min');
    expect(formatRemaining('2026-09-24T22:15:30Z', now)).toBe('15min');
    expect(formatRemaining('2026-09-24T21:00:00Z', now)).toBe('0min');
  });
});

describe('telefone', () => {
  it('aplica a máscara conforme a digitação', () => {
    expect(maskBrazilianPhone('2')).toBe('(2');
    expect(maskBrazilianPhone('21998')).toBe('(21) 998');
    expect(maskBrazilianPhone('21998765432')).toBe('(21) 99876-5432');
  });

  it('converte para E.164 e de volta', () => {
    expect(toE164Brazil('(21) 99876-5432')).toBe('+5521998765432');
    expect(toE164Brazil('2199876')).toBeNull();
    expect(formatE164Brazil('+5521998765432')).toBe('(21) 99876-5432');
  });
});

describe('iniciais e cor do avatar', () => {
  it('pega primeiro e último nome, ignorando preposições', () => {
    expect(initials('Lucas Almeida')).toBe('LA');
    expect(initials('Ana Maria dos Santos')).toBe('AS');
    expect(initials('Mariana')).toBe('MA');
  });

  it('gera sempre a mesma cor para o mesmo id', () => {
    expect(avatarTone('u_123')).toBe(avatarTone('u_123'));
    expect([1, 2, 3, 4]).toContain(avatarTone('qualquer'));
  });
});
