import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expectNoA11yViolations } from '@/test/a11y';
import { MoneyField } from './MoneyField';

function Harness({ onCents }: { onCents: (c: number | null) => void }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <MoneyField
      label="Valor do avulso"
      value={value}
      onChange={(c) => {
        setValue(c);
        onCents(c);
      }}
    />
  );
}

describe('MoneyField', () => {
  it('converte o que a pessoa digita em centavos e formata ao sair', async () => {
    const user = userEvent.setup();
    const onCents = vi.fn();
    const { container } = render(<Harness onCents={onCents} />);
    const input = screen.getByLabelText('Valor do avulso');

    expect(input).toHaveAttribute('inputmode', 'decimal');
    await user.type(input, '25');
    expect(onCents).toHaveBeenLastCalledWith(2500);
    await user.tab();
    expect(input).toHaveValue('25,00');

    await user.clear(input);
    await user.type(input, '1.260,5');
    expect(onCents).toHaveBeenLastCalledWith(126050);
    await user.tab();
    expect(input).toHaveValue('1.260,50');
    await expectNoA11yViolations(container);
  });

  it('ignora letras e devolve null quando vazio', async () => {
    const user = userEvent.setup();
    const onCents = vi.fn();
    render(<Harness onCents={onCents} />);
    const input = screen.getByLabelText('Valor do avulso');
    await user.type(input, 'abc');
    expect(input).toHaveValue('');
    await user.type(input, '9');
    await user.clear(input);
    expect(onCents).toHaveBeenLastCalledWith(null);
  });
});
