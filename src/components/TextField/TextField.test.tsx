import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { expectNoA11yViolations } from '@/test/a11y';
import { DateField, TextField, TimeField } from './TextField';

describe('TextField', () => {
  it('liga rótulo, dica e erro ao input', async () => {
    const { container } = render(
      <TextField label="Nickname" hint="De 3 a 20 letras" error="Esse nickname já está em uso." />,
    );
    const input = screen.getByLabelText('Nickname');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Esse nickname já está em uso. De 3 a 20 letras');
    expect(screen.getByRole('alert')).toHaveTextContent('Esse nickname já está em uso.');
    await expectNoA11yViolations(container);
  });

  it('funciona com React Hook Form + Zod (register e erro de validação)', async () => {
    const schema = z.object({ name: z.string().min(2, 'Digite seu nome') });
    function Form({ onValid }: { onValid: (v: { name: string }) => void }) {
      const { register, handleSubmit, formState } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { name: '' },
      });
      return (
        <form onSubmit={handleSubmit(onValid)}>
          <TextField label="Nome" {...register('name')} error={formState.errors.name?.message} />
          <button type="submit">Enviar</button>
        </form>
      );
    }
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Form onValid={onValid} />);

    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Digite seu nome');
    expect(screen.getByLabelText('Nome')).toHaveFocus();

    await user.type(screen.getByLabelText('Nome'), 'Lucas');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onValid).toHaveBeenCalledWith({ name: 'Lucas' }, expect.anything());
  });

  it('DateField e TimeField usam os seletores nativos', () => {
    render(
      <>
        <DateField label="Data" />
        <TimeField label="Início" />
      </>,
    );
    expect(screen.getByLabelText('Data')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Início')).toHaveAttribute('type', 'time');
  });
});
