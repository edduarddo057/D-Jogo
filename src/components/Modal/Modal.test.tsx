import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expectNoA11yViolations } from '@/test/a11y';
import { Button } from '../Button';
import { Modal } from './Modal';

function Harness({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Convidar avulso</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Convidar avulso"
        description="O jogador recebe um link para esta partida."
        actions={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onConfirm}>Convidar</Button>
          </>
        }
      >
        <p>Conteúdo do formulário</p>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('abre como diálogo nomeado e fecha pelo botão Fechar e pelo Cancelar', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Convidar avulso' }));

    const dialog = screen.getByRole('dialog', { name: 'Convidar avulso' });
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription('O jogador recebe um link para esta partida.');
    await expectNoA11yViolations(container);

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Convidar avulso' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Esc (cancel) e clique no fundo pedem para fechar', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Convidar avulso' }));

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Convidar avulso' }));
    await user.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
