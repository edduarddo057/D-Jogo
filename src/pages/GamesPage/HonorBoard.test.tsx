import { render as rtlRender, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { HonorBoard } from './HonorBoard';

const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

describe('Mural de honra', () => {
  it('quem já foi destaque ganha o troféu e o convite para a próxima', () => {
    render(<HonorBoard matches={12} attendanceRate={0.86} highlights={2} />);
    expect(screen.getByRole('heading', { name: '2× destaque do dia! Bora pela 3ª?' })).toBeInTheDocument();
    const medals = screen.getByLabelText('Seus números');
    expect(within(medals).getByText('2×')).toBeInTheDocument();
    expect(within(medals).getByText('86%')).toBeInTheDocument();
  });

  it('destaque ainda não conquistado aparece como "a conquistar"', () => {
    render(<HonorBoard matches={3} attendanceRate={0.9} highlights={0} />);
    expect(screen.getByRole('heading', { name: '3 jogos na conta! Presença de respeito.' })).toBeInTheDocument();
    expect(screen.getByText('a conquistar')).toBeInTheDocument();
  });
});
