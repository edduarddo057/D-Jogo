import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from './Toast';

describe('Toast', () => {
  it('usa role="status" para avisos e role="alert" para erros', () => {
    const { rerender } = render(<Toast message="Presença confirmada" tone="success" />);
    expect(screen.getByRole('status')).toHaveTextContent('Presença confirmada');

    rerender(<Toast message="Sem conexão" tone="error" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão');
  });

  it('executa a ação e o fechar pelo teclado', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    render(<Toast message="Vaga liberada" action={{ label: 'Desfazer', onAction }} onDismiss={onDismiss} />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
