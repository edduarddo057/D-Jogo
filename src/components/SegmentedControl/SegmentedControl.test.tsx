import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { expectNoA11yViolations } from '@/test/a11y';
import { SegmentedControl, SegmentedNav } from './SegmentedControl';

type Tab = 'lista' | 'pendentes' | 'espera';
function Harness() {
  const [tab, setTab] = useState<Tab>('lista');
  return (
    <SegmentedControl
      label="Presenças"
      value={tab}
      onChange={setTab}
      options={[
        { value: 'lista', label: 'Lista (13)' },
        { value: 'pendentes', label: 'Sem resposta (2)' },
        { value: 'espera', label: 'Espera (3)' },
      ]}
    />
  );
}

describe('SegmentedControl', () => {
  it('segue o padrão de abas: uma tabulação, setas, Home e End', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Presenças' })).toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Lista (13)' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Sem resposta (2)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Sem resposta (2)' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Espera (3)' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Lista (13)' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Espera (3)' }));
    expect(screen.getByRole('tab', { name: 'Espera (3)' })).toHaveAttribute('aria-selected', 'true');
    await expectNoA11yViolations(container);
  });

  it('SegmentedNav marca a sub-rota atual com aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/turmas/g1/partidas']}>
        <SegmentedNav
          label="Seções da turma"
          items={[
            { to: '/turmas/g1/jogadores', label: 'Jogadores' },
            { to: '/turmas/g1/partidas', label: 'Partidas' },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Partidas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Jogadores' })).not.toHaveAttribute('aria-current');
  });
});
