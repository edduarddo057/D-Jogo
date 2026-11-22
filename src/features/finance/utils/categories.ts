import type { LedgerCategory } from '../api/financeApi';

export const CATEGORY_LABEL: Record<LedgerCategory, string> = {
  fee: 'Mensalidade',
  rent: 'Aluguel',
  equipment: 'Material',
  ball: 'Bola',
  bibs: 'Coletes',
  party: 'Festa',
  other: 'Outro',
};

/** Categorias do novo lançamento (manual 4.2 › Caixa). */
export const MANUAL_CATEGORIES: LedgerCategory[] = ['rent', 'equipment', 'ball', 'bibs', 'party', 'other'];
