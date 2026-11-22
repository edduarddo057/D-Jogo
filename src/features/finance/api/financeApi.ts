import { http, type Schema } from '@/lib/http';

export type FinanceSummary = Schema<'FinanceSummary'>;
export type LedgerEntry = Schema<'LedgerEntry'>;
export type LedgerCategory = Schema<'LedgerCategory'>;

const g = (groupId: string) => `/groups/${encodeURIComponent(groupId)}/finance`;

export async function getFinanceSummary(groupId: string, month?: string): Promise<FinanceSummary> {
  const { data } = await http.get<FinanceSummary>(`${g(groupId)}/summary`, { params: { month } });
  return data;
}

export async function listLedgerEntries(groupId: string, month?: string): Promise<LedgerEntry[]> {
  const { data } = await http.get<{ items: LedgerEntry[] }>(`${g(groupId)}/entries`, { params: { month, limit: 100 } });
  return data.items;
}

export async function createLedgerEntry(
  groupId: string,
  body: {
    direction: 'in' | 'out';
    amountCents: number;
    description: string;
    occurredOn: string;
    category: LedgerCategory;
  },
): Promise<LedgerEntry> {
  const { data } = await http.post<LedgerEntry>(`${g(groupId)}/entries`, body);
  return data;
}

/** Estorno: cria o lançamento contrário, nada é apagado (RN-70). */
export async function reverseLedgerEntry(groupId: string, entryId: string): Promise<LedgerEntry> {
  const { data } = await http.post<LedgerEntry>(`${g(groupId)}/entries/${encodeURIComponent(entryId)}/reverse`);
  return data;
}

/** Extrato em CSV (abre no Excel). */
export async function exportLedger(groupId: string, month?: string): Promise<string> {
  const { data } = await http.get<string>(`${g(groupId)}/entries/export`, { params: { month }, responseType: 'text' });
  return data;
}
