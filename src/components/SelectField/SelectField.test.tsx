import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/a11y';
import { SelectField } from './SelectField';

const POSITIONS = [
  { value: 'setter', label: 'Levantador(a)' },
  { value: 'libero', label: 'Líbero' },
];

describe('SelectField', () => {
  it('escolhe uma opção e começa no texto de orientação', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <SelectField
        label="Posição principal"
        placeholder="Escolha a posição"
        defaultValue=""
        options={POSITIONS}
        onChange={onChange}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Posição principal' });
    expect(select).toHaveDisplayValue('Escolha a posição');

    await user.selectOptions(select, 'libero');
    expect(select).toHaveValue('libero');
    expect(onChange).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });
});
