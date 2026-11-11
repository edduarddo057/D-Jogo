import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/components/EmptyState';

interface State {
  error: Error | null;
}

/**
 * Última proteção: erro de renderização fora das rotas (cada rota já tem errorElement).
 * O app nunca fica em branco; "Tentar de novo" recarrega a página.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Ponto único para ligar um serviço de monitoramento (fase 2).
    console.error('Erro não tratado na interface', error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <main style={{ padding: 'var(--space-6)' }}>
          <h1 className="visually-hidden">Erro</h1>
          <ErrorState
            title="Algo deu errado"
            description="Recarregue o app para continuar. Se o erro voltar, avise quem organiza a turma."
            onRetry={() => window.location.reload()}
          />
        </main>
      );
    }
    return this.props.children;
  }
}
