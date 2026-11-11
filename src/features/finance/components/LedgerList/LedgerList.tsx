import { ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/Button';
import { List, ListItem } from '@/components/List';
import { formatCents } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import type { LedgerEntry } from '../../api/financeApi';
import { useDeleteLedgerEntry } from '../../queries/useFinance';
import styles from './LedgerList.module.css';

const day = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Movimentações: entradas e saídas, com sinal e ícone (nunca só cor). Só lançamentos manuais saem (RN-70). */
export function LedgerList({ groupId, entries }: { groupId: string; entries: LedgerEntry[] }) {
  const remove = useDeleteLedgerEntry(groupId);
  return (
    <List label="Movimentações">
      {entries.map((e) => {
        const inflow = e.direction === 'in';
        return (
          <ListItem
            key={e.id}
            leading={
              <span className={`${styles.icon} ${inflow ? styles.in : styles.out}`}>
                {inflow ? (
                  <ArrowDownLeft size={20} aria-hidden="true" />
                ) : (
                  <ArrowUpRight size={20} aria-hidden="true" />
                )}
              </span>
            }
            title={e.description}
            meta={`${day(e.occurredOn)} · ${e.source === 'payment' ? 'Pagamento' : 'Lançamento manual'}`}
            trailing={
              <span className={inflow ? styles.amountIn : styles.amountOut}>
                <span className="visually-hidden">{inflow ? 'Entrada de ' : 'Saída de '}</span>
                {inflow ? '+' : '−'} {formatCents(e.amountCents)}
              </span>
            }
            actions={
              e.source === 'manual' ? (
                <IconButton
                  label={`Excluir lançamento ${e.description}`}
                  icon={<Trash2 size={20} aria-hidden="true" />}
                  disabled={remove.isPending && remove.variables === e.id}
                  onClick={() =>
                    remove.mutate(e.id, {
                      onSuccess: () => toast('Lançamento excluído.', { tone: 'success' }),
                      onError: (err) =>
                        toast(isApiError(err) ? messageFor(err.code) : 'Não deu para excluir.', { tone: 'error' }),
                    })
                  }
                />
              ) : undefined
            }
          />
        );
      })}
    </List>
  );
}
