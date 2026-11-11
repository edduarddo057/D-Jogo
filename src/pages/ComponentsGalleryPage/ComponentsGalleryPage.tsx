import { Check, Plus, UsersRound, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Avatar, AvatarStack } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button, ButtonLink, Fab, IconButton } from '@/components/Button';
import { Card, HeroCard } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { DateTile, List, ListItem } from '@/components/List';
import { Modal } from '@/components/Modal';
import { MoneyField } from '@/components/MoneyField';
import { OtpInput } from '@/components/OtpInput';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SelectField } from '@/components/SelectField';
import { SkeletonList } from '@/components/Skeleton';
import { Switch } from '@/components/Switch';
import { DateField, TextField, TimeField } from '@/components/TextField';
import { ThemeSelector } from '@/features/profile';
import { toast } from '@/stores';
import styles from './ComponentsGalleryPage.module.css';

const PEOPLE = ['Lucas Almeida', 'Mariana Costa', 'Rafael Lima', 'Beatriz Souza', 'Diego Ferreira'].map((name, i) => ({
  id: `u${i}`,
  name,
}));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

/** Galeria do design system em código (só em desenvolvimento/homologação). */
export function ComponentsGalleryPage() {
  const [money, setMoney] = useState<number | null>(2500);
  const [otp, setOtp] = useState('482');
  const [auto, setAuto] = useState(true);
  const [release, setRelease] = useState(false);
  const [tab, setTab] = useState<'lista' | 'pendentes' | 'espera'>('lista');
  const [modal, setModal] = useState(false);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Componentes"
        subtitle="Design system Dá Jogo em código"
        back={{ to: '/', label: 'Voltar para o Início' }}
      />
      <ThemeSelector />

      <Section title="Botões">
        <Button block>Entrar</Button>
        <div className={styles.grid2}>
          <Button icon={<Check size={18} strokeWidth={3} aria-hidden="true" />}>Vou jogar</Button>
          <Button variant="danger" icon={<X size={18} strokeWidth={3} aria-hidden="true" />}>
            Não vou
          </Button>
        </div>
        <Button variant="inverse" block>
          Gerenciar presenças
        </Button>
        <div className={styles.row}>
          <Button variant="outline">Cancelar</Button>
          <Button variant="ghost">Ver todas</Button>
          <Button loading>Salvando</Button>
          <Button disabled>Lista fechada</Button>
          <Button size="sm">Validar</Button>
          <IconButton label="Fechar" icon={<X size={20} aria-hidden="true" />} />
          <ButtonLink to="/" variant="outline">
            Link como botão
          </ButtonLink>
        </div>
        <Fab
          icon={<Plus size={20} strokeWidth={3} aria-hidden="true" />}
          onClick={() => toast('Jogador adicionado', { tone: 'success' })}
        >
          Jogador
        </Fab>
      </Section>

      <Section title="Campos">
        <TextField
          label="Celular"
          type="tel"
          inputMode="tel"
          defaultValue="(21) 99876-5432"
          hint="Vamos enviar um código por WhatsApp."
        />
        <TextField label="Nickname" defaultValue="lucas" error="Esse nickname já está em uso." />
        <MoneyField label="Valor do avulso" value={money} onChange={setMoney} />
        <div className={styles.grid2}>
          <DateField label="Data" defaultValue="2026-11-18" />
          <TimeField label="Início" defaultValue="20:00" />
        </div>
        <SelectField
          label="Posição principal"
          defaultValue="outside"
          options={[
            { value: 'setter', label: 'Levantador(a)' },
            { value: 'outside', label: 'Ponteiro(a)' },
            { value: 'libero', label: 'Líbero' },
          ]}
        />
        <OtpInput value={otp} onChange={setOtp} />
        <Card padding="md">
          <Switch
            label="Subir automaticamente"
            description="Quando uma vaga abre, o 1º da fila entra sem você aprovar."
            checked={auto}
            onCheckedChange={setAuto}
          />
          <Switch
            label="Liberar vaga sem resposta"
            description="No fim do prazo, a vaga vai para a fila."
            checked={release}
            onCheckedChange={setRelease}
          />
        </Card>
      </Section>

      <Section title="Status e identidade">
        <div className={styles.row}>
          <Badge tone="success">Confirmado</Badge>
          <Badge tone="warning" dot>
            Pendente
          </Badge>
          <Badge tone="info">Na espera · 2º</Badge>
          <Badge tone="danger">Recusou</Badge>
          <Badge>Lista fechada</Badge>
        </div>
        <Card>
          <ProgressBar value={13} max={16} label="13 de 16 confirmados" detail="3 vagas" />
        </Card>
        <div className={styles.row}>
          {PEOPLE.slice(0, 4).map((p, i) => (
            <Avatar key={p.id} id={p.id} name={p.name} size={i === 3 ? 'lg' : 'md'} />
          ))}
          <AvatarStack people={PEOPLE} total={13} />
        </div>
      </Section>

      <Section title="Cards e listas">
        <HeroCard eyebrow="Próxima partida" title="Partida de quarta" meta="Vôlei — Laranjeiras · Qua, 18 nov · 20:00">
          <span>
            <Badge tone="warning" dot>
              Responda até ter, 18:00
            </Badge>
          </span>
          <div className={styles.grid2}>
            <Button icon={<Check size={18} strokeWidth={3} aria-hidden="true" />}>Vou jogar</Button>
            <Button variant="onBrand">Não vou</Button>
          </div>
        </HeroCard>
        <SegmentedControl
          label="Presenças"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'lista', label: 'Lista (13)' },
            { value: 'pendentes', label: 'Sem resposta (2)' },
            { value: 'espera', label: 'Espera (3)' },
          ]}
        />
        <List label="Exemplo de lista">
          <ListItem
            to="/"
            leading={<DateTile day="18" tone={2} />}
            title="Partida de quarta"
            meta="Vôlei — Laranjeiras · Qua, 18 nov · 20:00"
            trailing={<Badge tone="warning">Pendente</Badge>}
          />
          <ListItem
            leading={<Avatar id="u0" name="Lucas Almeida" decorative />}
            title="Lucas Almeida"
            meta="Mensalista · Ponteiro"
            trailing={<Badge tone="success">Confirmado</Badge>}
          />
          <ListItem
            onClick={() => toast('Carla subiu para a lista')}
            leading={<Avatar id="u9" name="Carla Dias" decorative />}
            title="1º · Carla Dias"
            meta="Avulsa · entrou às 18:02"
          />
        </List>
      </Section>

      <Section title="Estados de tela">
        <SkeletonList rows={2} label="Carregando exemplo…" />
        <EmptyState
          icon={UsersRound}
          title="Nenhuma turma ainda"
          description="Crie sua turma ou peça o link de convite a quem organiza."
          action={<Button>Criar turma</Button>}
        />
        <ErrorState onRetry={() => toast('Tentando de novo…')} />
      </Section>

      <Section title="Sobreposições">
        <div className={styles.row}>
          <Button variant="inverse" onClick={() => setModal(true)}>
            Abrir modal
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast('Vaga liberada para a lista de espera', { action: { label: 'Desfazer', onAction: () => {} } })
            }
          >
            Mostrar toast
          </Button>
        </div>
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title="Convidar avulso"
          description="O jogador recebe um link para esta partida e paga R$ 25,00 para garantir a vaga."
          actions={
            <>
              <Button variant="outline" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setModal(false)}>Convidar</Button>
            </>
          }
        >
          <TextField label="Nome ou nickname" defaultValue="Bruno Martins" />
        </Modal>
      </Section>
    </div>
  );
}
