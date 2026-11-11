import { fireEvent, render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import { Avatar, AvatarStack } from './Avatar';

describe('Avatar', () => {
  it('mostra iniciais com nome acessível; decorativo some para leitores de tela', async () => {
    const { container } = render(
      <>
        <Avatar id="u1" name="Lucas Almeida" />
        <Avatar id="u2" name="Mariana Costa" decorative />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Lucas Almeida' })).toHaveTextContent('LA');
    expect(screen.queryByRole('img', { name: 'Mariana Costa' })).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('volta para as iniciais se a foto falhar', () => {
    render(<Avatar id="u1" name="Lucas Almeida" src="https://exemplo.invalid/foto.jpg" />);
    const avatar = screen.getByRole('img', { name: 'Lucas Almeida' });
    const img = avatar.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(avatar).toHaveTextContent('LA');
  });

  it('AvatarStack resume os nomes e o restante', () => {
    const people = ['Lucas Almeida', 'Mariana Costa', 'Rafael Lima'].map((name, i) => ({ id: `u${i}`, name }));
    render(<AvatarStack people={people} total={13} max={3} />);
    expect(screen.getByRole('img', { name: 'Lucas, Mariana, Rafael e mais 10' })).toHaveTextContent('+10');
  });
});
