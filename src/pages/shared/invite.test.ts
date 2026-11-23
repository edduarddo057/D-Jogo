import { inviteCodeFrom, openInviteFromQuery } from './invite';

describe('link de convite', () => {
  it('lê o formato novo, o antigo e só o código', () => {
    expect(inviteCodeFrom('https://edduarddo057.github.io/D-Jogo/?convite=qztyw69r')).toBe('QZTYW69R');
    expect(inviteCodeFrom('https://edduarddo057.github.io/D-Jogo/convite/QZTYW69R')).toBe('QZTYW69R');
    expect(inviteCodeFrom('  QZTYW69R ')).toBe('QZTYW69R');
    expect(inviteCodeFrom('https://exemplo.com/')).toBeNull();
  });

  it('?convite=CÓDIGO vira /convite/CÓDIGO sem criar entrada no histórico', () => {
    window.history.replaceState(null, '', '/?convite=qztyw69r');
    const before = window.history.length;
    openInviteFromQuery();
    expect(window.location.pathname).toBe('/convite/QZTYW69R');
    expect(window.location.search).toBe('');
    expect(window.history.length).toBe(before);
  });
});
