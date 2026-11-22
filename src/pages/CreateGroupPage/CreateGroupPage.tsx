import { SlidersHorizontal } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Chips } from '@/components/Chips';
import { List, ListItem } from '@/components/List';
import { MoneyField } from '@/components/MoneyField';
import { NavBar } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { Sheet } from '@/components/Sheet';
import { Stepper } from '@/components/Stepper';
import { Switch } from '@/components/Switch';
import { TextField, TimeField } from '@/components/TextField';
import { RECOMMENDED_RULES, rulesSummary, useCreateGroup, type GroupRules } from '@/features/groups';
import { useMe, useSports } from '@/features/profile';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from './CreateGroupPage.module.css';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface Day {
  weekday: number;
  start: string;
  end: string;
}

/**
 * Marca e desmarca dias: os que ficam guardam o horário, e um dia novo copia o horário
 * do último escolhido (quase sempre é o mesmo, então é só tocar no dia).
 */
function pickDays(days: Day[], values: string[]): Day[] {
  const last = days.at(-1) ?? { start: '09:00', end: '11:00' };
  return values
    .map(Number)
    .map((weekday) => days.find((d) => d.weekday === weekday) ?? { weekday, start: last.start, end: last.end })
    .sort((a, b) => a.weekday - b.weekday);
}

/**
 * Criar turma (manual 4.2): uma tela só — nome, esporte, quando e onde, valores e as regras
 * recomendadas, que podem ser mudadas depois. Os ajustes avançados ficam atrás de "Ajustar".
 */
