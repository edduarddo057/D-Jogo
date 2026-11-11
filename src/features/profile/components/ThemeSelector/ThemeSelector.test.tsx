import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { THEME_STORAGE_KEY, useThemeStore } from '@/stores';
import { ThemeSelector } from './ThemeSelector';

describe('ThemeSelector', () => {
  beforeEach(() => useThemeStore.setState({ preference: 'system', resolved: 'light' }));

  it('aplica o tema escolhido no <html>, no theme-color e salva a preferência', async () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    const user = userEvent.setup();
    render(<ThemeSelector />);

    expect(screen.getByRole('radio', { name: /Automático/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Escuro/ }));

    expect(screen.getByRole('radio', { name: /Escuro/ })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(meta).toHaveAttribute('content', '#0b1622');
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}')).toMatchObject({
      state: { preference: 'dark' },
    });
    meta.remove();
  });

  it('é um grupo de rádio navegável pelo teclado', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />);
    expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole('radio', { name: /Automático/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /Claro/ })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
