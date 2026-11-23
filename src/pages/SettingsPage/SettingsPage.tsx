import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { List, ListItem } from '@/components/List';
import { NavBar } from '@/components/NavBar';
import { OtpInput } from '@/components/OtpInput';
import { Section } from '@/components/Section';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SelectField } from '@/components/SelectField';
import { Sheet, useSheetParam } from '@/components/Sheet';
import { Switch } from '@/components/Switch';
import { TextField } from '@/components/TextField';
import { signOut } from '@/features/auth';
import { useArchiveGroup, useMembers, useOrganizes, useTransferGroup, type GroupSummary } from '@/features/groups';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  type NotificationSettings,
} from '@/features/notifications';
import {
  useConfirmPhoneChange,
  useDeleteAccount,
  useExportMyData,
  useMe,
  useRequestPhoneChange,
} from '@/features/profile';
import { formatE164Brazil, maskBrazilianPhone, toE164Brazil } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { exitDemoToApp, isDemoActive } from '@/lib/demo';
import { toast, useThemeStore, type ThemePreference } from '@/stores';
import styles from './SettingsPage.module.css';
import { PHONE_LOGIN } from '@/lib/config';

const SWITCHES: Array<{ key: keyof NotificationSettings; title: string; detail: string }> = [
  { key: 'lists', title: 'Lista aberta e lembretes', detail: 'Quando abrir um jogo e se você não respondeu' },
  { key: 'payments', title: 'Pagamentos', detail: 'Prazo acabando, aprovado ou recusado' },
  { key: 'waitlist', title: 'Fila e mudanças no jogo', detail: 'Você subiu da fila, jogo alterado ou cancelado' },
  { key: 'organizer', title: 'Para o organizador', detail: 'Novo pagamento para conferir' },
  { key: 'day_summary', title: 'Resumo do dia', detail: 'Quando o resumo do jogo ficar pronto' },
];

const acceptedOn = (iso: string | null | undefined) =>
  iso
    ? `Aceitos em ${new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '').replace(/ de /g, ' ')}`
    : 'Leia quando quiser';

/**
 * Ajustes num lugar só (manual 3.7): tema, avisos em 5 interruptores, trocar número, termos,
 * baixar meus dados, sair e excluir conta — quem é dono de turma passa a turma ou encerra antes.
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const theme = useThemeStore((s) => s.preference);
  const setTheme = useThemeStore((s) => s.setPreference);
  const settings = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const exportData = useExportMyData();
  const { owned } = useOrganizes();
  const phoneSheet = useSheetParam('trocar-numero');
  const deleteSheet = useSheetParam('excluir-conta');

  return (
    <>
      <NavBar back={{ to: '/voce', label: 'Perfil' }} title="Ajustes" />
      <h1 className="visually-hidden">Ajustes</h1>

      <Section title="Aparência">
        <SegmentedControl<ThemePreference>
          label="Tema"
          options={[
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Escuro' },
            { value: 'system', label: 'Automático' },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </Section>

      <Section title="Avisos" footnote="Nada entre 22h e 8h. Avisos repetidos chegam juntos.">
        <Card padding="md" className={styles.switches}>
          {SWITCHES.map((s) => (
            <Switch
              key={s.key}
              label={s.title}
              description={s.detail}
              checked={settings.data?.[s.key] ?? false}
              disabled={!settings.data}
              onCheckedChange={(checked) => updateSettings.mutate({ [s.key]: checked })}
            />
          ))}
        </Card>
      </Section>

      <Section title="Conta">
        <List>
          {/* sem login pelo celular, o número de contato muda no perfil */}
          {PHONE_LOGIN && (
            <ListItem
              title="Trocar número"
              meta={me.data?.phone ? formatE164Brazil(me.data.phone) : undefined}
              onClick={() => phoneSheet.open()}
            />
          )}
          <ListItem title="Termos e privacidade" meta={acceptedOn(me.data?.termsAcceptedAt)} to="/termos" />
          <ListItem
            title="Baixar meus dados"
            meta="Cópia de perfil, jogos e pagamentos"
            onClick={() =>
              exportData.mutate(undefined, {
                onSuccess: () => toast('Arquivo baixado.', { tone: 'success' }),
                onError: () => toast('Não deu para gerar o arquivo. Tente de novo.', { tone: 'error' }),
              })
            }
          />
          <ListItem
            tone="accent"
            title="Sair"
            onClick={() => {
              // na demonstração, "Sair" volta ao app oficial (a demo fica salva)
              if (isDemoActive()) {
                exitDemoToApp();
                return;
              }
              void signOut(queryClient).then(() => navigate('/entrar', { replace: true }));
            }}
          />
        </List>
      </Section>

      <Section
        footnote={
          owned.length > 0
            ? `Você organiza a ${owned.map((g) => g.name).join(' e a ')}. Antes de excluir, passe a turma para outra pessoa ou encerre-a.`
            : undefined
        }
      >
        <List>
          <ListItem tone="danger" title="Excluir conta" onClick={() => deleteSheet.open()} />
        </List>
      </Section>

      <PhoneSheet open={phoneSheet.isOpen} onClose={() => phoneSheet.close()} />
      <DeleteSheet open={deleteSheet.isOpen} onClose={() => deleteSheet.close()} owned={owned} />
    </>
  );
}

