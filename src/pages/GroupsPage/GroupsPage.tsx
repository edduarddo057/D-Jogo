import { Link as LinkIcon, Plus, QrCode, UserPlus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { Button, FabRound } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { List, ListItem } from '@/components/List';
import { fromState, PageTitle } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { Sheet, useSheetParam } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { useMyGroups } from '@/features/groups';
import { formatScheduleShort } from '@/lib/format';
import { toast } from '@/stores';
import { inviteCodeFrom } from '../shared/invite';
import styles from './GroupsPage.module.css';

/**
 * Turmas (manual 3.6): só a lista, sempre como jogador. "Entrar com convite" e "Criar turma" ficam
 * num + redondo perto do dedão, porque são ações raras.
 */
export function GroupsPage() {
  const groups = useMyGroups();
  const sheet = useSheetParam('nova-turma');

  return (
    <>
      <PageTitle title="Turmas" />
      {groups.isPending ? (
        <SkeletonList rows={3} />
      ) : groups.isError ? (
        <ErrorState onRetry={() => void groups.refetch()} retrying={groups.isFetching} />
      ) : groups.data.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Você ainda não está numa turma"
          description="Entre com o convite que recebeu ou crie a sua turma."
          action={<Button onClick={() => sheet.open()}>Entrar ou criar</Button>}
        />
      ) : (
        <Section footnote="Para entrar em outra turma ou criar uma, toque em +.">
          <List label="Suas turmas">
            {groups.data.map((g) => (
              <ListItem
                key={g.id}
                leading={<Avatar name={g.name} id={g.id} decorative />}
                title={g.name}
                meta={[g.schedules?.length ? formatScheduleShort(g.schedules) : null, g.location?.name]
                  .filter(Boolean)
                  .join(' · ')}
                to={`/turmas/${g.id}`}
                linkState={fromState('/turmas', 'Turmas')}
              />
            ))}
          </List>
        </Section>
      )}
      <FabRound
        label="Entrar com convite ou criar turma"
        icon={<Plus size={28} aria-hidden="true" />}
        onClick={() => sheet.open()}
      />
      <NewGroupSheet open={sheet.isOpen} onClose={() => sheet.close()} />
    </>
  );
}

function NewGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [join, setJoin] = useState(false);
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | undefined>();

  const go = (text: string) => {
    const code = inviteCodeFrom(text);
    if (!code) {
      setError('Cole o link inteiro que você recebeu, ex.: dajogo.app/convite/SABADO25.');
      return;
    }
    navigate(`/convite/${code}`);
  };

  const scan = async (file: File | undefined) => {
    if (!file) return;
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (o: { formats: string[] }) => {
          detect: (i: ImageBitmap) => Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!Detector) {
      toast('Aponte a câmera do celular para o QR code: o convite abre direto.', { tone: 'neutral' });
      return;
    }
    try {
      const [code] = await new Detector({ formats: ['qr_code'] }).detect(await createImageBitmap(file));
      if (code) go(code.rawValue);
      else toast('Não achamos um QR code na foto. Tente de novo.', { tone: 'error' });
    } catch {
      toast('Não deu para ler o QR code. Cole o link.', { tone: 'error' });
    }
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        setJoin(false);
        setError(undefined);
        onClose();
      }}
      title={join ? 'Entrar com convite' : 'Nova turma'}
      hideTitle={!join}
    >
      {!join ? (
        <List>
          <ListItem
            leading={<UserPlus size={22} aria-hidden="true" />}
            title="Entrar com convite"
            meta="Link ou QR code que recebeu"
            onClick={() => setJoin(true)}
          />
          <ListItem
            leading={<UsersRound size={22} aria-hidden="true" />}
            title="Criar uma turma"
            meta="Você vira o organizador"
            onClick={() => navigate('/turmas/nova')}
          />
        </List>
      ) : (
        <form
          className={styles.join}
          onSubmit={(e) => {
            e.preventDefault();
            go(link);
          }}
        >
          <TextField
            label="Link do convite"
            type="url"
            inputMode="url"
            placeholder="dajogo.app/convite/…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            error={error}
          />
          <Button type="submit" block icon={<LinkIcon size={18} aria-hidden="true" />}>
            Ver turma
          </Button>
          <label className={styles.scan}>
            <QrCode size={20} aria-hidden="true" />
            Escanear QR code
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="visually-hidden"
              onChange={(e) => void scan(e.target.files?.[0])}
            />
          </label>
        </form>
      )}
    </Sheet>
  );
}
