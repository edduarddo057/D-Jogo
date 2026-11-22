import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus, X } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { expectNoA11yViolations } from '@/test/a11y';
import { Button, ButtonLink, Fab, IconButton } from './Button';

describe('Button', () => {
  it('dispara o clique pelo mouse e pelo teclado e é type="button" por padrão', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Confirmar</Button>);
    const button = screen.getByRole('button', { name: 'Confirmar' });

    expect(button).toHaveAttribute('type', 'button');
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('em loading fica ocupado, desabilitado e não dispara clique', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('IconButton exige rótulo acessível; ButtonLink é um link', async () => {
    const { container } = render(
      <MemoryRouter>
        <IconButton label="Fechar" icon={<X aria-hidden="true" />} />
        <ButtonLink to="/partidas/1">Ver partida</ButtonLink>
        <Fab icon={<Plus aria-hidden="true" />}>Jogador</Fab>
        <Button variant="danger">Não vou</Button>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver partida' })).toHaveAttribute('href', '/partidas/1');
    expect(screen.getByRole('button', { name: 'Jogador' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
