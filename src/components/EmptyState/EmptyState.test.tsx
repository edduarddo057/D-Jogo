import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersRound } from 'lucide-react';
import { expectNoA11yViolations } from '@/test/a11y';
import { Button } from '../Button';
import { EmptyState, ErrorState } from './EmptyState';
import { SkeletonList } from '../Skeleton';
import { PageHeader } from '../PageHeader';
import { MemoryRouter } from 'react-router';

describe('estados de tela', () => {
  it('EmptyState orienta e oferece a ação', async () => {
    const { container } = render(
      <EmptyState
        icon={UsersRound}
        title="Nenhuma turma ainda"
        description="Crie sua turma ou peça o link de convite a quem organiza."
        action={<Button>Criar turma</Button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Nenhuma turma ainda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar turma' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('ErrorState é anunciado e chama o "Tentar de novo"', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para carregar');
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('SkeletonList anuncia o carregamento sem expor as formas', async () => {
    const { container } = render(<SkeletonList rows={2} label="Carregando partidas…" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Carregando partidas…');
    await expectNoA11yViolations(container);
  });

  it('PageHeader tem um h1 e o voltar com rótulo', async () => {
    const { container } = render(
      <MemoryRouter>
        <PageHeader
          title="Presenças"
          subtitle="Partida de quarta · 24 set"
          back={{ to: '/partidas/m1', label: 'Voltar para a partida' }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Presenças' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para a partida' })).toHaveAttribute('href', '/partidas/m1');
    await expectNoA11yViolations(container);
  });
});
