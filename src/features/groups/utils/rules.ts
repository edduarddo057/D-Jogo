import type { Schema } from '@/lib/http';

type Rules = Pick<
  Schema<'GroupRules'>,
  'listOpens' | 'monthlyResponseDeadline' | 'withdrawalDeadlineHours' | 'dropInPaymentWindowMinutes'
>;

const hour = (t: string) => {
  const [h, m] = t.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
};
const daysBefore = (n: number) => (n === 0 ? 'no dia' : n === 1 ? '1 dia antes' : `${n} dias antes`);
const duration = (minutes: number) =>
  minutes % 60 === 0
    ? `${minutes / 60}h`
    : minutes > 60
      ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
      : `${minutes} min`;

/** Regras em linguagem simples (manual 3.4 e 3.6), na ordem em que acontecem. */
export function ruleLines(rules: Rules): Array<{ title: string; detail: string }> {
  return [
    { title: 'A lista abre', detail: `${daysBefore(rules.listOpens.daysBefore)}, ${hour(rules.listOpens.time)}` },
    {
      title: 'Mensalista tem a vaga garantida',
      detail: `até ${daysBefore(rules.monthlyResponseDeadline.daysBefore)}, ${hour(rules.monthlyResponseDeadline.time)}`,
    },
    { title: 'Desistir sem penalidade', detail: `até ${rules.withdrawalDeadlineHours}h antes` },
    {
      title: `Avulso paga em até ${duration(rules.dropInPaymentWindowMinutes)}`,
      detail: 'contando de quando pega a vaga. Sem pagar, a vaga passa para o próximo da fila.',
    },
  ];
}

/** Resumo de uma linha (rodapé de Criar turma). */
export function rulesSummary(rules: Rules) {
  return `Lista abre ${daysBefore(rules.listOpens.daysBefore)} · mensalistas têm prioridade até ${daysBefore(rules.monthlyResponseDeadline.daysBefore)}, ${hour(rules.monthlyResponseDeadline.time)} · desistir sem penalidade até ${rules.withdrawalDeadlineHours}h antes · avulso paga em até ${duration(rules.dropInPaymentWindowMinutes)}. Dá para mudar depois.`;
}

/** Regras recomendadas para turma nova: os valores atuais do sistema mais os novos do manual. */
export const RECOMMENDED_RULES: Schema<'GroupRules'> = {
  waitlistAutoPromote: true,
  dropInPaymentWindowMinutes: 120,
  monthlyResponseDeadline: { daysBefore: 1, time: '18:00' },
  autoReleaseUnanswered: false,
  listOpens: { daysBefore: 3, time: '09:00' },
  withdrawalDeadlineHours: 24,
};