export function CreateGroupPage() {
  const navigate = useNavigate();
  const me = useMe();
  const sports = useSports();
  const create = useCreateGroup();
  const [name, setName] = useState('');
  const [sportId, setSportId] = useState('volleyball');
  const [days, setDays] = useState<Day[]>([{ weekday: 6, start: '09:00', end: '11:00' }]);
  const [place, setPlace] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState(12);
  const [dropIn, setDropIn] = useState<number | null>(2500);
  const [monthly, setMonthly] = useState<number | null>(8000);
  const [dueDay, setDueDay] = useState(10);
  const [pixKey, setPixKey] = useState('');
  const [rules, setRules] = useState<GroupRules>(RECOMMENDED_RULES);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = 'Dê um nome com pelo menos 3 letras, ex.: Vôlei de sábado.';
    if (!place.trim()) next.place = 'Onde vocês jogam?';
    if (dropIn === null) next.dropIn = 'Digite o valor (pode ser R$ 0).';
    setErrors(next);
    if (Object.keys(next).length) return;
    create.mutate(
      {
        name: name.trim(),
        sportId,
        location: { name: place.trim(), address: address.trim() || null },
        schedules: days.map((d) => ({ weekday: d.weekday, startTime: d.start, endTime: d.end })),
        defaultCapacity: capacity,
        dropInFeeCents: dropIn ?? 0,
        monthlyFeeCents: monthly ?? 0,
        monthlyFeeDueDay: dueDay,
        ...(pixKey.trim() ? { pix: { key: pixKey.trim(), holderName: me.data?.name ?? name.trim() } } : {}),
        rules,
        timezone: 'America/Sao_Paulo',
      },
      {
        onSuccess: (g) => {
          toast(`${g.name} criada. Agora é só convidar a galera.`, { tone: 'success' });
          navigate('/organizar', { replace: true });
        },
        onError: (err) =>
          toast(isApiError(err) ? messageFor(err.code) : 'Não deu para criar a turma.', { tone: 'error' }),
      },
    );
  };

  return (
    <>
      <NavBar
        leading={{ label: 'Cancelar', onClick: () => navigate(-1) }}
        title="Nova turma"
        actions={
          <button type="submit" form="nova-turma" className={styles.create} disabled={create.isPending}>
            {create.isPending ? 'Criando…' : 'Criar'}
          </button>
        }
      />
      <h1 className="visually-hidden">Nova turma</h1>
      <form id="nova-turma" className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Nome da turma"
          placeholder="Vôlei de sábado"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Chips
          label="Esporte"
          options={(sports.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
          value={sportId}
          onChange={setSportId}
        />

        <Section title="Quando e onde">
          <div className={styles.card}>
            <Chips
              multiple
              label="Dias"
              hint="pode ser mais de um"
              options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
              value={days.map((d) => String(d.weekday))}
              onChange={(values) => setDays(pickDays(days, values))}
            />
            {days.length === 0 && (
              <p className={styles.muted}>Sem dia fixo, a turma fica com dia e horário a combinar.</p>
            )}
            {days.map((d) => (
              <fieldset key={d.weekday} className={styles.day}>
                <legend className={styles.dayName}>{WEEKDAY_NAMES[d.weekday]}</legend>
                <div className={styles.hours}>
                  <TimeField
                    label={`${WEEKDAY_NAMES[d.weekday]}, começa`}
                    hideLabel
                    value={d.start}
                    onChange={(e) => setDays(days.map((x) => (x === d ? { ...x, start: e.target.value } : x)))}
                  />
                  <span className={styles.until} aria-hidden="true">
                    às
                  </span>
                  <TimeField
                    label={`${WEEKDAY_NAMES[d.weekday]}, termina`}
                    hideLabel
                    value={d.end}
                    onChange={(e) => setDays(days.map((x) => (x === d ? { ...x, end: e.target.value } : x)))}
                  />
                </div>
              </fieldset>
            ))}
            <TextField
              label="Local"
              placeholder="Clube Alto da Lapa"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              error={errors.place}
            />
            <TextField
              label="Endereço (opcional)"
              placeholder="Quadra coberta · R. Guaicurus, 1500"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <div className={styles.row}>
              <span className={styles.label}>Vagas por jogo</span>
              <Stepper label="Vagas por jogo" value={capacity} min={2} max={60} onChange={setCapacity} />
            </div>
          </div>
        </Section>

        <Section title="Valores">
          <div className={styles.card}>
            <MoneyField label="Avulso por jogo" value={dropIn} onChange={setDropIn} error={errors.dropIn} />
            <MoneyField
              label="Mensalidade"
              value={monthly}
              onChange={setMonthly}
              hint="Deixe em branco se não houver mensalistas."
            />
            <div className={styles.row}>
              <span className={styles.label}>Vence todo dia</span>
              <Stepper label="Dia do vencimento" value={dueDay} min={1} max={28} onChange={setDueDay} />
            </div>
            <TextField
              label="Chave Pix"
              placeholder="E-mail, celular, CPF ou chave aleatória"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              hint="Para o código Pix já ir com o valor. Dá para adicionar depois."
            />
          </div>
        </Section>

        <Section title="Regras" footnote={rulesSummary(rules)}>
          <List>
            <ListItem
              leading={<SlidersHorizontal size={22} aria-hidden="true" />}
              title="Regras da lista"
              meta={rules === RECOMMENDED_RULES ? 'Padrão recomendado' : 'Ajustadas por você'}
              onClick={() => setRulesOpen(true)}
            />
          </List>
        </Section>
      </form>

      <RulesSheet
        open={rulesOpen}
        rules={rules}
        onClose={() => setRulesOpen(false)}
        onSave={(r) => {
          setRules(r);
          setRulesOpen(false);
        }}
      />
    </>
  );
}

/** "Ajustar": as regras da lista, partindo do padrão recomendado. */
function RulesSheet({
  open,
  rules,
  onClose,
  onSave,
}: {
  open: boolean;
  rules: GroupRules;
  onClose: () => void;
  onSave: (r: GroupRules) => void;
}) {
  const [r, setR] = useState(rules);
  return (
    <Sheet open={open} onClose={onClose} title="Regras da lista" action={{ label: 'OK', onClick: () => onSave(r) }}>
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>A lista abre (dias antes)</span>
          <Stepper
            label="Dias antes para abrir a lista"
            value={r.listOpens.daysBefore}
            min={0}
            max={14}
            onChange={(v) => setR({ ...r, listOpens: { ...r.listOpens, daysBefore: v } })}
          />
        </div>
        <TimeField
          label="Abre às"
          value={r.listOpens.time}
          onChange={(e) => setR({ ...r, listOpens: { ...r.listOpens, time: e.target.value } })}
        />
      </div>
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Mensalista tem prioridade até (dias antes)</span>
          <Stepper
            label="Dias antes do fim da prioridade"
            value={r.monthlyResponseDeadline.daysBefore}
            min={0}
            max={7}
            onChange={(v) => setR({ ...r, monthlyResponseDeadline: { ...r.monthlyResponseDeadline, daysBefore: v } })}
          />
        </div>
        <TimeField
          label="Até às"
          value={r.monthlyResponseDeadline.time}
          onChange={(e) =>
            setR({ ...r, monthlyResponseDeadline: { ...r.monthlyResponseDeadline, time: e.target.value } })
          }
        />
      </div>
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Desistir sem penalidade até (horas antes)</span>
          <Stepper
            label="Horas antes"
            value={r.withdrawalDeadlineHours}
            min={0}
            max={168}
            onChange={(v) => setR({ ...r, withdrawalDeadlineHours: v })}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Avulso paga em até (horas)</span>
          <Stepper
            label="Horas para o avulso pagar"
            value={Math.round(r.dropInPaymentWindowMinutes / 60)}
            min={1}
            max={48}
            onChange={(v) => setR({ ...r, dropInPaymentWindowMinutes: v * 60 })}
          />
        </div>
        <Switch
          label="Trocar quem desiste pelo 1º da fila"
          description="Automático, sem você precisar fazer nada"
          checked={r.waitlistAutoPromote}
          onCheckedChange={(v) => setR({ ...r, waitlistAutoPromote: v })}
        />
      </div>
    </Sheet>
  );
}
