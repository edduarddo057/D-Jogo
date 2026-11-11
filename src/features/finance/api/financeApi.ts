import { http, type Schema } from '@/lib/http';

export type FinanceSummary = Schema<'FinanceSummary'>;
export type LedgerEntry = Schema<'LedgerEntry'>;

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
  body: { direction: 'in' | 'out'; amountCents: number; description: string; occurredOn: string },
): Promise<LedgerEntry> {
  const { data } = await http.post<LedgerEntry>(`${g(groupId)}/entries`, body);
  return data;
}

export async function deleteLedgerEntry(groupId: string, entryId: string): Promise<void> {
  await http.delete(`${g(groupId)}/entries/${encodeURIComponent(entryId)}`);
}
