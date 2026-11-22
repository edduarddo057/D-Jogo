import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import { Badge } from '../Badge';
import { Card, HeroCard } from './Card';

describe('Card e HeroCard', () => {
  it('HeroCard tem título no nível pedido, sobretítulo e conteúdo', async () => {
    const { container } = render(
      <main>
        <HeroCard eyebrow="Próxima partida" title="Partida de quarta" meta="Qua, 24 set · 20:00">
          <Badge tone="warning">Responda até ter, 18:00</Badge>
        </HeroCard>
        <Card as="section" aria-label="Detalhes">
          <p>Conteúdo</p>
        </Card>
      </main>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Partida de quarta' })).toBeInTheDocument();
    expect(screen.getByText('Próxima partida')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Detalhes' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
