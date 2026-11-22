import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('expõe valor, máximo e texto para leitores de tela', async () => {
    const { container } = render(<ProgressBar value={13} max={16} label="13 de 16 confirmados" detail="3 vagas" />);
    const bar = screen.getByRole('progressbar', { name: '13 de 16 confirmados' });
    expect(bar).toHaveAttribute('aria-valuenow', '13');
    expect(bar).toHaveAttribute('aria-valuemax', '16');
    expect(bar).toHaveAttribute('aria-valuetext', '13 de 16 confirmados, 3 vagas');
    expect(bar.firstElementChild).toHaveStyle({ width: '81.25%' });
    await expectNoA11yViolations(container);
  });

  it('não passa de 100%', () => {
    render(<ProgressBar value={20} max={16} label="Lotada" />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '100%' });
  });
});
