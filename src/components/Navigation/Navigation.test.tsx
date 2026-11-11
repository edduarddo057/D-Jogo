import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarDays, House } from 'lucide-react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expectNoA11yViolations } from '@/test/a11y';
import { Navigation } from './Navigation';

const items = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/partidas', label: 'Partidas', icon: CalendarDays },
];

describe('Navigation', () => {
  it('marca o item ativo e navega', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([{ path: '*', element: <Navigation items={items} /> }], {
      initialEntries: ['/'],
    });
    const { container } = render(<RouterProvider router={router} />);

    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('link', { name: 'Partidas' }));
    expect(router.state.location.pathname).toBe('/partidas');
    expect(screen.getByRole('link', { name: 'Partidas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
    await expectNoA11yViolations(container);
  });

  it('subrota mantém a aba ativa (Partidas em /partidas/m1)', () => {
    const router = createMemoryRouter([{ path: '*', element: <Navigation items={items} /> }], {
      initialEntries: ['/partidas/m1'],
    });
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('link', { name: 'Partidas' })).toHaveAttribute('aria-current', 'page');
  });
});
