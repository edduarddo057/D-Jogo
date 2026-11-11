import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expectNoA11yViolations } from '@/test/a11y';
import { Badge } from '../Badge';
import { DateTile, List, ListItem } from './List';

describe('List e ListItem', () => {
  it('a linha inteira é o link, com título e metadados no nome', async () => {
    const { container } = render(
      <MemoryRouter>
        <List label="Próximas partidas">
          <ListItem
            to="/partidas/m1"
            leading={<DateTile day="24" />}
            title="Partida de quarta"
            meta="Qua, 24 set · 20:00"
          />
          <ListItem title="Rafael Lima" meta="Avulso" trailing={<Badge tone="success">Pago</Badge>} />
        </List>
      </MemoryRouter>,
    );
    expect(screen.getByRole('list', { name: 'Próximas partidas' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /^Partida de quarta,\s?Qua, 24 set · 20:00$/ })).toHaveAttribute(
      'href',
      '/partidas/m1',
    );
    await expectNoA11yViolations(container);
  });

  it('com onClick vira botão', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <List>
        <ListItem title="1º · Carla Dias" meta="Avulsa" onClick={onClick} />
      </List>,
    );
    await user.click(screen.getByRole('button', { name: /Carla Dias/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
