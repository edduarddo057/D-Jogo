import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePwaStore, type BeforeInstallPromptEvent } from '@/stores';
import { InstallAppCard } from './InstallAppCard';

const reset = () =>
  usePwaStore.setState({
    isStandalone: false,
    platform: 'unsupported',
    deferredPrompt: null,
    updateAvailable: false,
    applyUpdate: null,
  });

describe('InstallAppCard', () => {
  beforeEach(reset);

  it('Android/desktop: usa o convite nativo e marca como instalado ao aceitar', async () => {
    const prompt = vi.fn(() => Promise.resolve());
    const event = {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    } as unknown as BeforeInstallPromptEvent;
    usePwaStore.getState().setDeferredPrompt(event);
    const user = userEvent.setup();
    render(<InstallAppCard />);

    await user.click(screen.getByRole('button', { name: 'Instalar app' }));
    expect(prompt).toHaveBeenCalledOnce();
    expect(await screen.findByText(/já está usando o Dá Jogo instalado/)).toBeInTheDocument();
  });

  it('iPhone: mostra os passos do Safari', () => {
    usePwaStore.setState({ platform: 'ios' });
    render(<InstallAppCard />);
    expect(screen.getByText('Adicionar à Tela de Início')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument();
  });

  it('navegador sem suporte: orienta a abrir no Chrome ou Safari', () => {
    render(<InstallAppCard />);
    expect(screen.getByText(/abra o Dá Jogo no Chrome/)).toBeInTheDocument();
  });
});
