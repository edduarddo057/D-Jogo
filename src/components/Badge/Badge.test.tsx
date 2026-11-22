import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import { Badge } from './Badge';

describe('Badge', () => {
  it('mostra o estado por texto (o ponto é decorativo)', async () => {
    const { container } = render(
      <>
        <Badge tone="success">Confirmado</Badge>
        <Badge tone="warning" dot>
          Pendente
        </Badge>
        <Badge tone="info">Lista de espera · 2º</Badge>
      </>,
    );
    expect(screen.getByText('Pendente')).toHaveTextContent(/^Pendente$/);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
