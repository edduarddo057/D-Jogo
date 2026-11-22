import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expectNoA11yViolations } from '@/test/a11y';
import { OtpInput } from './OtpInput';

function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <>
      <OtpInput value={code} onChange={setCode} {...(onComplete ? { onComplete } : {})} />
      <output data-testid="valor">{code}</output>
    </>
  );
}

const cell = (n: number) => screen.getByRole('textbox', { name: `Dígito ${n} de 6` });

describe('OtpInput', () => {
  it('avança a cada dígito e completa com 6', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const { container } = render(<Harness onComplete={onComplete} />);

    await user.click(cell(1));
    await user.keyboard('482193');
    expect(screen.getByTestId('valor')).toHaveTextContent('482193');
    expect(onComplete).toHaveBeenCalledWith('482193');
    expect(cell(1)).toHaveAttribute('autocomplete', 'one-time-code');
    await expectNoA11yViolations(container);
  });

  it('ignora letras, volta com Backspace e navega pelas setas', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(cell(1));
    await user.keyboard('4a8');
    expect(screen.getByTestId('valor')).toHaveTextContent('48');
    expect(cell(3)).toHaveFocus();

    await user.keyboard('{Backspace}');
    expect(cell(2)).toHaveFocus();
    expect(screen.getByTestId('valor')).toHaveTextContent('4');

    await user.keyboard('{ArrowLeft}');
    expect(cell(1)).toHaveFocus();
  });

  it('colar o código inteiro distribui nas casas', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    await user.click(cell(1));
    await user.paste('123-456');
    expect(onComplete).toHaveBeenCalledWith('123456');
    expect(cell(6)).toHaveValue('6');
  });

  it('mostra o erro ligado ao grupo', () => {
    render(<OtpInput value="" onChange={() => {}} error="Código incorreto." />);
    expect(screen.getByRole('group')).toHaveAccessibleDescription('Código incorreto.');
  });
});
