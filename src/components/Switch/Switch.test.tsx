import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expectNoA11yViolations } from '@/test/a11y';
import { Switch } from './Switch';

function Harness() {
  const [on, setOn] = useState(false);
  return (
    <Switch
      label="Subir automaticamente"
      description="Quando uma vaga abre, o 1º da fila entra sem você aprovar."
      checked={on}
      onCheckedChange={setOn}
    />
  );
}

describe('Switch', () => {
  it('alterna pelo clique, pelo rótulo e pelo teclado', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Subir automaticamente' });

    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(sw).toHaveAccessibleDescription('Quando uma vaga abre, o 1º da fila entra sem você aprovar.');

    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByText('Subir automaticamente'));
    expect(sw).toHaveAttribute('aria-checked', 'false');

    sw.focus();
    await user.keyboard(' ');
    expect(sw).toHaveAttribute('aria-checked', 'true');
    await expectNoA11yViolations(container);
  });

  it('desabilitado não muda', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch label="Liberar vaga sem resposta" checked={false} onCheckedChange={onChange} disabled />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