/** Trocar número: celular novo → código → pronto. */
function PhoneSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const request = useRequestPhoneChange();
  const confirm = useConfirmPhoneChange();
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();

  const close = () => {
    setPhone('');
    setChallengeId(null);
    setCode('');
    setError(undefined);
    onClose();
  };
  const send = () => {
    const e164 = toE164Brazil(phone);
    if (!e164) return setError('Digite o celular com DDD.');
    setError(undefined);
    request.mutate(
      { phone: e164 },
      {
        onSuccess: (c) => setChallengeId(c.challengeId),
        onError: (e) => setError(isApiError(e) ? messageFor(e.code) : 'Não deu para enviar o código.'),
      },
    );
  };
  const verify = (value: string) => {
    if (!challengeId || value.length !== 6) return;
    confirm.mutate(
      { challengeId, code: value },
      {
        onSuccess: () => {
          toast('Número trocado.', { tone: 'success' });
          close();
        },
        onError: (e) => {
          setCode('');
          setError(isApiError(e) ? messageFor(e.code) : 'Código incorreto.');
        },
      },
    );
  };

  return (
    <Sheet open={open} onClose={close} title="Trocar número">
      {!challengeId ? (
        <>
          <TextField
            label="Celular novo"
            type="tel"
            inputMode="tel"
            prefix="+55"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(maskBrazilianPhone(e.target.value))}
            hint="Enviamos um código de 6 números pelo WhatsApp."
            error={error}
          />
          <Button block loading={request.isPending} onClick={send}>
            Enviar código
          </Button>
        </>
      ) : (
        <>
          <p>Digite o código enviado para {phone}.</p>
          <OtpInput
            label="Código de 6 números"
            value={code}
            onChange={setCode}
            onComplete={verify}
            error={error}
            disabled={confirm.isPending}
            focusOnMount
          />
          <Button block loading={confirm.isPending} disabled={code.length !== 6} onClick={() => verify(code)}>
            Confirmar
          </Button>
        </>
      )}
    </Sheet>
  );
}

/** Excluir conta: se for dona de turma, antes passa a turma ou encerra (manual 3.7). */
function DeleteSheet({ open, onClose, owned }: { open: boolean; onClose: () => void; owned: GroupSummary[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const remove = useDeleteAccount();
  return (
    <Sheet open={open} onClose={onClose} title="Excluir conta">
      {owned.length > 0 ? (
        <>
          <p>Antes de excluir, resolva as turmas que você organiza:</p>
          {owned.map((g) => (
            <OwnedGroup key={g.id} group={g} />
          ))}
        </>
      ) : (
        <>
          <p>Seu perfil, suas respostas e seus pagamentos deixam de aparecer. Isso não dá para desfazer.</p>
          <Button
            variant="danger"
            block
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => {
                  void signOut(queryClient).finally(() => navigate('/entrar', { replace: true }));
                },
                onError: (e) => toast(isApiError(e) ? messageFor(e.code) : 'Não deu para excluir.', { tone: 'error' }),
              })
            }
          >
            Excluir minha conta
          </Button>
        </>
      )}
    </Sheet>
  );
}

function OwnedGroup({ group }: { group: GroupSummary }) {
  const members = useMembers(group.id);
  const transfer = useTransferGroup(group.id);
  const archive = useArchiveGroup(group.id);
  const [to, setTo] = useState('');
  const others = (members.data ?? []).filter((m) => m.role !== 'owner');
  return (
    <Card padding="md" className={styles.owned}>
      <b>{group.name}</b>
      <SelectField
        label="Passar a turma para"
        placeholder="Escolha um membro"
        options={others.map((m) => ({ value: m.id, label: m.user.name }))}
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <div className={styles.pair}>
        <Button
          variant="secondary"
          loading={archive.isPending}
          onClick={() => archive.mutate(undefined, { onSuccess: () => toast(`${group.name} encerrada.`) })}
        >
          Encerrar turma
        </Button>
        <Button
          disabled={!to}
          loading={transfer.isPending}
          onClick={() => transfer.mutate(to, { onSuccess: () => toast('Turma passada.', { tone: 'success' }) })}
        >
          Passar turma
        </Button>
      </div>
    </Card>
  );
}
