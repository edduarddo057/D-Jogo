import { SelectField } from '@/components/SelectField';
import { Switch } from '@/components/Switch';
import { TimeField } from '@/components/TextField';
import { toast } from '@/stores';
import type { GroupRules, GroupRulesPatch } from '../../api/membersApi';
import { useUpdateRules } from '../../queries/useMembers';
import styles from './RulesForm.module.css';

const PAYMENT_WINDOWS = [
  { value: '30', label: '30 minutos' },
  { value: '60', label: '1 hora' },
  { value: '120', label: '2 horas' },
  { value: '360', label: '6 horas' },
  { value: '720', label: '12 horas' },
  { value: '1440', label: '24 horas' },
];

const DAYS_BEFORE = [
  { value: '0', label: 'No dia do jogo' },
  { value: '1', label: '1 dia antes' },
  { value: '2', label: '2 dias antes' },
  { value: '3', label: '3 dias antes' },
];

/**
 * Regras da turma (RN-30, RN-40, RN-44, RN-45). Cada mudança salva na hora (otimista, com rollback).
 * Os padrões de sorteio ficam numa seção própria (Sprint 4).
 */
export function RulesForm({ groupId, rules }: { groupId: string; rules: GroupRules }) {
  const update = useUpdateRules(groupId);

  const save = (patch: GroupRulesPatch) =>
    update.mutate(patch, {
      onSuccess: () => toast('Regra salva.', { tone: 'success', duration: 2000 }),
    });

  const windowOptions = PAYMENT_WINDOWS.some((o) => o.value === String(rules.dropInPaymentWindowMinutes))
    ? PAYMENT_WINDOWS
    : [
        ...PAYMENT_WINDOWS,
        { value: String(rules.dropInPaymentWindowMinutes), label: `${rules.dropInPaymentWindowMinutes} minutos` },
      ];

  return (
    <div className={styles.rules}>
      <section className={styles.section} aria-labelledby="regras-fila">
        <h2 id="regras-fila" className={styles.title}>
          Lista de espera
        </h2>
        <Switch
          label="Subir da fila automaticamente"
          description={
            rules.waitlistAutoPromote
              ? 'Quando abre uma vaga, o primeiro da fila entra sozinho e é avisado.'
              : 'Quando abre uma vaga, você escolhe quem da fila entra.'
          }
          checked={rules.waitlistAutoPromote}
          onCheckedChange={(v) => save({ waitlistAutoPromote: v })}
        />
      </section>

      <section className={styles.section} aria-labelledby="regras-avulso">
        <h2 id="regras-avulso" className={styles.title}>
          Avulsos
        </h2>
        <SelectField
          label="Prazo para pagar a vaga"
          hint="Se o avulso não informar o Pix nesse tempo, a vaga volta a ficar livre."
          options={windowOptions}
          value={String(rules.dropInPaymentWindowMinutes)}
          onChange={(e) => save({ dropInPaymentWindowMinutes: Number(e.target.value) })}
        />
      </section>

      <section className={styles.section} aria-labelledby="regras-mensal">
        <h2 id="regras-mensal" className={styles.title}>
          Mensalistas
        </h2>
        <div className={styles.row}>
          <SelectField
            label="Responder até"
            options={DAYS_BEFORE}
            value={String(rules.monthlyResponseDeadline.daysBefore)}
            onChange={(e) =>
              save({
                monthlyResponseDeadline: { ...rules.monthlyResponseDeadline, daysBefore: Number(e.target.value) },
              })
            }
          />
          <TimeField
            label="Às"
            defaultValue={rules.monthlyResponseDeadline.time}
            key={rules.monthlyResponseDeadline.time}
            onBlur={(e) => {
              const time = e.target.value;
              if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time) && time !== rules.monthlyResponseDeadline.time) {
                save({ monthlyResponseDeadline: { ...rules.monthlyResponseDeadline, time } });
              }
            }}
          />
        </div>
        <Switch
          label="Liberar a vaga de quem não responder"
          description={
            rules.autoReleaseUnanswered
              ? 'Passou o prazo sem resposta, a vaga do mensalista fica livre para avulsos e para a fila.'
              : 'Passou o prazo sem resposta, a vaga continua guardada até você decidir.'
          }
          checked={rules.autoReleaseUnanswered}
          onCheckedChange={(v) => save({ autoReleaseUnanswered: v })}
        />
      </section>
    </div>
  );
}
